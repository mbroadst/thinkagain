'use strict';
const Promise = require('bluebird'),
      EventEmitter = require('events').EventEmitter,
      Errors = require('./errors');

let util = module.exports = {};

/**
 * Random useful methods used everywhere.
 */


/**
 * Is `obj` a plain object.
 * @return {boolean}
 */
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}
util.isPlainObject = isPlainObject;

/**
 * Make a "deep copy".
 * The prototype chain is not copied.
 */
function deepCopy(value) {
  let result;
  if (value instanceof Buffer) {
    // isPlainObject(buffer) returns true.
    return new Buffer(value);
  }

  if (isPlainObject(value) === true) {
    result = {};
    loopKeys(value, function(_value, key) {
      if (_value.hasOwnProperty(key)) {
        result[key] = deepCopy(_value[key]);
      }
    });
    return result;
  }

  if (Array.isArray(value)) {
    result = [];
    for (let i = 0; i < value.length; i++) {
      result.push(deepCopy(value[i]));
    }
    return result;
  }

  return value;
}
util.deepCopy = deepCopy;

/**
 * Wrap try/catch for v8
 */
function tryCatch(toTry, handleError) {
  try {
    toTry();
  } catch (err) {
    handleError(err);
  }
}
util.tryCatch = tryCatch;

/**
 * Return a promise if a hook is asynchronous
 * Note: If no hook is asynchronous, `fn` can still be asynchronous in which
 * case we return a promise or undefined
 * @param {Object} options, the arguments are:
 * - preHooks {Array} the methods to execute before the main one
 * - postHooks {Array} the methods to execute after the main one
 * - async {boolean} whether this this hook is asynchronous or not
 * - doc {Document} the document that triggered the hooks
 * - fn {Function} the main function
 * - fnArgs {Array} arguments for `fn`
 * @return {Promise=}
 */
function hook(options) {
  let preHooks = options.preHooks;
  if (Array.isArray(preHooks) === false) {
    preHooks = [];
  }

  let postHooks = options.postHooks;
  if (Array.isArray(postHooks) === false) {
    postHooks = [];
  }

  let doc = options.doc; // We need the doc to set the context of the hooks
  let async = options.async || false;
  let fn = options.fn; // The function that we are hook
  let fnArgs = options.fnArgs;

  if (async === true) {
    return new Promise(function(resolve, reject) {
      _asyncHook({
        resolve: resolve,
        reject: reject,
        preHooks: preHooks,
        postHooks: postHooks,
        doc: doc,
        fn: fn,
        fnArgs: fnArgs
      });
    });
  }

  return _syncHook({
    preHooks: preHooks,
    postHooks: postHooks,
    doc: doc,
    fn: fn,
    fnArgs: fnArgs
  });
}

function _syncHook(args) {
  let preHooks = args.preHooks;
  let postHooks = args.postHooks;
  let fn = args.fn;
  let doc = args.doc;
  let fnArgs = args.fnArgs;

  for (let i = 0; i < preHooks.length; i++) {
    preHooks[i].call(doc);
  }

  let result = fn.apply(doc, fnArgs);
  for (let j = 0; j < postHooks.length; j++) {
    postHooks[j].call(doc);
  }
  return result;
}

function _asyncHook(args) {
  // One of the hook, or the function is asynchronous, so we will
  // always return a promise
  // We only need to keep track of the result return/resolved for fn

  let preHooks = args.preHooks;
  let postHooks = args.postHooks;
  let fn = args.fn;
  let fnArgs = args.fnArgs;
  let doc = args.doc;
  let resolve = args.resolve;
  let reject = args.reject;
  args = args.args;

  let result;

  let nextPost = function() {
    if (typeof resolve === 'function') {
      resolve(result);
    }
    return result;
  };

  let executeMain = function() {
    result = fn.apply(doc, fnArgs);
    if (result instanceof Promise) {
      return result.then(function(res) {
        result = res;
        executeHooks(0, postHooks, doc, reject, nextPost);
      }).error(reject);
    }
    return executeHooks(0, postHooks, doc, reject, nextPost);
  };

  let nextPre = function() {
    tryCatch(executeMain, function(err) {
      return reject(err);
    });
  };
  return executeHooks(0, preHooks, doc, reject, nextPre);
}
util.hook = hook;

