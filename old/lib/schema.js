'use strict';
let arrayPrefix = '__array';
module.exports.arrayPrefix = arrayPrefix;

const Errors = require('./errors'),
      type = require('./type'),
      util = require('./util');

function generateVirtual(doc, defaultField, originalDoc, virtual) {
  let path = defaultField.path;
  let value = defaultField.value;
  let field = doc;

  let keepGoing = true;
  let virtualValue = virtual;

  for (let j = 0, jj = path.length - 1; j < jj; ++j) {
    if (util.isPlainObject(virtualValue)) {
      virtualValue = virtualValue[path[j]];
    } else {
      virtualValue = undefined;
    }

    if (path[j] === arrayPrefix) {
      if (!Array.isArray(field)) {
        // This is caught by validate, except if there is an `enforce_type: "none"`.
        return;
      }

      for (let k = 0, kk = field.length; k < kk; ++k) {
        if (virtual != null) { // eslint-disable-line
          virtualValue = virtual[k];
        }
        generateVirtual(field[k], {path: defaultField.path.slice(j + 1), value: defaultField.value}, this, virtualValue);
      }

      keepGoing = false;
    } else {
      // field cannot be undefined (doc is not undefined on the first iteration, and we'll return if it becomes undefined
      field = field[path[j]];
      if (field === undefined) {
        // We do not populate parent of default fields by default
        return;
      }
    }
  }
  if (keepGoing) {
    if (value === undefined) {
      if (util.isPlainObject(virtualValue) && (virtualValue[[path[path.length - 1]]] !== undefined)) {
        field[path[path.length - 1]] = virtualValue[[path[path.length - 1]]];
      }
    } else if ((typeof value === 'function') && !Array.isArray(value._query)) {
      field[path[path.length - 1]] = value.call(doc);
    } else {
      if (util.isPlainObject(value)) {
        field[path[path.length - 1]] = util.deepCopy(value);
      } else if (value !== undefined) {
        field[path[path.length - 1]] = value;
      }
    }
  }
  return doc;
}

module.exports.generateVirtual = generateVirtual;

function generateDefault(doc, defaultField, originalDoc) {
  let path = defaultField.path;
  let value = defaultField.value;
  let field = doc;

  let keepGoing = true;
  for (let j = 0, jj = path.length - 1; j < jj; ++j) {
    if (path[j] === arrayPrefix) {
      if (!Array.isArray(field)) {
        // This is caught by validate, except if there is an `enforce_type: "none"`.
        return;
      }

      for (let k = 0, kk = field.length; k < kk; ++k) {
        generateDefault(field[k], {path: defaultField.path.slice(j + 1), value: defaultField.value}, this);
      }
      keepGoing = false;
    } else {
      field = field[path[j]];
      if (field === undefined) {
        // We do not populate parent of default fields by default
        return;
      }
    }
  }

  if (keepGoing && util.isPlainObject(field) && field[path[path.length - 1]] === undefined) {
    if ((typeof value === 'function') && !Array.isArray(value._query)) {
      field[path[path.length - 1]] = value.call(doc);
    } else {
      if (util.isPlainObject(value) || Array.isArray(value)) {
        field[path[path.length - 1]] = util.deepCopy(value);
      } else {
        field[path[path.length - 1]] = value;
      }
    }
  }

  return doc;
}

module.exports.generateDefault = generateDefault;

