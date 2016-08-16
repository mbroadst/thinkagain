'use strict';
const Ajv = require('ajv'),
      rethinkdbdash = require('rethinkdbdash'),
      Model = require('./model'),
      util = require('./util'),
      keywords = require('./types/keywords'),
      Query = require('./query'),
      Errors = require('./errors');

class ThinkAgain {
  /**
   * Main method, create the default database.
   *
   * @param {Object} options the options for the driver and the future models created.
   *  - `max` {number} The maximum number of connections in the pool, default 1000
   *  - `buffer` {number} The minimum number of connections available in the pool, default 50
   *  - `timeoutError` {number} The wait time before reconnecting in case of an error (in ms), default 1000
   *  - `timeoutGb` {number} How long the pool keep a connection that hasn't been used (in ms), default 60*60*1000
   *  - `timeFormat` {"raw"|"native"}
   */
  constructor(config) {
    config = config || {};
    config.db = config.db || 'test'; // We need the default db to create it.
    this._config = config;

    this._options = {};

    // Format of time objects returned by the database, by default we convert
    // them to JavaScript Dates.
    this._options.timeFormat =
      (config.timeFormat != null) ? config.timeFormat : 'native'; // eslint-disable-line

    // Option passed to each model we are going to create.
    this._options.validate =
      (config.validate != null) ? config.validate : 'onsave'; // eslint-disable-line

    this.r = (config.r === undefined) ? rethinkdbdash(config) : config.r;

    this.Query = Query;
    this.models = {};
    this.ajv = new Ajv({
      ownProperties: true,
      allErrors: true,
      useDefaults: true
      // coerceTypes: true
    });

    // add built-in schemas
    this.ajv.addKeyword('instanceOf', keywords.instanceOf);
    this.ajv.addKeyword('coerceTo', keywords.coerceTo);
    this.ajv.addKeyword('acceptTerms', keywords.acceptTerms);
    this.ajv.addSchema(require('./types/date.json'));
    this.ajv.addSchema(require('./types/point.json'));
    this.ajv.addSchema(require('./types/binary.json'));

    // Export errors
    this.Errors = Errors;

    // Initialize the database.
    this.dbReady().then()
      .error(error => { throw error; });
  }

  /**
   * Initialize our database.
   * @return {Promise=} Returns a promise which will resolve when the database is ready.
   */
  dbReady() {
    if (this._dbReadyPromise) return this._dbReadyPromise;

    const r = this.r;
    this._dbReadyPromise = r.dbCreate(this._config.db).run()
      .error(error => {
        // The `do` is not atomic, we a concurrent query could create the database
        // between the time `dbList` is ran and `dbCreate` is.
        if (error.message.match(/^Database `.*` already exists in/)) {
          return;
        }

        // In case something went wrong here, we do not recover and throw.
        throw error;
      });

    return this._dbReadyPromise;
  }

  /**
   * Return the current option used.
   * @return {object} The global options of the library
   */
  getOptions() {
    return this._options;
  }

  /**
   * Create a model
   *
   * @param {string} name The name of the table used behind this model.
   * @param {object|Type} schema The schema of this model.
   * @param {object=} options Options for this model. The fields can be:
   *  - `init` {boolean} Whether the table should be created or not. The value
   *  `false` is used to speed up testing, and should probably be `true` in
   *  other use cases.
   *  - `timeFormat` {"raw"|"native"} Format of ReQL dates.
   *  - `validate` {"oncreate"|"onsave"}, default "onsave".
   */
  createModel(name, schema, options) {
    // Make a deep copy of the options as the model may overwrite them.
    let fullOptions = util.deepCopy(this._options);
    options = options || {};
    util.loopKeys(options, function(_options, key) {
      fullOptions[key] = options[key];
    });

    // Two models cannot share the same name.
    if (this.models[name] !== undefined) {
      throw new Error('Cannot redefine a Model');
    }

    // inject support for terms into schema
    let _schema = util.copySchemaDefinition(schema, options);

    // add model name to its schema for possible future recompilation
    _schema.id = name;

    // save off a copy of the raw schema before term support injection
    let rawSchema = JSON.parse(JSON.stringify(_schema));
    _schema = util.injectTermSupport(_schema);

    // Create the constructor returned. This will also validate the schema.
    let model = Model.new(name, _schema, fullOptions, this);
    model._schema = rawSchema;

    // Keep a reference of this model.
    this.models[name] = model;
    return model;
  }

  /**
   * Method to clean all the references to the models. This is used to speed up
   * testing and should not be used in other use cases.
   */
  _clean() {
    let modelNames = Object.keys(this.models);
    for (let i = 0, ii = modelNames.length; i < ii; ++i) {
      this.ajv.removeSchema(modelNames[i]);
    }

    this.models = {};
  }
}

// Export the module.
module.exports = function(config) {
  return new ThinkAgain(config);
};

module.exports.schema = {
  keywords: require('./types/keywords'),
  types: {
    binary: require('./types/binary'),
    date: require('./types/date'),
    point: require('./types/point')
  }
};