function executeHooks(hookIndex, hooks, doc, reject, next) {
  if (hookIndex < hooks.length) {
    if (hooks[hookIndex].length === 1) {
      hooks[hookIndex].call(doc, function(err) {
        if (err) return reject(err);
        executeHooks(hookIndex + 1, hooks, doc, reject, next);
      });
    } else {
      hooks[hookIndex].call(doc);
      executeHooks(hookIndex + 1, hooks, doc, reject, next);
    }
  } else {
    next();
  }
}

function loopKeys(obj, fn) {
  if (isPlainObject(obj)) {
    let keys = Object.keys(obj);
    let result;
    for (let i = 0; i < keys.length; i++) {
      result = fn(obj, keys[i]);
      if (result === false) return;
    }
  }
}
util.loopKeys = loopKeys;

function changeProto(object, newProto) {
  object.__proto__ = newProto; // eslint-disable-line
}
util.changeProto = changeProto;

function recurse(key, joins, modelTo, all, done) {
  return (util.isPlainObject(modelTo) && modelTo.hasOwnProperty(key))
    || ((all === true) && (done[joins[key].model.getTableName()] !== true));
}
util.recurse = recurse;

function bindEmitter(self) {
  util.loopKeys(EventEmitter.prototype, function(emitter, key) {
    let fn = emitter[key];
    if (typeof fn === 'function') {
      self[key] = function() {
        let args = new Array(arguments.length);
        for (let i = 0; i < arguments.length; i++) {
          args[i] = arguments[i];
        }
        fn.apply(self, args);
      };
    }
  });
}
util.bindEmitter = bindEmitter;

function mergeOptions(options, newOptions) {
  if (util.isPlainObject(newOptions)) {
    if (!options) {
      options = {};
    }

    let localOptions = {};
    localOptions.enforce_missing =
      (newOptions.enforce_missing != null) ? newOptions.enforce_missing : options.enforce_missing; // eslint-disable-line
    localOptions.enforce_type =
      (newOptions.enforce_type != null) ? newOptions.enforce_type : options.enforce_type; // eslint-disable-line
    localOptions.enforce_extra =
      (newOptions.enforce_extra != null) ? newOptions.enforce_extra : options.enforce_extra; // eslint-disable-line
    return localOptions;
  }
  return options;
}
util.mergeOptions = mergeOptions;

function extractPrimaryKey(oldValue, newValue, primaryKey) {
  if (oldValue !== null) {
    return oldValue[primaryKey];
  }
  if (newValue !== null) {
    return newValue[primaryKey];
  }
  return undefined;
}
util.extractPrimaryKey = extractPrimaryKey;

function undefinedField(prefix) {
  throw new Errors.ValidationError('Value for ' + prefix + ' must be defined.');
}
util.undefinedField = undefinedField;

const vowels = { a: true, e: true, i: true, o: true, u: true };
function strictType(prefix, expected) {
  if ((expected.length > 0) && (vowels[expected[0]])) {
    throw new Errors.ValidationError('Value for ' + prefix + ' must be an ' + expected + '.');
  }
  throw new Errors.ValidationError('Value for ' + prefix + ' must be a ' + expected + '.');
}
util.strictType = strictType;

function extraField(prefix, key) {
  if (prefix === '') {
    throw new Errors.ValidationError('Extra field `' + key + '` not allowed.');
  }
  throw new Errors.ValidationError('Extra field `' + key + '` in ' + prefix + ' not allowed.');
}
util.extraField = extraField;

function looseType(prefix, expected) {
  if ((expected.length > 0) && (vowels[expected[0]])) {
    throw new Errors.ValidationError('Value for ' + prefix + ' must be an ' + expected + ' or null.');
  }
  throw new Errors.ValidationError('Value for ' + prefix + ' must be a ' + expected + ' or null.');
}
util.looseType = looseType;

function pseudoTypeError(type, missingField, prefix) {
  throw new Errors.ValidationError('The raw ' + type + ' object for ' + prefix + ' is missing the required field ' + missingField + '.');
}
util.pseudoTypeError = pseudoTypeError;

// Return true if doc is undefined, else false
function validateIfUndefined(value, prefix, type, options) {
  if (value === undefined) {
    if (options.enforce_missing === true) {
      undefinedField(prefix);
    }
    return true;
  }
  return false;
}
util.validateIfUndefined = validateIfUndefined;

function toArray(args) {
  return Array.prototype.slice.call(args);
}
util.toArray = toArray;
