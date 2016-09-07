'use strict';
const Promise = require('bluebird'),
      Errors = require('./errors'),
      util = require('./util');

class Document {

  /**
   * Create a document of a model (returned by `thinkagain.createModel`).
   * @param {function} model The model of this document
   * @param {object=} options Options that can overwrite the ones of the model
   */
  constructor(model, options) {
    this.constructor = model;  // The constructor for this model
    this._model = model._getModel(); // The instance of Model

    //TODO: We do not need to make a deep copy. We can do the same as for this._schemaOptions.
    options = options || {};
    this._options = {};
    this._options.timeFormat =
      (options.timeFormat != null) ? options.timeFormat : model.getOptions().timeFormat; // eslint-disable-line
    this._options.validate =
      (options.validate != null) ? options.validate : model.getOptions().validate; // eslint-disable-line

    this._saved = options.saved || false;  // Whether the document is saved or not

    util.bindEmitter(this);  // Copy methods from eventEmitter

    // links to hasOne/hasMany documents
    // We use it to know if some links have been removed/added before saving.
    // Example: { key: doc } or { key: [docs] }
    this._belongsTo = {};
    this._hasOne = {};
    this._hasMany = {};
    // Example: { <linkTableName>: { <valueOfRightKey>: true, ... }, ... }
    this._links = {};

    // Keep reference of any doc having a link pointing to this
    // So we can clean when users do doc.belongsToDoc.delete()
    this._parents = {
      _hasOne: {},      // <tableName>: [{doc, key}]
      _hasMany: {},     // <tableName>: [{doc, key}]
      _belongsTo: {},   // <tableName>: [{doc, key, foreignKey}]
      _belongsLinks: {} // <tableName>: [{doc, key}]
    };

    // Bind listeners of the model to this documents.
    util.loopKeys(model._listeners, (listeners, eventKey) => {
      for (let j = 0, jj = listeners[eventKey].length; j < jj; ++j) {
        if (listeners[eventKey][j].once === false) {
          this.addListener(eventKey, listeners[eventKey][j].listener);
        } else if (listeners[eventKey][j].once === true) {
          this.once(eventKey, listeners[eventKey][j].listener);
        }
      }
    });

    // Atom feed
    this._active = false;
    this._feed = null;

    // Add customized methods of the model on this document.
    util.loopKeys(model._methods, (methods, key) => {
      if (this[key] === undefined) {
        this[key] = methods[key];
      } else {
        //TODO: Should we warn the users? Throw an error?
        // console.log(this[key]);
        // console.log('A property ' + key + ' is already defined in the prototype chain. Skipping.');
      }
    });
  }

  /**
   * Return the options of the document, not the instance of Document.
   * @return {Object=}
   */
  _getOptions() {
    return this.__proto__._options; // eslint-disable-line
  }

  /**
   * Return the options for the schema of the document, not the instance of Document.
   * @return {Object=}
   */
  _getSchemaOptions() {
    return this.__proto__._schemaOptions; // eslint-disable-line
  }

  /**
   * Return the constructor of the document, not the instance of Document.
   * @return {function}
   */
  getModel() {
    return this.__proto__.constructor; // eslint-disable-line
  }

  /**
   * Return the model, the instance of Model
   * @return {function}
   */
  _getModel() {
    return this.__proto__._model; // eslint-disable-line
  }

  /*
  * Validate this document against the schema of its model and triggers all the hooks.
  * @param {Object=} options Options to overwrite the ones of the document.
  * @param {Object=} modelToValidate Internal parameter, model to validate
  * @param {boolean=} validateAll Internal parameter, Option to keep recursing as long as no non-circular model have been found.
  * @param {Object=} validatedModel Internal parameter, All the models for which we already validated at least one document.
  * @param {string=} prefix Internal parameter, The current path to this path (used in case of joined documents).
  * @return {Promise=} return a promise if the validation is asynchrone, else undefined.
  */
  validate(options, modelToValidate, validateAll, validatedModel, prefix) {
    modelToValidate = modelToValidate || {};
    validateAll = validateAll || false;
    validatedModel = validatedModel || {};
    prefix = prefix || '';

    return util.hook({
      preHooks: this._getModel()._pre.validate,
      postHooks: this._getModel()._post.validate,
      doc: this,
      async: true,
      fn: this._validateHook,
      fnArgs: [options, modelToValidate, validateAll, validatedModel, prefix]
    });
  }

  /*
  * Validate this document against the schema of its model and all its joined documents and triggers all the hooks
  * @param {Object=} options Options to overwrite the ones of the document.
  * @param {Object=} modelToValidate Internal parameter, model to validate
  * @return {Promise=} return a promise if the validation is asynchrone, else undefined.
  */
  validateAll(options, modelToValidate) {
    let validateAll = modelToValidate === undefined;
    modelToValidate = modelToValidate || {};

    return this.validate(options, modelToValidate, validateAll, {}, '', true);
  }

  /**
   * For oncreate validation
   */
  _syncValidate(options) {
    let schemaOptions = this._getSchemaOptions();
    if (util.isPlainObject(schemaOptions)) {
      schemaOptions = util.mergeOptions(schemaOptions, options);
    } else {
      schemaOptions = options;
    }

    let documentModel = this._getModel();
    if (typeof documentModel._validator === 'function') {
      if (documentModel._validator.call(this, this) === false) {
        throw new Errors.ValidationError("Document's validator returned `false`.");
      }
    }

    // Validate this document
    let valid = documentModel._validate(this);
    if (!valid) {
      throw new Errors.ValidationError(documentModel._validate.errors);
    }
  }

