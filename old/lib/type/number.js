'use strict';
const Errors = require('../errors'),
      util = require('../util');

class TypeNumber {
  constructor() {
    this._min = -1;
    this._max = -1;
    this._integer = false;
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

  min(min) {
    if (min < 0) {
      throw new Errors.ValidationError('The value for `min` must be a positive integer');
    }
    this._min = min;
    return this;
  }

  max(max) {
    if (max < 0) {
      throw new Errors.ValidationError('The value for `max` must be a positive integer');
    }
    this._max = max;
    return this;
  }

  integer() {
    this._integer = true;
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

  validate(number, prefix, options) {
    options = util.mergeOptions(this._options, options);

    if (util.validateIfUndefined(number, prefix, 'number', options)) return;

    if ((typeof this._validator === 'function') && (this._validator(number) === false)) {
      throw new Errors.ValidationError('Validator for the field ' + prefix + ' returned `false`.');
    }

    if (typeof number === 'string') {
      let numericString = parseFloat(number);
      if (!isNaN(numericString)) {
        number = numericString;
      }
    }

    if ((typeof number === 'function') && (number._query !== undefined)) {
      // We do not check ReQL terms
    } else if ((typeof number !== 'number') || (isFinite(number) === false)) {
      if (options.enforce_type === 'strict') {
        util.strictType(prefix, 'finite number');
      } else if ((options.enforce_type === 'loose') && (number !== null)) {
        util.looseType(prefix, 'finite number');
      }
    } else {
      if ((this._min !== -1) && (this._min > number)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must be greater than ' + this._min + '.');
      }
      if ((this._max !== -1) && (this._max < number)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must be less than ' + this._max + '.');
      }
      if ((this._integer === true) && (number % 1 !== 0)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must be an integer.');
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

module.exports = TypeNumber;
