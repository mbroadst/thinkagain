'use strict';

class TypeVirtual {
  constructor() {
    this._default = undefined;
    this._validator = undefined;
    this._options = {};
  }

  default(fnOrValue) {
    this._default = fnOrValue;
    return this;
  }

  // Dummy functions
  validate() {}
  options() {}
  optional() {}
  required() {}
  allowNull() {}

  _getDefaultFields(prefix, defaultFields, virtualFields) {
    // We keep track of virtual fields even if there is no default value
    virtualFields.push({
      path: prefix,
      value: this._default
    });
  }
}

module.exports = TypeVirtual;