  /*
  * Internal methods that will validate the document (but that will not execute the hooks).
  * @param {Object=} options Options to overwrite the ones of the document.
  * @param {Object=} modelToValidate Internal parameter, model to validate
  * @param {boolean=} validateAll Internal parameter, Option to keep recursing as long as no non-circular model have been found.
  * @param {Object=} validatedModel Internal parameter, All the models for which we already validated at least one document.
  * @param {string=} prefix Internal parameter, The current path to this path (used in case of joined documents).
  * @return {Promise=} return a promise if the validation is asynchrone, else undefined.
  */
  _validateHook(options, modelToValidate, validateAll, validatedModel, prefix) {
    options = options || {};

    let dataToValidate = this;
    if (!!options.data) {
      dataToValidate = options.data;
      delete options.data;
    }

    let schemaOptions = this._getSchemaOptions();
    if (util.isPlainObject(schemaOptions)) {
      schemaOptions = util.mergeOptions(schemaOptions, options);
    } else {
      schemaOptions = options;
    }

    let documentModel = this._getModel();
    if (typeof documentModel._validator === 'function') {
      if (documentModel._validator.call(this, this) === false) {
        throw new Errors.ValidationError("Document's validator returned `false`.");
      }
    }

    // Validate this document
    let valid = documentModel._validate(dataToValidate);
    if (!valid) {
      return Promise.reject(new Errors.ValidationError(documentModel._validate.errors));
    }

    if (util.isPlainObject(modelToValidate) === false) {
      modelToValidate = {};
    }

    let constructor = this.__proto__.constructor; // eslint-disable-line
    validatedModel[constructor.getTableName()] = true;

    // Validate joined documents
    let promises = [];
    util.loopKeys(documentModel._joins, (joins, key) => {
      if (!util.recurse(key, joins, modelToValidate, validateAll, validatedModel)) {
        return;
      }

      let joinType = joins[key].type;
      if (joinType === 'hasOne' || joinType === 'belongsTo') {
        if (!util.isPlainObject(this[key])) {
          return;
        }

        // We do not propagate the options of this document, but only those given to validate
        let promise = this[key].validate(options, modelToValidate[key], validateAll, validatedModel, prefix + '[' + key + ']');
        promises.push(promise);
      } else if (joinType === 'hasMany' || joinType === 'hasAndBelongsToMany') {
        if (!Array.isArray(this[key])) {
          return;
        }

        for (let i = 0, ii = this[key].length; i < ii; ++i) {
          if (!util.isPlainObject(this[key][i])) {
            return;
          }

          let promise =
            this[key][i].validate(options, modelToValidate[key], validateAll, validatedModel, prefix + '[' + key + '][' + i + ']');
          promises.push(promise);
        }
      }
    });

    return Promise.all(promises);
  }

  /**
   * Save the document and execute the hooks. Return a promise if the callback
   * is not provided.
   * @param {function=} callback to execute
   * @return {Promise=}
   */
  save(callback) {
    return this._save({}, false, {}, callback);
  }

  /**
   * Save the document and its joined documents. It will also execute the hooks.
   * Return a promise if the callback is not provided.
   * It will save joined documents as long as a document of th esame model has not
   * been saved.
   * @param {function=} callback to execute
   * @return {Promise=}
   */
  saveAll(docToSave, callback) {
    let saveAll;
    if (typeof docToSave === 'function') {
      callback = docToSave;
      saveAll = true;
      docToSave = {};
    } else {
      saveAll = docToSave === undefined;
      docToSave = docToSave || {};
    }

    return this._save(docToSave, saveAll, {}, callback);
  }

  /**
   * Return a savable copy of the document by removing the extra fields,
   * generating the dfault and virtual fields.
   * @return {object}
   */
  _makeSavableCopy() {
    let model = this._getModel(); // instance of Model
    let r = this._getModel()._thinkagain.r;

    return this.__makeSavableCopy(this, model, r);
  }

  /**
   * Internal helper for _makeSavableCopy.
   * generating the dfault and virtual fields.
   * @return {any} the copy of the field/object.
   */
  __makeSavableCopy(doc, model, r) {
    // model is an instance of a Model (for the top level fields), or undefined
    let result, copyFlag;

    if (util.isPlainObject(doc) && (doc instanceof Buffer === false)) {
      result = {};
      util.loopKeys(doc, (doc, key) => { // eslint-disable-line
        copyFlag = true;
        if ((util.isPlainObject(model) === false) || (model._joins[key] === undefined)) { // We do not copy joined documents
          result[key] = this.__makeSavableCopy(doc[key], undefined, r);
        }
      });

      // Copy the fields that are used as foreign keys
      if (util.isPlainObject(model) === true) {
        util.loopKeys(model._localKeys, (localKeys, localKey) => {
          if (doc[localKey] !== undefined) {
            //TODO: Do we want to copy the foreign key value? If yes, there's no need for this loop
            //Do we want to copy the key from the joined document? If yes we need to replace doc[localKey]
            result[localKey] = this.__makeSavableCopy(doc[localKey], undefined, r);
          }
        });
      }
      return result;
    } else if (Array.isArray(doc)) {
      result = [];
      copyFlag = true;

      if (copyFlag === true) {
        for (let i = 0, ii = doc.length; i < ii; ++i) {
          result.push(this.__makeSavableCopy(doc[i], undefined, r));
        }
      }
      return result;
    }

    // else, doc is a primitive (or a buffer)
    return doc;
  }

  /**
   * Save the document, its joined documents and execute the hooks. Return a
   * promise if the callback is undefined.
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   * @param {Object=} callback to execute
   * @return {Promise=}
   */
  _save(docToSave, saveAll, savedModel, callback) {
    //TOIMPROVE? How should we handle circular references outsides of joined fields? Now we throw with a maximum call stack size exceed
    this.emit('saving', this);

    return util.hook({
      preHooks: this._getModel()._pre.save,
      postHooks: this._getModel()._post.save,
      doc: this,
      async: true,
      fn: this._saveHook,
      fnArgs: [docToSave, saveAll, savedModel]
    }).asCallback(callback);
  }

  /**
   * Save the document and execute the hooks. This is an internal method used with
   * Model.save. This let us use a similar code path for `document.save` and `Model.save`.
   * @param {Function} executeInsert the method that will execute the batch insert
   * @return {Promise}
   */
  _batchSave(executeInsert) {
    // Keep in sync with _save
    this.emit('saving', this);

    return util.hook({
      preHooks: this._getModel()._pre.save,
      postHooks: this._getModel()._post.save,
      doc: this,
      async: true,
      fn: this._batchSaveSelf,
      fnArgs: [executeInsert]
    });
  }

  /**
   * Call executeInsert when the model is ready
   * @param {Function} executeInsert the method that will execute the batch insert
   * @return {Promise}
   */
  _batchSaveSelf(executeInsert) {
    return new Promise((resolve, reject) => {
      this.getModel().ready()
        .then(() => executeInsert(resolve, reject));
    });
  }

