'use strict';
const TypeAny = require('./any'),
      TypeArray = require('./array.js'),
      TypeBoolean = require('./boolean.js'),
      TypeBuffer = require('./buffer.js'),
      TypeDate = require('./date.js'),
      TypeNumber = require('./number.js'),
      TypeObject = require('./object.js'),
      TypePoint = require('./point.js'),
      TypeString = require('./string.js'),
      TypeVirtual = require('./virtual.js');

/**
 * Create a new Type that let users create sub-types.
 * @return {Type}
 */
class Type {
  constructor() { }

  /**
   * Create a new TypeAny object
   * @return {TypeAny}
   */
  any() {
    return new TypeAny();
  }

  /**
   * Create a new TypeString object.
   * @return {TypeString}
   */
  string() {
    return new TypeString();
  }

  /**
   * Create a new TypeNumber object.
   * @return {TypeNumber}
   */
  number() {
    return new TypeNumber();
  }

  /**
   * Create a new TypeBoolean object.
   * @return {TypeBoolean}
   */
  boolean() {
    return new TypeBoolean();
  }

  /**
   * Create a new TypeDate object.
   * @return {TypeDate}
   */
  date() {
    return new TypeDate();
  }

  /**
   * Create a new TypeBuffer object.
   * @return {TypeBuffer}
   */
  buffer() {
    return new TypeBuffer();
  }

  /**
   * Create a new TypePoint object.
   * @return {TypePoint}
   */
  point() {
    return new TypePoint();
  }

  /**
   * Create a new TypeObject object.
   * @return {TypeObject}
   */
  object() {
    return new TypeObject();
  }

  /**
   * Create a new TypeArray object.
   * @return {TypeArray}
   */
  array() {
    return new TypeArray();
  }

  /**
   * Create a new TypeVirtual object.
   * @return {TypeVirtual}
   */
  virtual() {
    return new TypeVirtual();
  }

  /**
   * Create a new TypeString object to use as an id.
   * @return {TypeString}
   */
  id() {
    return new TypeString().optional();
  }

  /**
   * Check if the first argument is a TypeString object or not
   * @param {Object} obj The object to check against TypeString.
   * @return {boolean}
   */
  isString(obj) {
    return obj instanceof TypeString;
  }

  /**
   * Check if the first argument is a TypeNumber object or not
   * @param {Object} obj The object to check against TypeNumber.
   * @return {boolean}
   */
  isNumber(obj) {
    return obj instanceof TypeNumber;
  }

  /**
   * Check if the first argument is a TypeBoolean object or not
   * @param {Object} obj The object to check against TypeBoolean.
   * @return {boolean}
   */
  isBoolean(obj) {
    return obj instanceof TypeBoolean;
  }

  /**
   * Check if the first argument is a TypeDate object or not
   * @param {Object} obj The object to check against TypeDate.
   * @return {boolean}
   */
  isDate(obj) {
    return obj instanceof TypeDate;
  }

  /**
   * Check if the first argument is a TypeBuffer object or not
   * @param {Object} obj The object to check against TypeBuffer.
   * @return {boolean}
   */
  isBuffer(obj) {
    return obj instanceof TypeBuffer;
  }

  /**
   * Check if the first argument is a TypePoint object or not
   * @param {Object} obj The object to check against TypePoint.
   * @return {boolean}
   */
  isPoint(obj) {
    return obj instanceof TypePoint;
  }

  /**
   * Check if the first argument is a TypeObject object or not
   * @param {Object} obj The object to check against TypeObject.
   * @return {boolean}
   */
  isObject(obj) {
    return obj instanceof TypeObject;
  }

  /**
   * Check if the first argument is a TypeArray object or not
   * @param {Object} obj The object to check against TypeArray.
   * @return {boolean}
   */
  isArray(obj) {
    return obj instanceof TypeArray;
  }

  /**
   * Check if the first argument is a TypeVirtual object or not
   * @param {Object} obj The object to check against TypeVirtual.
   * @return {boolean}
   */
  isVirtual(obj) {
    return obj instanceof TypeVirtual;
  }

  /**
   * Check if the first argument is a TypeAny object or not
   * @param {Object} obj The object to check against TypeAny.
   * @return {boolean}
   */
  isAny(obj) {
    return obj instanceof TypeAny;
  }
}

module.exports = new Type();
