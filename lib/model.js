'use strict';
const Promise = require('bluebird'),
      EventEmitter = require('events'),
      Document = require('./document'),
      Errors = require('./errors'),
      Query = require('./query'),
      util = require('./util'),
      schemaUtil = require('./schema');

class Model extends EventEmitter {

  /*
  * Constructor for a Model. Note that this is not what `thinky.createModel`
  * returns. It is the prototype of what `thinky.createModel` returns.
  * The whole chain being:
  * document.__proto__ = new Document(...)
  * document.__proto__.constructor = model (returned by thinky.createModel
  * document.__proto__._model = instance of Model
  * document.__proto__.constructor.__proto__ = document.__proto__._model
  */
  constructor(name, schema, options, thinky) {
    super();

    /**
     * Name of the table used
     * @type {string}
     */
    this._name = name;

    // We want a deep copy
    options = options || {};
    this._options = {};
    this._options.enforce_missing =
      (!!options.enforce_missing != null) ? options.enforce_missing : thinky._options.enforce_missing; // eslint-disable-line
    this._options.enforce_extra =
      (!!options.enforce_extra != null) ? options.enforce_extra : thinky._options.enforce_extra; // eslint-disable-line
    this._options.enforce_type =
      (options.enforce_type != null) ? options.enforce_type : thinky._options.enforce_type; // eslint-disable-line
    this._options.timeFormat =
      (options.timeFormat != null) ? options.timeFormat : thinky._options.timeFormat; // eslint-disable-line
    this._options.validate =
      (options.validate != null) ? options.validate : thinky._options.validate; // eslint-disable-line

    this._schema = schemaUtil.parse(schema, '', this._options, this);
    //console.log(JSON.stringify(this._schema, null, 2));

    this.virtualFields = [];
    this.defaultFields = [];
    this._schema._getDefaultFields([], this.defaultFields, this.virtualFields);

    this.needToGenerateFields = (this.defaultFields.length + this.virtualFields.length) !== 0;

    this._pk = (options.pk != null) ? options.pk : 'id'; // eslint-disable-line

    this._table = (options.table != null) ? options.table : {}; // eslint-disable-line
    this._table.primaryKey = this._pk;

    this._thinky = thinky;

    this._validator = options.validator;

    this._indexes = {}; // indexName -> true
    this._pendingPromises = [];

    this._error = null; // If an error occured, we won't let people save things

    this._listeners = {};
    this._maxListeners = 10;
    this._joins = {};
    this._localKeys = {}; // key used as a foreign key by another model

    // This is to track joins that were not directly called by this model but that we still need
    // to purge the database
    this._reverseJoins = {};

    this._methods = {};
    this._staticMethods = {};
    this._async = {
      init: false,
      retrieve: false,
      save: false,
      validate: false
    };

    this._pre = {
      save: [],
      delete: [],
      validate: []
    };
    this._post = {
      init: [],
      retrieve: [],
      save: [],
      delete: [],
      validate: []
    };
  }