  /**
   * Save the document and maybe its joined documents. Hooks have been dealt with
   * in _save.
   * @param {!Object} copy The savable copy of the original documents.
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {Object=} belongsToKeysSaved The keys that may contains a document to save
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   * @param {Function} resolve The function to call when everything has been saved
   * @param {Function} reject The function to call if an error happened
   */
  _saveHook(docToSave, saveAll, savedModel) {
    let model = this._getModel(); // instance of Model
    let constructor = this.getModel();

    if (util.isPlainObject(docToSave) === false) {
      docToSave = {};
    }

    savedModel[constructor.getTableName()] = true;

    // Steps:
    // - Save belongsTo
    // - Save this
    // - Save hasOne, hasMany and hasAndBelongsToMany docs
    // - Save links

    // We'll use it to know which `belongsTo` docs were saved
    let belongsToKeysSaved = {};
    let copy = this._makeSavableCopy();

    // Save the joined documents via belongsTo first
    let promises = [];
    util.loopKeys(model._joins, (joins, key) => {
      if ((docToSave.hasOwnProperty(key) || (saveAll === true)) &&
          (joins[key].type === 'belongsTo') && ((saveAll === false) || (savedModel[joins[key].model.getTableName()] !== true))) {
        belongsToKeysSaved[key] = true;
        if (this[key] != null) { // eslint-disable-line
          savedModel[joins[key].model.getTableName()] = true;
          if (saveAll === true) {
            promises.push(this[key]._save({}, true, savedModel));
          } else {
            promises.push(this[key]._save(docToSave[joins[key].model.getTableName()], false, savedModel));
          }
        }
      }
    });

    //TODO Remove once
    return this.getModel().ready()
      .then(() => Promise.all(promises))
      .then(() => this._onSavedBelongsTo(copy, docToSave, belongsToKeysSaved, saveAll, savedModel));
  }

  /**
   * Save the joined documents linked with a BelongsTo relation. This should be
   * called before _saveSelf as we will have to copy the foreign keys in `this`.
   * @param {!Object} copy The savable copy of the original documents.
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {Object=} belongsToKeysSaved The keys that may contains a document to save
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   */
  _onSavedBelongsTo(copy, docToSave, belongsToKeysSaved, saveAll, savedModel) {
    let model = this._getModel();
    let constructor = this.__proto__.constructor; // eslint-disable-line

    util.loopKeys(belongsToKeysSaved, (_joins, key) => {
      if (this[key] === null || this[key] === undefined) return;

      let joins = model._joins;
      this.__proto__._belongsTo[key] = true; // eslint-disable-line

      // Copy foreign key
      if (this[key][joins[key].rightKey] == null) { // eslint-disable-line
        if (this.hasOwnProperty(joins[key].leftKey)) {
          delete this[joins[key][joins[key].leftKey]];
        }
        if (copy.hasOwnProperty(joins[key].leftKey)) {
          delete copy[joins[key][joins[key].leftKey]];
        }
      } else {
        this[joins[key].leftKey] = this[key][joins[key].rightKey];
        copy[joins[key].leftKey] = this[key][joins[key].rightKey]; // We need to put it in copy before saving it
      }

      // Save the document that belongs to this[key]
      if (this[key].__proto__._parents._belongsTo[constructor.getTableName()] == null) { // eslint-disable-line
        this[key].__proto__._parents._belongsTo[constructor.getTableName()] = []; // eslint-disable-line
      }

      this[key].__proto__._parents._belongsTo[constructor.getTableName()].push({ // eslint-disable-line
        doc: this,
        foreignKey: joins[key].leftKey,
        key: key // foreignDoc
      });
    });

    return this._saveSelf(copy, docToSave, belongsToKeysSaved, saveAll, savedModel);
  }

  /**
   * Save the document on which `save` was called.
   * @param {!Object} copy The savable copy of the original documents.
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {Object=} belongsToKeysSaved The keys that may contains a document to save
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   */
  _saveSelf(copy, docToSave, belongsToKeysSaved, saveAll, savedModel) {
    let model = this._getModel();
    let constructor = this.__proto__.constructor; // eslint-disable-line
    let r = this._getModel()._thinkagain.r;

    // BelongsTo documents were saved before. We just need to copy the foreign
    // keys.
    util.loopKeys(model._joins, (joins, key) => {
      if ((joins[key].type !== 'belongsTo') || (belongsToKeysSaved[key] !== true)) return;

      if (this[key] != null) { // eslint-disable-line
        this[joins[key].leftKey] = this[key][joins[key].rightKey];
      } else if (this.__proto__._belongsTo[key]) { // eslint-disable-line
        delete this[joins[key].leftKey];
        delete copy[joins[key].leftKey];
      }
    });

    return this.getModel().ready()
      .then(() => this.validate({ data: copy }))
      .then(() => {
        if (this.__proto__._saved === false) { // eslint-disable-line
          return r.table(constructor.getTableName()).insert(copy, { returnChanges: 'always' }).run();
        }

        if (copy[model._pk] === undefined) {
          throw new Errors.ThinkAgainError('The document was previously saved, but its primary key is undefined.');
        }

        return r.table(constructor.getTableName())
          .get(copy[model._pk]).replace(copy, { returnChanges: 'always' }).run();
      })
      .then(result => this._onSaved(result, docToSave, saveAll, savedModel));
  }

  /**
   * Callback for the insert query.
   * @param {Object} result The result from the insert query
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   */
  _onSaved(result, docToSave, saveAll, savedModel) {
    // Keep in sync with Model.save
    if (result.first_error != null) { // eslint-disable-line
      return Promise.reject(Errors.create(result.first_error));
    }

    if (Array.isArray(result.changes) && result.changes.length > 0) {
      this._merge(result.changes[0].new_val);
      this._setOldValue(util.deepCopy(result.changes[0].old_val));
    }

    this.setSaved();
    this.emit('saved', this);
    return this._saveMany(docToSave, saveAll, savedModel);
  }

