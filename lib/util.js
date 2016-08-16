'use strict';
const Promise = require('bluebird'),
      EventEmitter = require('events');

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
    for (let i = 0, ii = value.length; i < ii; ++i) {
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

  for (let i = 0, ii = preHooks.length; i < ii; ++i) {
    preHooks[i].call(doc);
  }

  let result = fn.apply(doc, fnArgs);
  for (let j = 0, jj = postHooks.length; j < jj; ++j) {
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
      Promise.try(() => hooks[hookIndex].call(doc))
        .then(() => executeHooks(hookIndex + 1, hooks, doc, reject, next))
        .error(reject).catch(reject);
    }
  } else {
    next();
  }
}

function loopKeys(obj, fn) {
  if (isPlainObject(obj)) {
    let keys = Object.keys(obj);
    let result;
    for (let i = 0, ii = keys.length; i < ii; ++i) {
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
        for (let i = 0, ii = arguments.length; i < ii; ++i) {
          args[i] = arguments[i];
        }
        fn.apply(self, args);
      };
    }
  });
}
util.bindEmitter = bindEmitter;

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

function toArray(args) {
  return Array.prototype.slice.call(args);
}
util.toArray = toArray;

util.copySchemaDefinition = (schema, options) => {
  options = options || {};
  let result = JSON.parse(JSON.stringify(schema));  // make deep copy first

  // inject an `id` field if not specified, because RethinkDB will
  if (!options.hasOwnProperty('pk') &&
      (!!result && result.hasOwnProperty('properties') &&
        !!result.properties && !result.properties.hasOwnProperty('id'))) {
    result.properties.id = { type: 'string', format: 'uuid' };
  }

  return result;
};

util.injectTermSupport = schema => {
  if (schema.type === 'object') {
    if (!schema.hasOwnProperty('properties')) {
      return schema;
    }

    for (let property in schema.properties) {
      if (schema.properties[property].hasOwnProperty('$ref')) {
        // https://github.com/epoberezkin/ajv/issues/260
        schema.properties[property] = {
          allOf: [ schema.properties[property], { acceptTerms: true } ]
        };
      } else {
        schema.properties[property].acceptTerms = true;
      }
    }
  } else if (schema.type === 'array') {
    if (!schema.hasOwnProperty('items')) {
      return schema;
    }

    if (schema.items.hasOwnProperty('$ref')) {
      // https://github.com/epoberezkin/ajv/issues/260
      schema.items = {
        allOf: [ schema.items, { acceptTerms: true } ]
      };
    } else {
      schema.items.acceptTerms = true;
    }
  }

  return schema;
};
