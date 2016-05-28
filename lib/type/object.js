'use strict';
const Errors = require('../errors'),
      util = require('../util');

class TypeObject {
  constructor() {
    this._default = undefined;
    this._validator = undefined;
    this._options = {};
    this._schema = {};
  }

  _setModel(model) {
    this._model = model;
    return this;
  }

  options(options) {
    if (util.isPlainObject(options)) {
      if (options.enforce_missing != null) { // eslint-disable-line
        this._options.enforce_missing =  options.enforce_missing;
      }
      if (options.enforce_type != null) { // eslint-disable-line
        this._options.enforce_type = options.enforce_type;
      }
      if (options.enforce_extra != null) { // eslint-disable-line
        this._options.enforce_extra = options.enforce_extra;
      }
    }
    return this;
  }

  optional() {
    this._options.enforce_missing = false;
    return this;
  }

  required() {
    this._options.enforce_missing = true;
    return this;
  }

  allowNull(value) {
    if (this._options.enforce_type === 'strict') {
      if (value === true) {
        this._options.enforce_type = 'loose';
      }
      // else a no-op, strict -> strict
    } else if (this._options.enforce_type !== 'none') {
      // The value is loose or undefined
      if (value === true) {
        this._options.enforce_type = 'loose';
      } else {
        // The default value is loose, so if we call allowNull(false), it becomes strict
        this._options.enforce_type = 'strict';
      }
    }
    // else no op, type.any() is the same as type.any().allowNull(<bool>)
    return this;
  }

  allowExtra(allowed) {
    if (allowed === true) {
      this._options.enforce_extra = 'none';
    } else if (allowed === false) {
      this._options.enforce_extra = 'strict';
    }
    return this;
  }

  removeExtra() {
    this._options.enforce_extra = 'remove';
    return this;
  }

  schema(schema) {
    // Users shouldn't use the deprecated syntax with the chainable one
    // We do not parse the schema as we don't have the current prefix, options etc.
    this._schema = schema;
    return this;
  }

  setKey(key, schema) {
    this._schema[key] = schema;
    return this;
  }

  default(fnOrValue) {
    this._default = fnOrValue;
    return this;
  }

  validator(fn) {
    if (typeof fn === 'function') {
      this._validator = fn;
    }
    return this;
  }

  validate(object, prefix, options) {
    let localOptions = util.mergeOptions(this._options, options);

    if (util.validateIfUndefined(object, prefix, 'object', localOptions)) return;

    if ((typeof this._validator === 'function') && (this._validator(object) === false)) {
      throw new Errors.ValidationError('Validator for the field ' + prefix + ' returned `false`.');
    }

    if ((typeof object === 'function') && (object._query !== undefined)) {
      // We do not check ReQL terms
    } else if (util.isPlainObject(object) === false) {
      if (localOptions.enforce_type === 'strict') {
        util.strictType(prefix, 'object');
      } else if ((localOptions.enforce_type === 'loose') && (object !== null)) {
        util.looseType(prefix, 'object');
      }
    } else {
      util.loopKeys(this._schema, function(schema, key) {
        schema[key].validate(object[key], prefix + '[' + key + ']', options);
      });

      // We clean extra fields in validate, for a use case, see:
      // https://github.com/neumino/thinky/pull/123#issuecomment-56254682
      if (localOptions.enforce_extra === 'remove') {
        util.loopKeys(object, (obj, key) => {
          if ((this._model === undefined || this._model._joins.hasOwnProperty(key) === false)
              && (this._schema[key] === undefined)) {
            delete obj[key];
          }
        });
      } else if (localOptions.enforce_extra === 'strict') {
        util.loopKeys(object, (obj, key) => {
          if ((this._model === undefined || this._model._joins.hasOwnProperty(key) === false)
              && (this._schema[key] === undefined)) {
            util.extraField(prefix, key);
          }
        });
      }
    }
  }

  _getDefaultFields(prefix, defaultFields, virtualFields) {
    if (this._default !== undefined) {
      defaultFields.push({
        path: prefix,
        value: this._default
      });
    }
    if (this._schema !== undefined) {
      util.loopKeys(this._schema, function(_schema, key) {
        if (typeof _schema[key]._getDefaultFields !== 'function') {
          // console.log(_schema);
          // console.log(key);
          // console.log(_schema[key]);
        }
        _schema[key]._getDefaultFields(prefix.concat(key), defaultFields, virtualFields);
      });
    }
  }
}

module.exports = TypeObject;