  /**
   * Save the joined documents linked with a hasOne or hasMany or
   * hasAndBelongsToMany relation. This should be called after `_saveSelf` as we
   * will have to copy the foreign keys in the joined documents.
   * @param {Object} result The result from the insert query
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {boolean} saveAll Whether _save should recurse by default or not
   * @param {Object=} savedModel Models saved in this call
   */
  _saveMany(docToSave, saveAll, savedModel) {
    let promises = [];
    let model = this._getModel();
    util.loopKeys(model._joins, (joins, key) => {
      let join = joins[key];

      if (((key in docToSave) || (saveAll === true)) &&
          (join.type === 'hasOne') && ((saveAll === false) || (savedModel[join.model.getTableName()] !== true))) {
        savedModel[join.model.getTableName()] = true;
        if (this[key] != null) { // eslint-disable-line
          promises.push(this._saveManyHasOne(key, join, docToSave, saveAll, savedModel));
        } else if ((this[key] == null) && (this.__proto__._hasOne[key] != null)) { // eslint-disable-line
          let doc = this.__proto__._hasOne[key].doc; // eslint-disable-line
          delete doc[this.__proto__._hasOne[key].foreignKey]; // eslint-disable-line
          promises.push(doc._save(docToSave[key], saveAll, savedModel));
          this.__proto__._hasOne[key] = null; // eslint-disable-line
        }
      }

      if (((key in docToSave) || (saveAll === true)) &&
          (join.type === 'hasMany') && ((saveAll === false) || (savedModel[join.model.getTableName()] !== true))
          && (Array.isArray(this[key]))) {
        savedModel[join.model.getTableName()] = true;

        //Go through _hasMany and find element that were removed
        let pkMap = {};
        if (Array.isArray(this[key])) {
          for (let i = 0, ii = this[key].length; i < ii; ++i) {
            if (this[key][i][join.model._pk] != null) { // eslint-disable-line
              pkMap[this[key][i][join.model._pk]] = true;
            }
          }
        }

        if (this.__proto__._hasMany[key] != null) { // eslint-disable-line
          for (let i = 0, ii = this.__proto__._hasMany[key].length; i < ii; ++i) { // eslint-disable-line
            if (pkMap[this.__proto__._hasMany[key][i].doc[[join.model._pk]]] == null) { // eslint-disable-line
              delete this.__proto__._hasMany[key][i].doc[this.__proto__._hasMany[key][i].foreignKey]; // eslint-disable-line
              promises.push(this.__proto__._hasMany[key][i].doc._save(docToSave[key], saveAll, savedModel)); // eslint-disable-line
            }
          }
        }
        this.__proto__._hasMany[key] = []; // eslint-disable-line

        promises.push(this._saveManyHasMany(key, join, docToSave, saveAll, savedModel));
      }

      if (((key in docToSave) || (saveAll === true)) &&
          (join.type === 'hasAndBelongsToMany') && ((saveAll === false) || (savedModel[join.model.getTableName()] !== true))) {
        savedModel[join.model.getTableName()] = true;

        if (!Array.isArray(this[key])) {
          return;
        }

        promises.push(this._saveManyHasAndBelongsToMany(key, docToSave, saveAll, savedModel));
      }
    });

    return Promise.all(promises)
      .then(() => this._saveLinks(docToSave, saveAll));
  }

  _saveManyHasOne(key, join, docToSave, saveAll, savedModel) {
    let model = this._getModel();
    let parents = this[key].__proto__._parents; // eslint-disable-line

    this[key][join.rightKey] = this[join.leftKey];
    return this[key]._save(docToSave[key], saveAll, savedModel)
      .then(() => {
        this.__proto__._hasOne[key] = { // eslint-disable-line
          doc: this[key],
          foreignKey: model._joins[key].rightKey
        };

        if (parents._hasOne[model._name] == null) { // eslint-disable-line
          parents._hasOne[model._name] = []; // eslint-disable-line
        }

        parents._hasOne[model._name].push({ doc: this, key: key });
      });
  }

  _saveManyHasMany(key, join, docToSave, saveAll, savedModel) {
    let model = this._getModel();
    return Promise.map(this[key], doc => {
      doc[join.rightKey] = this[join.leftKey];

      return doc._save(docToSave[key], saveAll, savedModel)
        .then(savedDoc => {
          if (!Array.isArray(this.__proto__._hasMany[key])) { // eslint-disable-line
            this.__proto__._hasMany[key] = []; // eslint-disable-line
          }

          this.__proto__._hasMany[key].push({ // eslint-disable-line
            doc: savedDoc,
            foreignKey: model._joins[key].rightKey
          });

          if (doc.__proto__._parents._hasMany[model._name] == null) { // eslint-disable-line
            doc.__proto__._parents._hasMany[model._name] = []; // eslint-disable-line
          }

          doc.__proto__._parents._hasMany[model._name].push({ // eslint-disable-line
            doc: this,
            key: key
          });
        });
    });
  }

  _saveManyHasAndBelongsToMany(key, docToSave, saveAll, savedModel) {
    let model = this._getModel();
    return Promise.map(this[key], doc => {
      if (!util.isPlainObject(doc)) {
        // Save only if we have a full object, and not just a key
        return;
      }

      return doc._save(docToSave[key], saveAll, savedModel)
        .then(() => {
          let parents = doc.__proto__._parents; // eslint-disable-line

          // this.__proto__._links will be saved in saveLinks
          if (parents._belongsLinks[model._name] == null) { // eslint-disable-line
            parents._belongsLinks[model._name] = [];
          }

          parents._belongsLinks[model._name].push({ doc: this, key: key });
        });
    });
  }

