'use strict';
const util = require('../util'),
      schema = require('../schema'),
      arrayPrefix = schema.arrayPrefix,
      Errors = require('../errors');

class TypeArray {
  constructor() {
    this._min = -1;
    this._max = -1;
    this._length = -1;
    this._schema = undefined;
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

  length(length) {
    if (length < 0) {
      throw new Errors.ValidationError('The value for `length` must be a positive integer');
    }
    this._length = length;
    return this;
  }

  schema(_schema) {
    this._schema = _schema;
    return this;
  }

  default(fnOrValue) {
    this._default = fnOrValue;
    return this;
  }

  validator(fn) {
    this._validator = fn;
    return this;
  }

  validate(array, prefix, options) {
    let localOptions = util.mergeOptions(this._options, options);
    if (util.validateIfUndefined(array, prefix, 'array', localOptions)) return;

    if ((typeof this._validator === 'function') && (this._validator(array) === false)) {
      throw new Errors.ValidationError('Validator for the field ' + prefix + ' returned `false`.');
    }

    if ((typeof array === 'function') && (array._query !== undefined)) {
      // We do not check ReQL terms
    } else if (Array.isArray(array) === false) {
      if (localOptions.enforce_type === 'strict') {
        util.strictType(prefix, 'array');
      } else if ((localOptions.enforce_type === 'loose') && (array !== null)) {
        util.looseType(prefix, 'array');
      }
    } else {
      if ((this._min !== -1) && (this._min > array.length)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must have at least ' + this._min + ' elements.');
      }
      if ((this._max !== -1) && (this._max < array.length)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must have at most ' + this._max + ' elements.');
      }
      if ((this._length !== -1) && (this._length !== array.length)) {
        throw new Errors.ValidationError('Value for ' + prefix + ' must be an array with ' + this._length + ' elements.');
      }

      for (let i = 0, ii = array.length; i < ii; ++i) {
        if (array[i] === undefined) {
          throw new Errors.ValidationError('The element in the array ' + prefix + ' (position ' + i + ') cannot be `undefined`.');
        }
        if (this._schema !== undefined) {
          this._schema.validate(array[i], prefix + '[' + i + ']', options);
        }
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
      this._schema._getDefaultFields(prefix.concat(arrayPrefix), defaultFields, virtualFields);
    }
  }

}

module.exports = TypeArray;
