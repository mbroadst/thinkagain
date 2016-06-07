'use strict';
const Errors = require('../errors'),
      util = require('../util');

class TypeBoolean {
  constructor() {
    this._default = undefined;
    this._validator = undefined;
    this._options = {};
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

  validate(bool, prefix, options) {
    options = util.mergeOptions(this._options, options);

    if (util.validateIfUndefined(bool, prefix, 'boolean', options)) return;

    if ((typeof this._validator === 'function') && (this._validator(bool) === false)) {
      throw new Errors.ValidationError('Validator for the field ' + prefix + ' returned `false`.');
    }

    if (typeof bool !== 'boolean') {
      if (options.enforce_type === 'strict') {
        util.strictType(prefix, 'boolean');
      } else if ((options.enforce_type === 'loose') && (bool !== null)) {
        util.looseType(prefix, 'boolean');
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
  }
}

module.exports = TypeBoolean;