  /**
   * Save the links for hasAndBelongsToMany joined documents.
   * called before _saveSelf as we will have to copy the foreign keys in `this`.
   * @param {Object=} docToSave Documents to save represented by an object field->true
   * @param {boolean} saveAll Whether _save should recurse by default or not
   */
  _saveLinks(docToSave, saveAll) {
    let model = this._getModel();
    let constructor = this.getModel();
    let r = model._thinkagain.r;

    let promisesLink = [];

    util.loopKeys(model._joins, (joins, key) => {
      // Write tests about that!
      if (((key in docToSave) || (saveAll === true)) &&
          (joins[key].type === 'hasAndBelongsToMany')) {
        if (Array.isArray(this[key])) {
          let newKeys = {};
          for (let i = 0, ii = this[key].length; i < ii; ++i) {
            if (util.isPlainObject(this[key][i])) {
              if (this[key][i].isSaved() === true) {
                newKeys[this[key][i][joins[key].rightKey]] = true;
              }
            } else { // this[key][i] is just the key
              newKeys[this[key][i]] = true;
            }
          }

          if (this.__proto__._links[joins[key].link] === undefined) { // eslint-disable-line
            this.__proto__._links[joins[key].link] = {}; // eslint-disable-line
          }
          let oldKeys = this.__proto__._links[joins[key].link]; // eslint-disable-line

          util.loopKeys(newKeys, (_newKeys, link) => {
            if (oldKeys[link] !== true) {
              let newLink = {};

              if ((constructor.getTableName() === joins[key].model.getTableName())
                && (joins[key].leftKey === joins[key].rightKey)) {
                // We link on the same model and same key
                // We don't want to save redundant field
                if (link < this[joins[key].leftKey]) {
                  newLink.id = link + '_' + this[joins[key].leftKey];
                } else {
                  newLink.id = this[joins[key].leftKey] + '_' + link;
                }
                newLink[joins[key].leftKey + '_' + joins[key].leftKey] = [link, this[joins[key].leftKey]];
              } else {
                newLink[constructor.getTableName() + '_' + joins[key].leftKey] = this[joins[key].leftKey];
                newLink[joins[key].model.getTableName() + '_' + joins[key].rightKey] = link;

                // Create the primary key
                if (constructor.getTableName() < joins[key].model.getTableName()) {
                  newLink.id = this[joins[key].leftKey] + '_' + link;
                } else if (constructor.getTableName() > joins[key].model.getTableName()) {
                  newLink.id = link + '_' + this[joins[key].leftKey];
                } else {
                  if (link < this[joins[key].leftKey]) {
                    newLink.id = link + '_' + this[joins[key].leftKey];
                  } else {
                    newLink.id = this[joins[key].leftKey] + '_' + link;
                  }
                }
              }

              let insertPromise = r.table(this._getModel()._joins[key].link)
                .insert(newLink, {conflict: 'replace', returnChanges: 'always'}).run()
                .then(result => {
                  if (Array.isArray(result.changes) && result.changes.length > 0) {
                    this.__proto__._links[joins[key].link][result.changes[0].new_val[joins[key].model.getTableName() + '_' + joins[key].rightKey]] = true; // eslint-disable-line
                  } else {
                    this.__proto__._links[joins[key].link][newLink[joins[key].model.getTableName() + '_' + joins[key].rightKey]] = true; // eslint-disable-line
                  }
                });

              promisesLink.push(insertPromise);
            }
          });

          let keysToDelete = [];
          util.loopKeys(oldKeys, (_oldKeys, link) => {
            if (newKeys[link] === undefined) {
              if (constructor.getTableName() < joins[key].model.getTableName()) {
                keysToDelete.push(this[joins[key].leftKey] + '_' + link);
              } else {
                keysToDelete.push(link + '_' + this[joins[key].leftKey]);
              }
            }
          });

          if (keysToDelete.length > 0) {
            let table = r.table(joins[key].link);
            promisesLink.push(table.getAll.apply(table, keysToDelete).delete().run().then(() => {
              for (let i = 0, ii = keysToDelete.length; i < ii; ++i) {
                this.__proto__._links[joins[key].link][keysToDelete[i]] = false; // eslint-disable-line
              }
            }));
          }
        }
      }
    });

    if (promisesLink.length > 0) {
      return Promise.all(promisesLink).return(this);
    }

    return Promise.resolve(this);
  }

  /**
   * Return the value saved in __proto__.oldValue
   */
  getOldValue() {
    return this.__proto__.oldValue; // eslint-disable-line
  }

  /**
   * Save a reference of `value` that will be later accessible with `getOldValue`.
   * @param {Object} value The value to save
   */
  _setOldValue(value) {
    this.__proto__.oldValue = value; // eslint-disable-line
  }

  /**
   * Return whether this document was saved or not.
   * @return {boolean}
   */
  isSaved() {
    return this.__proto__._saved; // eslint-disable-line
  }

  /**
   * Set the document (and maybe its joined documents) as saved.
   * @param {boolean=} all Recursively set all the joined documents as saved
   */
  setSaved(all) {
    this.__proto__._saved = true; // eslint-disable-line
    if (all !== true) return;
    util.loopKeys(this._getModel()._joins, (joins, key) => {
      switch (joins[key].type) { // eslint-disable-line
      case 'hasOne':
        if (this[key] instanceof Document) {
          this[key].setSaved(true);
        }
        break;

      case 'belongsTo':
        if (this[key] instanceof Document) {
          this[key].setSaved(true);
        }
        break;

      case 'hasMany':
        if (Array.isArray(this[key])) {
          for (let i = 0, ii = this[key].length; i < ii; ++i) {
            if (this[key][i] instanceof Document) {
              this[key][i].setSaved(true);
            }
          }
        }
        break;

      case 'hasAndBelongsToMany':
        if (Array.isArray(this[key])) {
          for (let i = 0, ii = this[key].length; i < ii; ++i) {
            if (this[key][i] instanceof Document) {
              this[key][i].setSaved(true);
            }
          }
        }
        break;
      }
    });

    // Make joins, we should keep references only of the saved documents
    util.loopKeys(this._getModel()._joins, (joins, key) => {
      if (this[key] == null) return; // eslint-disable-line
      switch (joins[key].type) { // eslint-disable-line
      case 'hasOne':
        if (this[key].isSaved()) {
          this.__proto__._hasOne[key] = { // eslint-disable-line
            doc: this[key],
            foreignKey: this._getModel()._joins[key].rightKey
          };
        }

        if (this[key].__proto__._parents._hasOne[this._getModel()._name] == null) { // eslint-disable-line
          this[key].__proto__._parents._hasOne[this._getModel()._name] = []; // eslint-disable-line
        }

        this[key].__proto__._parents._hasOne[this._getModel()._name].push({ // eslint-disable-line
          doc: this,
          key: key
        });
        break;

      case 'belongsTo':
        if (this[key].__proto__._parents._belongsTo[this._getModel()._name] == null) { // eslint-disable-line
          this[key].__proto__._parents._belongsTo[this._getModel()._name] = []; // eslint-disable-line
        }

        this[key].__proto__._parents._belongsTo[this._getModel()._name].push({ // eslint-disable-line
          doc: this,
          foreignKey: this._getModel()._joins[key].leftKey,
          key: key
        });

        this.__proto__._belongsTo[key] = true; // eslint-disable-line
        break;

      case 'hasMany':
        this.__proto__._hasMany[key] = []; // eslint-disable-line

        for (let i = 0, ii = this[key].length; i < ii; ++i) {
          if (this[key][i].isSaved()) {
            this.__proto__._hasMany[key].push({ // eslint-disable-line
              doc: this[key][i],
              foreignKey: this._getModel()._joins[key].rightKey
            });
          }

          if (this[key][i].__proto__._parents._hasMany[this._getModel()._name] == null) { // eslint-disable-line
            this[key][i].__proto__._parents._hasMany[this._getModel()._name] = []; // eslint-disable-line
          }

          this[key][i].__proto__._parents._hasMany[this._getModel()._name].push({ // eslint-disable-line
            doc: this,
            key: key
          });
        }
        break;

      case 'hasAndBelongsToMany':
        if (this.__proto__._links[this._getModel()._joins[key].link] === undefined) { // eslint-disable-line
          this.__proto__._links[this._getModel()._joins[key].link] = {}; // eslint-disable-line
        }

        for (let i = 0, ii = this[key].length; i < ii; ++i) {
          if (this[key][i].isSaved()) {
            this.__proto__._links[this._getModel()._joins[key].link][this[key][i][this._getModel()._joins[key].rightKey]] = true; // eslint-disable-line
          }

          if (this[key][i].__proto__._parents._belongsLinks[this._getModel()._name] == null) { // eslint-disable-line
            this[key][i].__proto__._parents._belongsLinks[this._getModel()._name] = []; // eslint-disable-line
          }

          this[key][i].__proto__._parents._belongsLinks[this._getModel()._name].push({ // eslint-disable-line
            doc: this,
            key: key
          });
        }
        break;
      }
    });
  }