  static new(name, schema, options, thinky) {
    let proto = new Model(name, schema, options, thinky);
    proto._initModel = options.init  !== undefined ? !!options.init : true;

    let model = function model(doc, _options) {
      if (!util.isPlainObject(doc)) {
        throw new Errors.ThinkyError('Cannot build a new instance of `' + proto._name + '` without an object');
      }
      // We create a deepcopy only if doc was already used to create a document
      if (doc instanceof Document) {
        doc = util.deepCopy(doc);
      }

      util.changeProto(doc, new Document(model, _options));

      // Create joins document. We do it here because `_options` are easily available
      util.loopKeys(proto._joins, (joins, key) => {
        if (doc[key] != null) { // eslint-disable-line
          if ((joins[key].type === 'hasOne') && (doc[key] instanceof Document === false)) {
            doc[key] = new joins[key].model(doc[key], _options); // eslint-disable-line
          } else if ((joins[key].type === 'belongsTo') && (doc[key] instanceof Document === false)) {
            doc[key] = new joins[key].model(doc[key], _options); // eslint-disable-line
          } else if (joins[key].type === 'hasMany') {
            doc.__proto__._hasMany[key] = []; // eslint-disable-line

            for (let i = 0, ii = doc[key].length; i < ii; ++i) {
              if (doc[key][i] instanceof Document === false) {
                doc[key][i] = new joins[key].model(doc[key][i], _options); // eslint-disable-line
              }
            }
          } else if (joins[key].type === 'hasAndBelongsToMany') {
            for (let i = 0, ii = doc[key].length; i < ii; ++i) {
              if (doc[key][i] instanceof Document === false) {
                doc[key][i] = new joins[key].model(doc[key][i], _options); // eslint-disable-line
              }
            }
          }
        }
      });

      doc._getModel()._schema._setModel(doc._getModel());
      if (proto.needToGenerateFields === true) {
        doc._generateDefault();
      }

      let promises = [];
      let promise;
      if (proto._options.validate === 'oncreate') {
        promise = doc.validate(_options);
        if (promise instanceof Promise) promises.push(promise);
      }

      if (proto._post.init.length > 0) {
        promise = util.hook({
          postHooks: doc._getModel()._post.init,
          doc: doc,
          async: doc._getModel()._async.init,
          fn: function() {
            return doc;
          }
        });
        if (promise instanceof Promise) promises.push(promise);
      }

      if (promises.length > 0) {
        return Promise.all(promises).then(docs => docs[0]);
      }
      return doc;
    };

    model.__proto__ = proto; // eslint-disable-line

    if (options.init !== false) {
      // Setup the model's table.
      model.tableReady().then();
    } else {
      // We do not initialize the table and suppose that it already exists and
      // is ready.
      model.emit('created');
      model.emit('ready');
    }

    // So people can directly call the EventEmitter from the constructor
    // TOIMPROVE: We should emit everything from the constructor instead of emitting things from
    // the constructor and the instance of Model
    util.loopKeys(EventEmitter.prototype, (emitter, key) => {
      model[key] = function() {
        model._getModel()[key].apply(model._getModel(), arguments);
      };
    });

    return model;
  }

  /**
   * Create the model's table.
   * @return {Promise=} Returns a promise which will resolve when the table is ready.
   */
  tableReady() {
    let model = this._getModel();
    if (!this._initModel) return Promise.resolve();
    if (this._tableReadyPromise) return this._tableReadyPromise;

    // Create the table, or push the table name in the queue.
    let r = model._thinky.r;
    this._tableReadyPromise = model._thinky.dbReady()
      .then(() => r.tableCreate(model._name, model._table).run())
      .error(error => {
        if (error.message.match(/Table `.*` already exists/)) {
          return;
        }

        model._error = error;
        // Should we throw here?
      });

    return this._tableReadyPromise
      .then(() => {
        this.emit('created');
        if (!this._pendingPromises.length) {
          this.emit('ready');
        }
      });
  }

  /**
   * Get a promise which resolves when the Model's table and
   * all indices have been created.
   */
  ready() {
    let requirements = [];

    // Ensure the Model's table is ready
    requirements.push(this.tableReady());

    // Ensure all other pending promises have been resolved
    requirements.push(this._promisesReady());

    return Promise.all(requirements);
  }

  _promisesReady() {
    let self = this;
    if (this._promisesReadyPromise) return this._promisesReadyPromise;

    let verifyAll = function() {
      return Promise.all(self._pendingPromises)
        .then(() => {
          let allFullfilled = true;
          for (let i = 0, ii = self._pendingPromises.length; i < ii; ++i) {
            if (!self._pendingPromises[i].isFulfilled()) {
              allFullfilled = false;
              break;
            }
          }
          return allFullfilled ? Promise.resolve() : verifyAll();
        });
    };

    this._promisesReadyPromise = verifyAll();
    return this._promisesReadyPromise;
  }

