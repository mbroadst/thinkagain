'use strict';

class TypeAny {
  constructor() {
    this._default = undefined;
    this._validator = undefined;
    this._options = {};
  }

  default(fnOrValue) { this._default = fnOrValue; }
  validator(fn) { this._validator = fn; }

  // Dummy methods, just to allow users to easily switch from a valid type to any
  options(options) { return this; }
  optional() { return this; }
  required() { return this; }
  allowNull() { return this; }
  min() { return this; }
  max() { return this; }
  length() { return this; }
  schema() { return this; }
  validate() { return this; }

  _getDefaultFields(prefix, defaultFields, virtualFields) {}
}

module.exports = TypeAny;