  /**
   * Set the document as unsaved
   */
  _setUnSaved() {
    this.__proto__._saved = false; // eslint-disable-line
  }

  /**
   * Delete the document from the database. Update the joined documents by
   * removing the foreign key for hasOne/hasMany joined documents, and remove the
   * links for hasAndBelongsToMany joined documents if the link is built on the
   * primary key.
   * @param {Function=} callback
   * @return {Promise=} Return a promise if no callback is provided
   */
  delete(callback) {
    return this._delete({}, false, [], true, true, callback);
  }

  /**
   * Delete the document from the database and the joined documents. If
   * `docToDelete` is undefined, it will delete all the joined documents, else it
   * will limits itself to the one stored in the keys defined in `docToDelete`.
   * It will also update the joined documents by removing the foreign key for
   * `hasOne`/`hasMany` joined documents, and remove the links for
   * `hasAndBelongsToMany` joined documents if the link is built on the primary
   * key.
   * @param {Object=} docToDelete An object where a field maps to `true` if the
   * document stored in this field should be deleted.
   * @param {Function=} callback
   * @return {Promise=} Return a promise if no callback is provided
   */
  deleteAll(docToDelete, callback) {
    let deleteAll;
    if (typeof docToDelete === 'function') {
      callback = docToDelete;
      deleteAll = true;
      docToDelete = {};
    } else {
      deleteAll = docToDelete === undefined;
      docToDelete = docToDelete || {};
    }

    return this._delete(docToDelete, deleteAll, [], true, true, callback);
  }

  /**
   * Delete the document from the database and the joined documents. If
   * `docToDelete` is `undefined` and `deleteAll` is `true`, it will delete all
   * the joined documents, else it will limits itself to the one stored in the
   * keys defined in `docToDelete`. It will also update the joined documents by
   * removing the foreign key for `hasOne`/`hasMany` joined documents, and
   * remove the links for `hasAndBelongsToMany` joined documents if the link is
   * built on the primary key.
   * Hooks will also be executed.
   * @param {Object=} docToDelete Explicit maps of the documents to delete
   * @param {boolean} deleteAll Recursively delete all the documents if
   *     `docToDelete` is undefined
   * @param {Array} deletedDocs Array of docs already deleted, used to make sure
   *     that we do not try to delete multiple times the same documents
   * @param {boolean} deleteSelf Whether it should delete itself
   * @param {boolean} updateParents Whether it should update the keys for the
   *     parents
   * @param {Function=} callback
   * @return {Promise=} Return a promise if no callback is provided
   */
  _delete(docToDelete, deleteAll, deletedDocs, deleteSelf, updateParents, callback) {
    //TODO Set a (string) id per document and use it to perform faster lookup
    if (util.isPlainObject(docToDelete) === false) {
      docToDelete = {};
    }

    deleteSelf = (deleteSelf === undefined) ? true : deleteSelf;

    return util.hook({
      preHooks: this._getModel()._pre.delete,
      postHooks: this._getModel()._post.delete,
      doc: this,
      async: true,
      fn: this._deleteHook,
      fnArgs: [docToDelete, deleteAll, deletedDocs, deleteSelf, updateParents, callback]
    });
  }

