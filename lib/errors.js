'use strict';
const util = require('util');
let errors = module.exports = {};

/**
 * The base error that all thinkagain related errors derive from
 *
 * @constructor
 * @alias Error
 */
errors.ThinkAgainError = function(message, parent) {
  let tmp = Error.apply(this, arguments);
  tmp.name = this.name = 'ThinkAgainError';

  this.message = tmp.message;
  if (!!parent) this.parent = parent;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }

  // so we can catch these with bluebird's `.error` handler
  Object.defineProperty(this, 'isOperational', {
    value: true, enumerable: false, writable: false, configurable: false
  });
};
util.inherits(errors.ThinkAgainError, Error);

/**
 * Thrown or returned when `get` returns `null`.
 * @extends ThinkAgainError
 */
errors.DocumentNotFound = function(message) {
  let errorMessage = message || 'The query did not find a document and returned null.';
  errors.ThinkAgainError.call(this, errorMessage);
  this.name = 'DocumentNotFoundError';
};
util.inherits(errors.DocumentNotFound, errors.ThinkAgainError);

/**
 * Thrown or returned when an in place update/replace returns an invalid document.
 * @extends ThinkAgainError
 */
errors.InvalidWrite = function(message, raw) {
  errors.ThinkAgainError.call(this, message);
  this.name = 'InvalidWriteError';
  this.raw = raw;
};
util.inherits(errors.InvalidWrite, errors.ThinkAgainError);

/**
 * Thrown or returned when validation of a document fails.
 * @extends ThinkAgainError
 */
errors.ValidationError = function(message, validationErrors) {
  if (Array.isArray(message)) {
    validationErrors = message;
    message = 'Validation failed';
  }

  errors.ThinkAgainError.call(this, message);
  this.name = 'ValidationError';
  this.errors = validationErrors;
};
util.inherits(errors.ValidationError, errors.ThinkAgainError);

/**
 * Thrown or returned when the primary key unique document constraint fails.
 * @extends ThinkAgainError
 */
errors.DuplicatePrimaryKey = function(message, primaryKey) {
  errors.ThinkAgainError.call(this, message);
  this.name = 'DuplicatePrimaryKeyError';
  if (primaryKey !== undefined) {
    this.primaryKey = primaryKey;
  }
};
util.inherits(errors.DuplicatePrimaryKey, errors.ThinkAgainError);

/**
 * regular expressions used to determine which errors should be thrown
 */
errors.DOCUMENT_NOT_FOUND_REGEX = new RegExp('^The query did not find a document and returned null.*');
errors.DUPLICATE_PRIMARY_KEY_REGEX = new RegExp('^Duplicate primary key `(.*)`.*');

/**
 * Creates an appropriate error given either an instance of Error or a message
 * from the RethinkDB driver
 */
errors.create = function(errorOrMessage) {
  let message = (errorOrMessage instanceof Error) ? errorOrMessage.message : errorOrMessage;
  if (message.match(errors.DOCUMENT_NOT_FOUND_REGEX)) {
    return new errors.DocumentNotFound(message);
  } else if (message.match(errors.DUPLICATE_PRIMARY_KEY_REGEX)) {
    let primaryKey = message.match(errors.DUPLICATE_PRIMARY_KEY_REGEX)[1];
    return new errors.DuplicatePrimaryKey(message, primaryKey);
  } else if (errorOrMessage instanceof Error) {
    return errorOrMessage;
  }

  return new errors.ThinkAgainError(errorOrMessage);
};
