'use strict';
const Promise = require('bluebird'),
      EventEmitter = require('events'),
      Document = require('./document'),
      Errors = require('./errors'),
      Query = require('./query'),
      util = require('./util');

class Model extends EventEmitter {

  /*
  * Constructor for a Model. Note that this is not what `thinkagain.createModel`
  * returns. It is the prototype of what `thinkagain.createModel` returns.
  * The whole chain being:
  * document.__proto__ = new Document(...)
  * document.__proto__.constructor = model (returned by thinkagain.createModel
  * document.__proto__._model = instance of Model
  * document.__proto__.constructor.__proto__ = document.__proto__._model
  */
  constructor(name, validate, options, thinkagain) {
    super();

    /**
     * Name of the table used
     * @type {string}
     */
    this._name = name;

    // We want a deep copy
    options = options || {};
    this._options = {};
    this._options.timeFormat =
      (options.timeFormat != null) ? options.timeFormat : thinkagain._options.timeFormat; // eslint-disable-line
    this._options.validate =
      (options.validate != null) ? options.validate : thinkagain._options.validate; // eslint-disable-line

    this._validate = validate;

    this._pk = (options.pk != null) ? options.pk : 'id'; // eslint-disable-line

    this._table = (options.table != null) ? options.table : {}; // eslint-disable-line
    this._table.primaryKey = this._pk;

    this._thinkagain = thinkagain;

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

  static new(name, schema, options, thinkagain) {
    let validate = thinkagain.ajv.compile(schema);
    let proto = new Model(name, validate, options, thinkagain);
    proto._initModel = options.init  !== undefined ? !!options.init : true;

    let model = function model(doc, _options) {
      if (!util.isPlainObject(doc)) {
        throw new Errors.ThinkAgainError('Cannot build a new instance of `' + proto._name + '` without an object');
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

      let promises = [];
      let promise;
      if (proto._options.validate === 'oncreate') {
        doc._syncValidate(_options);
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
    let r = model._thinkagain.r;
    this._tableReadyPromise = model._thinkagain.dbReady()
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
    this._pendingPromises.push(promise);

    // Emit 'ready' when all pending promises have resolved
    if (!this._pendingReady) {
      this._pendingReady = this._promisesReady()
        .then(() => {
          delete this._pendingReady;
          this.emit('ready', this);
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
    let r = model._thinkagain.r;

    if (opts === undefined && util.isPlainObject(fn)) {
      opts = fn;
      fn = undefined;
    }

    let promise = this.tableReady()
      .then(() => r.branch(
        r.table(tableName).indexList().contains(name),
        r.table(tableName).indexWait(name),
        r.branch(
          r.table(tableName).info()('primary_key').eq(name),
          r.table(tableName).indexWait(name),
          r.table(tableName).indexCreate(name, fn, opts)
          .do(() => r.table(tableName).indexWait(name))
        )
      ).run())
      .error(error => {
        // TODO: This regex seems a bit too generous since messages such
        // as "Index `id` was not found on table..." will be accepted.
        // Figure out if this is OK or not.
        if (error.message.match(/^Index/)) return;

        throw error;
      })
      .then(() => { model._indexes[name] = true; });

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
  * - validate: 'oncreate'/'onsave'
  */
  hasOne(joinedModel, fieldDoc, leftKey, rightKey, options) {
    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkAgainError('First argument of `hasOne` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkAgainError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkAgainError('The field `_apply` is reserved by thinkagain. Please use another one.');
    }

    let documentModel = this._getModel();

    // recompile document schema
    let schema = documentModel._validate.schema;
    let joinedModelSchema = joinedModel._getModel()._validate.schema;
    schema.properties[fieldDoc] = {
      anyOf: [ { $ref: joinedModelSchema.id }, { type: 'null' } ]
    };

    this._thinkagain.ajv.removeSchema(schema.id);
    documentModel._validate = this._thinkagain.ajv.compile(schema);

    documentModel._joins[fieldDoc] = {
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
        documentModel._setError(error);
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
      throw new Errors.ThinkAgainError('First argument of `belongsTo` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkAgainError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkAgainError('The field `_apply` is reserved by thinkagain. Please use another one.');
    }

    let documentModel = this._getModel(),
        joinedModelModel = joinedModel._getModel();

    // recompile document schema
    let schema = documentModel._validate.schema;
    let joinedModelSchema = joinedModelModel._validate.schema;
    joinedModelSchema.properties[fieldDoc] = {
      anyOf: [ { $ref: schema.id }, { type: 'null' } ]
    };

    this._thinkagain.ajv.removeSchema(joinedModelSchema.id);
    joinedModelModel._validate = this._thinkagain.ajv.compile(joinedModelSchema);

    documentModel._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'belongsTo'
    };
    documentModel._localKeys[leftKey] = true;

    joinedModelModel._reverseJoins[fieldDoc] = {
      model: this,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'belongsTo'
    };

    options = options || {};
    if (options.init === false) return;

    let newIndex = joinedModel._createIndex(rightKey)
      .catch(error => {
        joinedModelModel._setError(error);
        documentModel._setError(error);
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
      throw new Errors.ThinkAgainError('First argument of `hasMany` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkAgainError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkAgainError('The field `_apply` is reserved by thinkagain. Please use another one.');
    }

    let documentModel = this._getModel();

    // recompile document schema
    let schema = documentModel._validate.schema;
    let joinedModelSchema = joinedModel._getModel()._validate.schema;
    schema.properties[fieldDoc] = {
      anyOf: [ { type: 'array', items: { $ref: joinedModelSchema.id } }, { type: 'null' } ]
    };

    this._thinkagain.ajv.removeSchema(schema.id);
    documentModel._validate = this._thinkagain.ajv.compile(schema);

    documentModel._joins[fieldDoc] = {
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
        documentModel._setError(error);
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
    let link;
    let thinkagain = this._getModel()._thinkagain;
    options = options || {};

    if ((joinedModel instanceof Model) === false) {
      throw new Errors.ThinkAgainError('First argument of `hasAndBelongsToMany` must be a Model');
    }

    if (fieldDoc in this._getModel()._joins) {
      throw new Errors.ThinkAgainError('The field `' + fieldDoc + '` is already used by another relation.');
    }

    if (fieldDoc === '_apply') {
      throw new Errors.ThinkAgainError('The field `_apply` is reserved by thinkagain. Please use another one.');
    }

    if (this._getModel()._name < joinedModel._getModel()._name) {
      link = this._getModel()._name + '_' + joinedModel._getModel()._name;
    } else {
      link = joinedModel._getModel()._name + '_' + this._getModel()._name;
    }

    if (typeof options.type === 'string') {
      link = link + '_' + options.type;
    } else if (typeof options.type !== 'undefined') {
      throw new Errors.ThinkAgainError('options.type should be a string or undefined.');
    }

    let linkModel;
    if (thinkagain.models[link] === undefined) {
      linkModel = thinkagain.createModel(link, {}); // Create a model, claim the namespace and create the table
    } else {
      linkModel = thinkagain.models[link];
    }

    // let documentModel = this._getModel(),
    //     joinedModelModel = joinedModel._getModel();

    // recompile document schema
    // let schema = documentModel._validate.schema;
    // let joinedModelSchema = joinedModelModel._validate.schema;
    // joinedModelSchema.properties[fieldDoc] = { type: 'array', items: { $ref: schema.id } };
    // schema.properties[fieldDoc] = { type: 'array', items: { $ref: joinedModelSchema.id } };
    // this._thinkagain.ajv.removeSchema(schema.id);
    // this._thinkagain.ajv.removeSchema(joinedModelSchema.id);
    // documentModel._validate = this._thinkagain.ajv.compile(schema);
    // joinedModelModel._validate = this._thinkagain.ajv.compile(joinedModelSchema);

    this._getModel()._joins[fieldDoc] = {
      model: joinedModel,
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasAndBelongsToMany',
      link: link,
      linkModel: linkModel
    };

    joinedModel._getModel()._reverseJoins[this.getTableName()] = {
      leftKey: leftKey,
      rightKey: rightKey,
      type: 'hasAndBelongsToMany',
      link: link,
      linkModel: linkModel
    };

    if (options.init !== false) {
      let r = this._getModel()._thinkagain.r;

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
          r.table(link).indexList().contains(this.getTableName() + '_' + leftKey),
          r.table(link).indexWait(this.getTableName() + '_' + leftKey),
          r.table(link).indexCreate(this.getTableName() + '_' + leftKey).do(() => r.table(link).indexWait(this.getTableName() + '_' + leftKey))
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
              this._getModel()._indexes[leftKey] = true;
              joinedModel._getModel()._indexes[rightKey] = true;
            })
            .error(error => {
              if (error.message.match(/^Index `/) ||
                  error.message.match(/^Table `.*` already exists/)) {
                return;
              }

              this._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
              throw error;
            });
        })
        .then(() => {
          this._createIndex(leftKey)
            .catch(error => {
              this._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
            });

          joinedModel._createIndex(rightKey)
            .catch(error => {
              this._getModel()._setError(error);
              joinedModel._getModel()._setError(error);
            });
        });

      joinedModel._waitFor(linkPromise);
      this._waitFor(linkPromise);

      return Promise.all([ this.ready(), joinedModel.ready() ]);
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
    let r = this._getModel()._thinkagain.r;
    let isArray = Array.isArray(docs);

    if (!isArray) {
      docs = [docs];
    }

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
        r.table(this.getTableName()).insert(copies, _options).run()
          .then(results => {
            if (results.errors === 0) {
              // results.changes currently does not enforce the same order as docs
              if (Array.isArray(results.changes)) {
                for (let i = 0, ii = results.changes.length; i < ii; ++i) {
                  docs[i]._merge(results.changes[i].new_val);
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
                rejects[i](new Errors.ThinkAgainError('An error occurred during the batch insert. Original results:\n' + JSON.stringify(results, null, 2)));
              }
            }
          })
          .error(reject);
      }
    };

    let promises = [];
    for (let i = 0, ii = docs.length; i < ii; ++i) {
      if (docs[i] instanceof Document === false) {
        docs[i] = new this(docs[i]); // eslint-disable-line
      }

      let promise = docs[i].validate();
      if (promise instanceof Promise) {
        promises.push(promise);
      }
    }

    let result = Promise.all(promises)
      .then(() => {
        let _promises = [];
        for (let i = 0, ii = docs.length; i < ii; ++i) {
          _promises.push(docs[i]._batchSave(executeInsert));
        }

        return Promise.all(_promises).return(docs);
      });

    return (!isArray) ? result.get(0) : result;
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


  __createDocument(data, shouldCallHookAndValidate) {
    return Promise.try(() => {
      let doc = new this(data); // eslint-disable-line
      doc.setSaved(true);
      doc._emitRetrieve();

      if (!shouldCallHookAndValidate) {
        return doc;
      }

      // Order matters here, we want the hooks to be executed *before* calling validate
      let promise = util.hook({
        postHooks: doc._getModel()._post.retrieve,
        doc: doc,
        async: doc._getModel()._async.retrieve,
        fn: function() {}
      });

      return (promise instanceof Promise) ?
        promise.then(() => doc.validate()).return(doc) :
        doc.validate().return(doc);
    });
  }

  _parseUngroup(data) {
    for (let i = 0, ii = data.length; i < ii; ++i) {
      for (let j = 0, jj = data[i].reduction.length; j < jj; ++j) {
        data[i].reduction[j] = this.__createDocument(data[i].reduction[j], false);
      }
    }

    return data;
  }

  _parseArray(data) {
    return Promise.map(data, d => this.__createDocument(d, true)).return(data);
  }

  _parseGrouped(data) {
    // If we get a GROUPED_DATA, we convert documents in each group
    if (util.isPlainObject(data) && (data.$reql_type$ === 'GROUPED_DATA')) {
      return Promise.reduce(data.data, (result, d) => {
        if (Array.isArray(d[1])) {
          return Promise
            .map(d[1], dd => this.__createDocument(dd, true))
            .then(docs => result.push({ group: d[0], reduction: docs }))
            .return(result);
        }

        return this.__createDocument(d[1], true)
          .then(doc => result.push({ group: d[0], reduction: doc }))
          .return(result);
      }, []);
    }

    if (data === null) { // makeDocument is true, but we got `null`
      throw new Errors.ThinkAgainError('Cannot build a new instance of `' + this.getTableName() + '` with `null`.');
    }

    return this.__createDocument(data, true);
  }

  _parse(data, ungroup) {
    if (ungroup) {
      return this._parseUngroup(data);
    } else if (Array.isArray(data)) {
      return this._parseArray(data)
        .error(err => {
          throw new Errors.ValidationError('The results could not be converted to instances of `' + this.getTableName() + '`\nDetailed error: ' + err.message, err.errors);
        });
    }

    return this._parseGrouped(data);
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
      throw new Errors.ThinkAgainError('Second argument to `pre` must be a function');
    }
    if (fn.length > 1) {
      throw new Errors.ThinkAgainError('Second argument to `pre` must be a function with at most one argument.');
    }
    if (Array.isArray(this._pre[ev]) === false) {
      throw new Errors.ThinkAgainError('No pre-hook available for the event `' + ev + '`.');
    }
    this._getModel()._async[ev] = this._getModel()._async[ev] || (fn.length === 1);
    this._getModel()._pre[ev].push(fn);
  }

  post(ev, fn) {
    if (typeof fn !== 'function') {
      throw new Errors.ThinkAgainError('Second argument to `pre` must be a function');
    }
    if (fn.length > 1) {
      throw new Errors.ThinkAgainError('Second argument to `pre` must be a function with at most one argument.');
    }
    if (Array.isArray(this._post[ev]) === false) {
      throw new Errors.ThinkAgainError('No post-hook available for the event `' + ev + '`.');
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