  _waitFor(promise) {
    let self = this;
    this._pendingPromises.push(promise);

    // Emit 'ready' when all pending promises have resolved
    if (!this._pendingReady) {
      this._pendingReady = this._promisesReady()
        .then(() => {
          delete self._pendingReady;
          self.emit('ready', self);
        });
    }
  }

  _setError(error) {
    this._getModel()._error = error;
    this.emit('error', error);
  }

  /*
  * Return the options of the model -- call from an instance of Model
  */
  getOptions() {
    return this._options;
  }

  /*
  * Return the instance of Model **when called on the function**
  */
  _getModel() {
    return this.__proto__; // eslint-disable-line
  }

  /*
  * Return the instance of Model
  */
  getTableName() {
    return this._getModel()._name;
  }

  ensureIndex(name, fn, opts) {
    if ((opts === undefined) && (util.isPlainObject(fn))) {
      opts = fn;
      fn = undefined;
    }

    return this._createIndex(name, fn, opts)
      .catch(error => {
        this._getModel()._setError(error);
        throw error;
      });
  }

  _createIndex(name, fn, opts) {
    let model = this._getModel();
    let tableName = this.getTableName();
    let r = model._thinky.r;

    if (opts === undefined && util.isPlainObject(fn)) {
      opts = fn;
      fn = undefined;
    }

    let promise = this.tableReady()
      .then(() => {
        return new Promise((resolve, reject) => {
          return r.branch(
            r.table(tableName).indexList().contains(name),
            r.table(tableName).indexWait(name),
            r.branch(
              r.table(tableName).info()('primary_key').eq(name),
              r.table(tableName).indexWait(name),
              r.table(tableName).indexCreate(name, fn, opts)
              .do(() => r.table(tableName).indexWait(name))
            )
          )
          .run()
          .then(resolve)
          .error(error => {
            if (error.message.match(/^Index/)) {
              // TODO: This regex seems a bit too generous since messages such
              // as "Index `id` was not found on table..." will be accepted.
              // Figure out if this is OK or not.
              return resolve();
            }
            reject(error);
          });
        });
      })
      .then(() => {
        model._indexes[name] = true;
      });

    this._waitFor(promise);
    return promise;
  }

  /*
  * joinedModel: the joined model
  * fieldDoc: the field where the joined document will be kept
  * leftKey: the key in the model used for the join
  * rightKey: the key in the joined model used for the join
  *
  * The foreign key is stores in the joinedModel
  *
  * Post.hasOne(Author, "author", "id", "postId"
  *                ^- post.id
  *
  * options can be:
  * - init: Boolean (create an index or not)
  * - timeFormat: 'raw'/'native'
  * - enforce_extra: 'strict'/'remove'/'none'
  * - enforce_missing: Boolean
  * - enforce_type: 'strict'/'loose'/'none'
  * - validate: 'oncreate'/'onsave'
  */
  hasOne(joinedModel, fieldDoc, leftKey, rightKey, options) {
    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkyError('First argument of `hasOne` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkyError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkyError('The field `_apply` is reserved by thinky. Please use another one.');
    }

    this._getModel()._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasOne'
    };
    joinedModel._getModel()._localKeys[rightKey] = true;

    options = options || {};
    if (options.init === false) return;

    let newIndex = joinedModel._createIndex(rightKey)
      .catch(error => {
        joinedModel._getModel()._setError(error);
        this._getModel()._setError(error);
      });