  /**
   * Internal methods used in `_delete`. Does the same as `_delete` but without
   * the hooks.
   * @param {Object=} docToDelete Explicit maps of the documents to delete
   * @param {boolean} deleteAll Recursively delete all the documents if
   *     `docToDelete` is undefined
   * @param {Array} deletedDocs Array of docs already deleted, used to make sure
   *     that we do not try to delete multiple times the same documents
   * @param {boolean} deleteSelf Whether it should delete itself
   * @param {boolean} updateParents Whether it should update the keys for the
   *     parents
   * @return {Promise=} Return a promise if no callback is provided
   */
  _deleteHook(docToDelete, deleteAll, deletedDocs, deleteSelf, updateParents, callback) {
    let model = this._getModel(); // instance of Model
    let r = model._thinkagain.r;

    let promises = [];

    deletedDocs.push(this);
    util.loopKeys(this._getModel()._joins, (joins, key) => {
      if ((joins[key].type === 'hasOne') && (this[key] instanceof Document)) {
        if ((this[key].isSaved() === true) &&
          ((key in docToDelete) || ((deleteAll === true) && (deletedDocs.indexOf(this[key]) === -1)))) {
          let deletePromise = this[key]._delete(docToDelete[key], deleteAll, deletedDocs, true, false)
            .then(() => { delete this[key]; });
          promises.push(deletePromise);
        } else if ((deleteSelf === true) && (deletedDocs.indexOf(this[key]) === -1)) {
          delete this[key][joins[key].rightKey];
          if (this[key].isSaved() === true) {
            promises.push(this[key].save({}, false, {}, true, false));
          }
        }
      }

      if ((joins[key].type === 'belongsTo') && (this[key] instanceof Document)) {
        if ((this[key].isSaved() === true) &&
          ((key in docToDelete) || ((deleteAll === true) && (deletedDocs.indexOf(this[key]) === -1)))) {
          let deletePromise = this[key]._delete(docToDelete[key], deleteAll, deletedDocs, true, false)
            .then(() => { delete this[key]; });
          promises.push(deletePromise);
        }
      }

      if ((joins[key].type === 'hasMany') && (Array.isArray(this[key]))) {
        let manyPromises = [];
        for (let i = 0, ii = this[key].length; i < ii; ++i) {
          if (((this[key][i] instanceof Document) && (this[key][i].isSaved() === true))
            && ((key in docToDelete) || ((deleteAll === true) && (deletedDocs.indexOf(this[key][i]) === -1)))) {
            manyPromises.push(this[key][i]._delete(docToDelete[key], deleteAll, deletedDocs, true, false));
          } else if ((this[key][i] instanceof Document) && (deletedDocs.indexOf(this[key][i]) === -1)) {
            delete this[key][i][joins[key].rightKey];
            if (this[key][i].isSaved() === true) {
              promises.push(this[key][i].save({}, false, {}, true, false));
            }
          }
        }

        promises.push(Promise.all(manyPromises).then(() => { delete this[key]; }));
      }

      if ((joins[key].type === 'hasAndBelongsToMany') && (Array.isArray(this[key]))) {
        // Delete links + docs
        let linksPks = []; // primary keys of the links

        // Store the element we are going to delete.
        // If the user force the deletion of the same element multiple times, we can't naively loop
        // over the elements in the array...
        let docsToDelete = [];

        for (let i = 0, ii = this[key].length; i < ii; ++i) {
          if (((this[key][i] instanceof Document) && (this[key][i].isSaved() === true))
            && ((key in docToDelete) || ((deleteAll === true) && (deletedDocs.indexOf(this[key][i]) === -1)))) {
            //pks.push(this[key][i][joins[key].model._getModel()._pk]);
            docsToDelete.push(this[key][i]);
            // We are going to do a range delete, but we still have to recurse
            promises.push(this[key][i]._delete(docToDelete[key], deleteAll, deletedDocs, true, false));

            if (this.getModel()._getModel()._pk === joins[key].leftKey) {
              // The table is created since we are deleting an element from it
              if (this._getModel()._name === joins[key].model._getModel()._name) {
                if (this[joins[key].leftKey] < this[key][i][joins[key].rightKey]) {
                  //TODO Add test for this
                  linksPks.push(this[joins[key].leftKey] + '_' + this[key][i][joins[key].rightKey]);
                } else {
                  linksPks.push(this[key][i][joins[key].rightKey] + '_' + this[joins[key].leftKey]);
                }
              } else if (this._getModel()._name < joins[key].model._getModel()._name) {
                linksPks.push(this[joins[key].leftKey] + '_' + this[key][i][joins[key].rightKey]);
              } else {
                linksPks.push(this[key][i][joins[key].rightKey] + '_' + this[joins[key].leftKey]);
              }
            }
          } else if ((this[key][i] instanceof Document) && (deletedDocs.indexOf(this[key][i]) === -1)) {
            // It's safe to destroy links only if it's a primary key
            if (this.getModel()._getModel()._pk === joins[key].leftKey) {
              if (this._getModel()._name < joins[key].model._getModel()._name) {
                linksPks.push(this[joins[key].leftKey] + '_' + this[key][i][joins[key].rightKey]);
              } else {
                linksPks.push(this[key][i][joins[key].rightKey] + '_' + this[joins[key].leftKey]);
              }
            }
          }
        }

        if (linksPks.length > 0) {
          let query = r.table(joins[key].link);
          query = query.getAll.apply(query, linksPks).delete();
          promises.push(query.run());
        }
      }
    });

    if (updateParents !== false) {
      // Clean links that we are aware of
      util.loopKeys(this.__proto__._parents._hasOne, (hasOne, key) => { // eslint-disable-line
        let parents = hasOne[key];
        for (let i = 0, ii = parents.length; i < ii; ++i) {
          delete parents[i].doc[parents[i].key];
          util.loopKeys(parents[i].doc.__proto__._hasOne, (joined, joinKey) => { // eslint-disable-line
            if (joined[joinKey].doc === this) {
              delete parents[i].doc.__proto__._hasOne[joinKey]; // eslint-disable-line
            }
          });
        }
      });

      util.loopKeys(this.__proto__._parents._belongsTo, (belongsTo, key) => { // eslint-disable-line
        let parents = belongsTo[key];
        for (let i = 0, ii = parents.length; i < ii; ++i) {
          delete parents[i].doc[parents[i].key];
          delete parents[i].doc[parents[i].foreignKey];
          if (deletedDocs.indexOf(parents[i]) === -1) {
            promises.push(parents[i].doc.save());
          }
        }
      });

      util.loopKeys(this.__proto__._parents._hasMany, (hasMany, key) => { // eslint-disable-line
        let parents = hasMany[key];
        for (let i = 0, ii = parents.length; i < ii; ++i) {
          for (let j = 0, jj = parents[i].doc[parents[i].key].length; j < jj; ++j) {
            if (parents[i].doc[parents[i].key][j] === this) {
              util.loopKeys(parents[i].doc.__proto__._hasMany, (joined, joinKey) => { // eslint-disable-line
                for (let k = 0, kk = joined[joinKey].length; k < kk; ++k) {
                  if (joined[joinKey][k].doc === this) {
                    joined[joinKey].splice(k, 1);
                    return false;
                  }
                }
              });
              parents[i].doc[parents[i].key].splice(j, 1);
              break;
            }
          }
        }
      });

      util.loopKeys(this.__proto__._parents._belongsLinks, (belongsLinks, key) => { // eslint-disable-line
        let parents = belongsLinks[key];
        for (let i = 0, ii = parents.length; i < ii; ++i) {
          for (let j = 0, jj = parents[i].doc[parents[i].key].length; j < jj; ++j) {
            if (parents[i].doc[parents[i].key][j] === this) {
              parents[i].doc[parents[i].key].splice(j, 1);
              break;
            }
          }
        }
      });
    }

    if (deleteSelf !== false) {
      if (this.isSaved() === true) {
        let deletePromise = r.table(model._name).get(this[model._pk]).delete().run()
          .then(result => {
            this._setUnSaved();
            this.emit('deleted', this);
          });

        promises.push(deletePromise);
      }
      // else we don't throw an error, should we?
    }

    return Promise.all(promises)
      .return(this)
      .asCallback(callback);
  }