function parse(schema, prefix, options, model) {
  let result;

  if ((prefix === '') && (type.isObject(schema) === false) && (util.isPlainObject(schema) === false)) {
    throw new Errors.ValidationError('The schema must be a plain object.');
  }

  // Validate a schema and add the field _enum if needed
  if (util.isPlainObject(schema)) {
    if (schema._type !== undefined) {
      options = util.mergeOptions(options, schema.options);
      switch (schema._type) {
      case String:
        result = type.string().options(options).validator(schema.validator).enum(schema.enum);
        if (schema.default !== undefined) { result.default(schema.default); }
        if (typeof schema.min === 'number') { result.min(schema.min); }
        if (typeof schema.max === 'number') { result.max(schema.max); }
        if (typeof schema.length === 'number') { result.length(schema.length); }
        if (schema.alphanum === true) { result.alphanum(); }
        if (schema.lowercase === true) { result.lowercase(); }
        if (schema.uppercase === true) { result.uppercase(); }
        if (typeof schema.regex === 'string') { result.regex(schema.regex, schema.flags); }
        return result;
      case Number:
        result = type.number().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        if (typeof schema.min === 'number') { result.min(schema.min); }
        if (typeof schema.max === 'number') { result.max(schema.max); }
        if (typeof schema.length === 'number') { result.length(schema.length); }
        if (schema.integer === true) { result.integer(); }
        return result;
      case Boolean:
        result = type.boolean().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        return result;
      case Date:
        result = type.date().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        if (schema.min instanceof Date) { result.min(schema.min); }
        if (schema.max instanceof Date) { result.max(schema.max); }
        return result;
      case Buffer:
        result = type.buffer().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        return result;
      case Object:
        result = type.object().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        util.loopKeys(schema.schema, function(_schema, key) {
          result.setKey(key, parse(_schema[key], prefix + '[' + key + ']', options));
        });
        if (prefix === '') {
          result._setModel(model);
        }
        return result;
      case Array:
        result = type.array().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        if (schema.schema !== undefined) {
          result.schema(parse(schema.schema, prefix + '[0]', options));
        }
        if (typeof schema.min === 'number') { result.min(schema.min); }
        if (typeof schema.max === 'number') { result.max(schema.max); }
        if (typeof schema.length === 'number') { result.length(schema.length); }
        return result;
      case 'Point':
        result = type.point().options(options).validator(schema.validator);
        if (schema.default !== undefined) { result.default(schema.default); }
        return result;
      case 'virtual':
        result = type.virtual();
        if (schema.default !== undefined) { result.default(schema.default); }
        return result;
      default: // Unknown type
        throw new Errors.ValidationError("The field `_type` must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for " + prefix);
      }
    } else if (type.isString(schema)
        || type.isNumber(schema)
        || type.isBoolean(schema)
        || type.isDate(schema)
        || type.isBuffer(schema)
        || type.isPoint(schema)
        || type.isObject(schema)
        || type.isArray(schema)
        || type.isAny(schema)
        || type.isVirtual(schema)) { // Unknown type
      // Nothing to do here
      if (type.isObject(schema)) {
        parse(schema._schema, prefix, options);
      } else if (type.isArray(schema)) {
        if (schema._schema == undefined) { // eslint-disable-line
          schema._schema = parse(type.any(), prefix, options);
        } else {
          schema._schema = parse(schema._schema, prefix, options);
        }
      }

      // We want to copy the model object here
      if (util.isPlainObject(schema._options) === false) {
        schema.options(options);
      } else if ((schema._options.enforce_extra === undefined)
          || (schema._options.enforce_missing === undefined)
          || (schema._options.enforce_type === undefined)) {
        let newOptions = {};
        newOptions.enforce_missing =
          (schema._options.enforce_missing != null) ? schema._options.enforce_missing : options.enforce_missing; // eslint-disable-line
        newOptions.enforce_extra =
          (schema._options.enforce_extra != null) ? schema._options.enforce_extra : options.enforce_extra; // eslint-disable-line
        newOptions.enforce_type =
          (schema._options.enforce_type != null) ? schema._options.enforce_type : options.enforce_type; // eslint-disable-line
        schema.options(newOptions);
      }
      return schema;
    } else {
      result = type.object().options(options);
      util.loopKeys(schema, function(_schema, key) {
        result.setKey(key, parse(_schema[key], prefix + '[' + key + ']', options));
      });
      if (prefix === '') {
        result._setModel(model);
      }
      return result;
    }
  } else if (Array.isArray(schema)) {
    result = type.array().options(options);
    if (schema.length > 1) {
      throw new Errors.ValidationError('An array in a schema can have at most one element. Found ' + schema.length + ' elements in ' + prefix);
    }

    if (schema.length > 0) {
      result.schema(parse(schema[0], prefix + '[0]', options));
    }
    return result;
  } else if (schema === String) {
    return type.string().options(options);
  } else if (schema === Number) {
    return type.number().options(options);
  } else if (schema === Boolean) {
    return type.boolean().options(options);
  } else if (schema === Date) {
    return type.date().options(options);
  } else if (schema === Buffer) {
    return type.buffer().options(options);
  } else if (schema === Object) {
    return type.object().options(options);
  } else if (schema === Array) {
    return type.array().options(options);
  } else if (schema === 'Point') {
    return type.point().options(options);
  } else if (schema === 'virtual') {
    return type.virtual().options(options);
  } else {
    throw new Errors.ValidationError("The value must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for " + prefix);
  }
}

module.exports.parse = parse;

// The schema doesn't contain joined docs
function validate(doc, schema, prefix, options) {
  schema.validate(doc, prefix, options);
}
module.exports.validate = validate;