    this._waitFor(newIndex);
  }

  /*
  * joinedModel: the joined model
  * fieldDoc: the field where the joined document will be kept
  * leftKey: the key in the model used for the join
  * rightKey: the key in the joined model used for the join
  *
  * The foreign key is store in the model calling belongsTo
  *
  * Post.belongsTo(Author, "author", "authorId", "id"
  *                        ^- author.id
  */
  belongsTo(joinedModel, fieldDoc, leftKey, rightKey, options) {
    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkyError('First argument of `belongsTo` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkyError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkyError('The field `_apply` is reserved by thinky. Please use another one.');
    }

    this._getModel()._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'belongsTo'
    };
    this._getModel()._localKeys[leftKey] = true;

    joinedModel._getModel()._reverseJoins[fieldDoc] = {
      model: this,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'belongsTo'
    };

    options = options || {};
    if (options.init === false) return;

    let newIndex = joinedModel._createIndex(rightKey)
      .catch(error => {
        joinedModel._getModel()._setError(error);
        this._getModel()._setError(error);
      });

    this._waitFor(newIndex);
  }

  /*
  * joinedModel: the joined model
  * fieldDoc: the field where the joined document will be kept
  * leftKey: the key in the model used for the join
  * rightKey: the key in the joined model used for the join
  *
  * A post has one author, and an author can write multiple posts
  * Author.hasMany(Post, "posts", "id", "authorId"
  *                 ^- author.id
  */
  hasMany(joinedModel, fieldDoc, leftKey, rightKey, options) {
    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkyError('First argument of `hasMany` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkyError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkyError('The field `_apply` is reserved by thinky. Please use another one.');
    }

    this._getModel()._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasMany'
    };
    joinedModel._getModel()._localKeys[rightKey] = true;

    options = options || {};
    if (options.init === false) return;

    let newIndex = joinedModel._createIndex(rightKey)
      .catch(error => {
        this._getModel()._setError(error);
        joinedModel._getModel()._setError(error);
      });

    this._waitFor(newIndex);
  }

  /*
  * joinedModel: the joined model
  * fieldDoc: the field where the joined document will be kept
  * leftKey: the key in the model used for the join
  * rightKey: the key in the joined model used for the join
  *
  * Patient.hasAndBelongsToMany(Doctor, "doctors", "id", "id"
  *                     patient.id-^  ^-doctor.id
  *
  * It automatically creates a table <modelName>_<joinedModel> or <joinedModel>_<modelName> (alphabetic order)
  */
  hasAndBelongsToMany(joinedModel, fieldDoc, leftKey, rightKey, options) {
    let self = this;
    let link;
    let thinky = this._getModel()._thinky;
    options = options || {};

    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkyError('First argument of `hasAndBelongsToMany` must be a Model');
    }

    if (fieldDoc in self._getModel()._joins) {
      throw new Errors.ThinkyError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkyError('The field `_apply` is reserved by thinky. Please use another one.');
    }

    if (this._getModel()._name < joinedModel._getModel()._name) {
      link = this._getModel()._name + '_' + joinedModel._getModel()._name;
    } else {
      link = joinedModel._getModel()._name + '_' + this._getModel()._name;
    }

    if (typeof options.type === 'string') {
      link = link + '_' + options.type;
    } else if (typeof options.type !== 'undefined') {
      throw new Errors.ThinkyError('options.type should be a string or undefined.');
    }

    let linkModel;
    if (thinky.models[link] === undefined) {
      linkModel = thinky.createModel(link, {}); // Create a model, claim the namespace and create the table
    } else {
      linkModel = thinky.models[link];
    }

    this._getModel()._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasAndBelongsToMany',
      link: link,
      linkModel: linkModel
    };

    joinedModel._getModel()._reverseJoins[self.getTableName()] = {
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasAndBelongsToMany',
      link: link,
      linkModel: linkModel
    };

    if (options.init !== false) {
      let r = self._getModel()._thinky.r;

      let query;
      if ((this.getTableName() === joinedModel.getTableName())
        && (leftKey === rightKey)) {
        // The relation is built for the same model, using the same key
        // Create a multi index
        query = r.branch(
          r.table(link).indexList().contains(leftKey + '_' + rightKey),
          r.table(link).indexWait(leftKey + '_' + rightKey),
          r.table(link).indexCreate(leftKey + '_' + rightKey, doc => doc(leftKey + '_' + rightKey), { multi: true })
          .do(() => r.table(link).indexWait(leftKey + '_' + rightKey))
        );
      } else {
        query = r.branch(
          r.table(link).indexList().contains(self.getTableName() + '_' + leftKey),
          r.table(link).indexWait(self.getTableName() + '_' + leftKey),
          r.table(link).indexCreate(self.getTableName() + '_' + leftKey).do(() => r.table(link).indexWait(self.getTableName() + '_' + leftKey))
        ).do(() => r.branch(
            r.table(link).indexList().contains(joinedModel.getTableName() + '_' + rightKey),
            r.table(link).indexWait(joinedModel.getTableName() + '_' + rightKey),
            r.table(link).indexCreate(joinedModel.getTableName() + '_' + rightKey)
            .do(() => r.table(link).indexWait(joinedModel.getTableName() + '_' + rightKey))
          )
        );
      }

      let linkPromise = linkModel.ready()
        .then(() => {
          return query.run()
            .then(() => {
              self._getModel()._indexes[leftKey] = true;
              joinedModel._getModel()._indexes[rightKey] = true;
            })
            .error(error => {
              if (error.message.match(/^Index `/)) {
                return;
              }
              if (error.message.match(/^Table `.*` already exists/)) {
                return;
              }
              self._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
              throw error;
            });
        })
        .then(() => {
          this._createIndex(leftKey)
            .catch(error => {
              self._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
            });

          joinedModel._createIndex(rightKey)
            .catch(error => {
              self._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
            });
        });

      joinedModel._waitFor(linkPromise);
      self._waitFor(linkPromise);

      return Promise.all([self.ready(), joinedModel.ready()]);
    }
  }

  getJoin() {
    let query = new Query(this);
    return query.getJoin.apply(query, arguments);
  }

  removeRelations(relationsToRemove) {
    let query = new Query(this);
    return query.removeRelations(relationsToRemove);
  }

  run(options) {
    let query = new Query(this);
    return query.run(options);
  }

  execute(options) {
    let query = new Query(this);
    return query.execute(options);
  }

  save(docs, options) {
    let self = this;
    let r = self._getModel()._thinky.r;
    let isArray = Array.isArray(docs);

    if (!isArray) {
      docs = [docs];
    }

    let p = new Promise((mainResolve, mainReject) => {
      let toSave = docs.length;

      let resolves = [];
      let rejects = [];
      let executeInsert = (resolve, reject) => {
        toSave--;
        resolves.push(resolve);
        rejects.push(reject);

        if (toSave === 0) {
          let copies = [];
          for (let i = 0, ii = docs.length; i < ii; ++i) {
            copies.push(docs[i]._makeSavableCopy());
          }

          let _options;
          if (util.isPlainObject(options)) {
            _options = util.deepCopy(options);
          } else {
            _options = {};
          }

          _options.returnChanges = 'always';
          r.table(self.getTableName()).insert(copies, _options).run()
            .then(results => {
              if (results.errors === 0) {
                // results.changes currently does not enforce the same order as docs
                if (Array.isArray(results.changes)) {
                  for (let i = 0, ii = results.changes.length; i < ii; ++i) {
                    docs[i]._merge(results.changes[i].new_val);
                    if (docs[i]._getModel().needToGenerateFields === true) {
                      docs[i]._generateDefault();
                    }
                    docs[i]._setOldValue(util.deepCopy(results.changes[i].old_val));
                    docs[i].setSaved();
                    docs[i].emit('saved', docs[i]);
                  }
                }
                for (let i = 0, ii = resolves.length; i < ii; ++i) {
                  resolves[i]();
                }
              } else {
                //TODO Expand error with more information
                for (let i = 0, ii = rejects.length; i < ii; ++i) {
                  rejects[i](new Errors.ThinkyError('An error occurred during the batch insert. Original results:\n' + JSON.stringify(results, null, 2)));
                }
              }
            })
            .error(reject);
        }
      };

      let promises = [];
      let foundNonValidDoc = false;
      for (let i = 0, ii = docs.length; i < ii; ++i) {
        if (foundNonValidDoc === true) {
          return;
        }

        if (docs[i] instanceof Document === false) {
          docs[i] = new self(docs[i]); // eslint-disable-line
        }

        let promise;
        util.tryCatch(() => {
          promise = docs[i].validate();
          if (promise instanceof Promise) {
            promises.push(promise);
          }
        }, error => { // eslint-disable-line
          foundNonValidDoc = true;
          mainReject(new Errors.ValidationError('One of the documents is not valid. Original error:\n' + error.message));
        });
      }

      if (foundNonValidDoc === false) {
        Promise.all(promises)
          .then(() => {
            let _promises = [];
            for (let i = 0, ii = docs.length; i < ii; ++i) {
              _promises.push(docs[i]._batchSave(executeInsert));
            }

            return Promise.all(_promises)
              .then(() => mainResolve(docs))
              .error(error => mainReject(error));
          })
          .error(error => {
            mainReject(new Errors.ValidationError('One of the documents is not valid. Original error:\n' + error.message));
          });
      }
    });

    if (!isArray) {
      return p.get(0);
    }

    return p;
  }

  define(key, fn) {
    this._methods[key] = fn;
  }

  defineStatic(key, fn) {
    this._staticMethods[key] = fn;
    this[key] = function() {
      return fn.apply(this, arguments);
    };
  }

  _parse(data, ungroup) {
    let self = this;
    let promises = [];
    let promise;

    let p = new Promise((resolve, reject) => {
      if (ungroup) {
        for (let i = 0, ii = data.length; i < ii; ++i) {
          for (let j = 0, jj = data[i].reduction.length; j < jj; ++j) {
            util.tryCatch(() => {
              let newDoc = new self(data[i].reduction[j]); // eslint-disable-line
              newDoc.setSaved(true);
              newDoc._emitRetrieve();
              data[i].reduction[j] = newDoc;
            }, reject);
          }
        }
        return resolve(data);
      } else if (Array.isArray(data)) {
        util.tryCatch(() => {
          for (let i = 0, ii = data.length; i < ii; ++i) {
            data[i] = new self(data[i]); // eslint-disable-line
            data[i].setSaved(true);

            self.emit('retrieved', data[i]);

            // Order matters here, we want the hooks to be executed *before* calling validate
            promise = util.hook({
              postHooks: data[i]._getModel()._post.retrieve,
              doc: data[i],
              async: data[i]._getModel()._async.retrieve,
              fn: function() {}
            });

            if (promise instanceof Promise) {
              promise
                .then(() => {
                  let _promise = data[i].validate();
                  if (_promise instanceof Promise) {
                    _promise.then(() => resolve(data)).error(reject);
                  } else {
                    resolve(data);
                  }
                })
                .error(reject);
              promises.push(promise);
            } else {
              promise = data[i].validate();
              if (promise instanceof Promise) promises.push(promise);
            }
          }
        }, error => {
          let newError = new Errors.ThinkyError('The results could not be converted to instances of `' + self.getTableName() + '`\nDetailed error: ' + error.message);
          return reject(newError);
        });

        if (promises.length > 0) {
          Promise.all(promises).then(() => {
            resolve(data);
          }).error(reject);
        } else {
          resolve(data);
        }
      } else {
        // If we get a GROUPED_DATA, we convert documents in each group
        if (util.isPlainObject(data) && (data.$reql_type$ === 'GROUPED_DATA')) {
          let result = [];
          util.tryCatch(() => {
            let reduction, newDoc;
            for (let i = 0, ii = data.data.length; i < ii; ++i) {
              reduction = [];
              if (Array.isArray(data.data[i][1])) {
                for (let j = 0, jj = data.data[i][1].length; j < jj; ++j) {
                  newDoc = new self(data.data[i][1][j]); // eslint-disable-line
                  newDoc.setSaved(true);

                  newDoc._emitRetrieve();

                  promise = util.hook({
                    postHooks: newDoc._getModel()._post.retrieve,
                    doc: newDoc,
                    async: newDoc._getModel()._async.retrieve,
                    fn: function() {}
                  });

                  if (promise instanceof Promise) {
                    promise
                      .then(() => { // eslint-disable-line
                        let _promise = newDoc.validate();
                        if (_promise instanceof Promise) {
                          _promise.then(() => resolve(data)).error(reject);
                        } else {
                          resolve(data);
                        }
                      })
                      .error(reject);
                    promises.push(promise);
                  } else {
                    promise = newDoc.validate();
                    if (promise instanceof Promise) promises.push(promise);
                  }

                  reduction.push(newDoc);
                }
                result.push({
                  group: data.data[i][0],
                  reduction: reduction
                });
              } else {
                newDoc = new self(data.data[i][1]); // eslint-disable-line
                newDoc.setSaved(true);

                newDoc._emitRetrieve();

                promise = util.hook({
                  postHooks: newDoc._getModel()._post.retrieve,
                  doc: newDoc,
                  async: newDoc._getModel()._async.retrieve,
                  fn: function() {}
                });
                if (promise instanceof Promise) {
                  promise
                    .then(() => { // eslint-disable-line
                      let _promise = newDoc.validate();
                      if (_promise instanceof Promise) {
                        _promise.then(() => resolve(result)).error(reject);
                      } else {
                        resolve(result);
                      }
                    })
                    .error(reject);
                  promises.push(promise);
                } else {
                  promise = newDoc.validate();
                  if (promise instanceof Promise) promises.push(promise);
                }

                result.push({
                  group: data.data[i][0],
                  reduction: newDoc
                });
              }
            }
          }, reject);

          if (promises.length > 0) {
            Promise.all(promises).then(() => {
              resolve(result);
            }).error(reject);
          } else {
            resolve(result);
          }
        } else {
          if (data === null) { // makeDocument is true, but we got `null`
            reject(new Errors.ThinkyError('Cannot build a new instance of `' + self.getTableName() + '` with `null`.'));
          } else {
            util.tryCatch(() => {
              let newDoc = new self(data); // eslint-disable-line
              newDoc.setSaved(true);

              newDoc._emitRetrieve();

              promise = util.hook({
                postHooks: newDoc._getModel()._post.retrieve,
                doc: newDoc,
                async: newDoc._getModel()._async.retrieve,
                fn: function() {}
              });

              if (promise instanceof Promise) {
                promise
                  .then(() => {
                    let _promise = newDoc.validate();
                    if (_promise instanceof Promise) {
                      _promise.then(() => resolve(newDoc)).error(reject);
                    } else {
                      resolve(newDoc);
                    }
                  })
                  .error(reject);
              } else {
                promise = newDoc.validate();
              }

              if (promise instanceof Promise) {
                promise.then(() => {
                  resolve(newDoc);
                }).error(err => {
                  reject(err);
                });
              } else {
                resolve(newDoc);
              }
            }, reject);
          }
        }
      }
    });
    return p;
  }

  /*
  * Implement an interface similar to events.EventEmitter
  */
  docAddListener(eventKey, listener) {
    let listeners = this._getModel()._listeners;
    if (listeners[eventKey] == null) { // eslint-disable-line
      listeners[eventKey] = [];
    }
    listeners[eventKey].push({
      once: false,
      listener: listener
    });
  }

  docOnce(eventKey, listener) {
    let listeners = this._getModel()._listeners;
    if (listeners[eventKey] == null) { // eslint-disable-line
      listeners[eventKey] = [];
    }
    listeners[eventKey].push({
      once: true,
      listener: listener
    });
  }

  docListeners(eventKey, raw) {
    if (eventKey == null) { // eslint-disable-line
      return this._getModel()._listeners;
    }

    raw = raw || true;
    if (raw === true) {
      return this._getModel()._listeners[eventKey];
    }

    return this._getModel()._listeners[eventKey]
      .map(fn => fn.listener);
  }

  docSetMaxListeners(n) {
    this._getModel()._maxListeners = n;
  }

  docRemoveListener(ev, listener) {
    if (Array.isArray(this._getModel()._listeners[ev])) {
      for (let i = 0, ii = this._getModel()._listeners[ev].length; i < ii; ++i) {
        if (this._getModel()._listeners[ev][i] === listener) {
          this._getModel()._listeners[ev].splice(i, 1);
          break;
        }
      }
    }
  }

  docRemoveAllListeners(ev) {
    if (ev === undefined) {
      delete this._getModel()._listeners[ev];
    } else {
      this._getModel()._listeners = {};
    }
  }

  pre(ev, fn) {
    if (typeof fn !== 'function') {
      throw new Errors.ThinkyError('Second argument to `pre` must be a function');
    }
    if (fn.length > 1) {
      throw new Errors.ThinkyError('Second argument to `pre` must be a function with at most one argument.');
    }
    if (Array.isArray(this._pre[ev]) === false) {
      throw new Errors.ThinkyError('No pre-hook available for the event `' + ev + '`.');
    }
    this._getModel()._async[ev] = this._getModel()._async[ev] || (fn.length === 1);
    this._getModel()._pre[ev].push(fn);
  }

  post(ev, fn) {
    if (typeof fn !== 'function') {
      throw new Errors.ThinkyError('Second argument to `pre` must be a function');
    }
    if (fn.length > 1) {
      throw new Errors.ThinkyError('Second argument to `pre` must be a function with at most one argument.');
    }
    if (Array.isArray(this._post[ev]) === false) {
      throw new Errors.ThinkyError('No post-hook available for the event `' + ev + '`.');
    }
    this._getModel()._async[ev] = this._getModel()._async[ev] || (fn.length === 1);
    this._getModel()._post[ev].push(fn);
  }
}

// aliases
Model.prototype.docOn = Model.prototype.docAddListener;

// Import rethinkdbdash methods
let Term = require('rethinkdbdash')({pool: false}).expr(1).__proto__; // eslint-disable-line
util.loopKeys(Term, (term, key) => {
  if (!Term.hasOwnProperty(key)) return;
  if (key === 'run' || key[0] === '_') return;

  switch (key) {
  case 'orderBy':
    Model.prototype[key] = function() {
      let query = new Query(this);
      if ((arguments.length === 1)
        && (typeof arguments[0] === 'string')
        && (this._getModel()._indexes[arguments[0]] === true)) {
        query = query[key]({index: arguments[0]});
        return query;
      }

      query = query[key].apply(query, arguments);
      return query;
    };
    break;
  case 'filter':
    Model.prototype[key] = function() {
      let query = new Query(this);
      if ((arguments.length === 1)
        && (util.isPlainObject(arguments[0]))) {
        // Optimize a filter with an object
        // We replace the first key that match an index name
        let filter = arguments[0];

        let keys = Object.keys(filter).sort(); // Lexicographical order
        for (let i = 0, ii = keys.length; i < ii; ++i) {
          let index = keys[i];

          if (this._getModel()._indexes[index] === true) { // Index found
            query = query.getAll(filter[index], {index: index});
            delete filter[index];
            break;
          }
        }
      }

      query = query[key].apply(query, arguments);
      return query;
    };
    break;
  case 'get':
      // Make a copy of `get` into `_get`
    Model.prototype._get = function() {
      let query = new Query(this);
      query = query._get.apply(query, arguments);
      return query;
    };
  default: // eslint-disable-line
    Model.prototype[key] = function() {
      let query = new Query(this);
      query = query[key].apply(query, arguments);
      return query;
    };
  }
});

module.exports = Model;