  /*
  * Delete this document and purge the database by doing range update to clean
  * the foreign keys.
  * @param {Function=} callback
  * @return {Promise=} Return a promise if no callback is provided
  */
  purge(callback) {
    let model = this._getModel(); // instance of Model
    let r = model._thinkagain.r;

    // Clean parent for hasOne
    // doc.otherDoc.delete()
    util.loopKeys(this.__proto__._parents._hasOne, (hasOne, key) => { // eslint-disable-line
      for (let i = 0, ii = hasOne[key].length; i < ii; ++i) {
        let parentDoc = hasOne[key][i].doc; // A doc that belongs to otherDoc (aka this)
        delete parentDoc[hasOne[key][i].key]; // Delete reference to otherDoc (aka this)
      }
    });

    // Clean parent for belongsTo
    // doc.otherDoc.delete()
    util.loopKeys(this.__proto__._parents._belongsTo, (belongsTo, key) => { // eslint-disable-line
      for (let i = 0, ii = belongsTo[key].length; i < ii; ++i) {
        let parentDoc = belongsTo[key][i].doc;
        delete parentDoc[belongsTo[key][i].key];
        delete parentDoc[belongsTo[key][i].foreignKey];
      }
    });

    // Clean parent for hasMany
    util.loopKeys(this.__proto__._parents._hasMany, (hasMany, key) => { // eslint-disable-line
      for (let i = 0, ii = hasMany[key].length; i < ii; ++i) {
        let parentDoc = hasMany[key][i].doc;
        let field = hasMany[key][i].key;
        for (let j = 0, jj = parentDoc[field].length; j < jj; ++j) {
          if (parentDoc[field][j] === this) {
            parentDoc[field].splice(j, 1);
            break;
          }
        }
      }
    });

    // Clean parent for hasAndBelongsToMany
    util.loopKeys(this.__proto__._parents._belongsLinks, (belongsLinks, key) => { // eslint-disable-line
      for (let i = 0, ii = belongsLinks[key].length; i < ii; ++i) {
        let parentDoc = belongsLinks[key][i].doc;
        let field = belongsLinks[key][i].key;
        for (let j = 0, jj = parentDoc[field].length; j < jj; ++j) {
          if (parentDoc[field][j] === this) {
            parentDoc[field].splice(j, 1);
            break;
          }
        }
      }
    });

    // Purge the database
    let promises = [];
    util.loopKeys(this._getModel()._joins, (joins, field) => {
      let join = joins[field];
      let joinedModel = join.model;

      if ((join.type === 'hasOne') || (join.type === 'hasMany')) {
        promises.push(r.table(joinedModel.getTableName()).getAll(this[join.leftKey], {index: join.rightKey}).replace(doc => {
          return doc.without(join.rightKey);
        }).run());
      } else if (join.type === 'hasAndBelongsToMany') {
        if (this.getModel()._getModel()._pk === join.leftKey) {
          // [1]
          promises.push(r.table(join.link).getAll(this[join.leftKey], {index: this.getModel().getTableName() + '_' + join.leftKey}).delete().run());
        }
      }

      // nothing to do for "belongsTo"
    });

    util.loopKeys(this._getModel()._reverseJoins, (reverseJoins, field) => {
      let join = reverseJoins[field];
      let joinedModel = join.model; // model where belongsTo/hasAndBelongsToMany was called

      if (join.type === 'belongsTo') {
        // What was called is joinedModel.belongsTo(this, fieldDoc, leftKey, rightKey)
        promises.push(r.table(joinedModel.getTableName()).getAll(this[join.rightKey], {index: join.leftKey}).replace(doc => {
          return doc.without(join.leftKey);
        }).run());
      } else if (join.type === 'hasAndBelongsToMany') {
        // Purge only if the key is a primary key
        // What was called is joinedModel.hasAndBelongsToMany(this, fieldDoc, leftKey, rightKey)
        if (this.getModel()._getModel()._pk === join.leftKey) {
          promises.push(r.table(join.link).getAll(this[join.rightKey], {index: this.getModel().getTableName() + '_' + join.rightKey}).delete().run());
        }
      }
      // nothing to do for "belongsTo"
    });

    // Delete itself
    promises.push(this.delete());

    return Promise.all(promises)
      .return(this)
      .asCallback(callback);
  }

  removeRelation() {
    let pk = this._getModel()._pk;
    let query = this.getModel().get(this[pk]);
    return query.removeRelation.apply(query, arguments);
  }

  /**
   * Perform a `merge` of `obj` in this document. Extra keys will be removed.
   */
  _merge(obj) {
    util.loopKeys(this, (_self, key) => {
      if ((obj[key] === undefined) && (this._getModel()._joins[key] === undefined)) {
        delete this[key];
      }
    });

    util.loopKeys(obj, (_obj, key) => { this[key] = obj[key]; });
    return this;
  }

  /**
   * Perform a `merge` of `obj` in this document. Extra keys will not be removed.
   */
  merge(_obj) {
    util.loopKeys(_obj, (obj, key) => {
      // Recursively merge only if both fields are objects, else we'll overwrite the field
      if (util.isPlainObject(obj[key]) && util.isPlainObject(this[key])) {
        Document.prototype.merge.call(this[key], obj[key]);
      } else {
        this[key] = obj[key];
      }
    });

    return this;
  }

  /**
   * Set the atom feed and update the document for each change
   */
  _setFeed(feed) {
    this.__proto__._feed = feed; // eslint-disable-line
    this.__proto__._active = true; // eslint-disable-line
    feed.each((err, change) => {
      if (err) {
        this.__proto__._active = false; // eslint-disable-line
        this.emit('error', err);
      } else {
        if (change.new_val === null) {
          // Delete all the fields
          this._merge({});
          this._setOldValue(change.old_val);
          this._setUnSaved();
          this.emit('change', this);
        } else {
          this._merge(change.new_val);
          this._setOldValue(change.old_val);
          this.setSaved();
          this.emit('change', this);
        }
      }
    });
  }

  getFeed() {
    return this.__proto__._feed; // eslint-disable-line
  }

  closeFeed() {
    return this.__proto__._feed.close(); // eslint-disable-line
  }

  /**
   * Have the model emit 'retrieved' with the current document and
   * recurse to have all joined models do the same.
   */
  _emitRetrieve() {
    this.getModel().emit('retrieved', this);
    util.loopKeys(this._getModel()._joins, (joins, key) => {
      if ((joins[key].type === 'hasOne') || (joins[key].type === 'belongsTo')) {
        if ((this[key] != null) && (typeof this[key]._emitRetrieve === 'function')) { // eslint-disable-line
          this[key]._emitRetrieve();
        }
      } else if ((joins[key].type === 'hasMany') || (joins[key].type === 'hasAndBelongsToMany')) {
        if (Array.isArray(this[key])) {
          for (let i = 0, ii = this[key].length; i < ii; ++i) {
            if (typeof this[key][i]._emitRetrieve === 'function') {
              this[key][i]._emitRetrieve();
            }
          }
        }
      }
    });
  }
}

module.exports = Document;
