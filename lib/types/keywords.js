'use strict';
const r = require('rethinkdbdash')({ pool: false, cursor: true });
let keywords = module.exports = {};

class Point {
  constructor(data) {
    if (Array.isArray(data)) {
      return r.point.apply(null, data);
    }

    if (data.hasOwnProperty('longitude') && data.hasOwnProperty('latitude')) {
      return r.point(data.longitude, data.latitude);
    }

    if (data.hasOwnProperty('type') && data.hasOwnProperty('coordinates') &&
        Array.isArray(data.coordinates) && !data.hasOwnProperty('$reql_type$')) {
      return r.geojson(data);
    }

    return data;
  }
}

const CLASSES = {
  Buffer: Buffer,
  Date: Date,
  Function: Function,
  Point: Point,
  RegExp: RegExp
};

keywords.instanceOf = {
  compile: schema => {
    let Class = CLASSES[schema];
    return (data, path, parent) => data instanceof Class;
  }
};

const KNOWN_TYPES =
  ['undefined', 'string', 'number', 'object', 'function', 'boolean', 'symbol'];

keywords.typeOf = {
  compile: (schema) => {
    if (typeof schema !== 'string' || KNOWN_TYPES.indexOf(schema) === -1) {
      throw new Error('invalid "typeof" keyword value');
    }

    return data => typeof data === schema;
  }
};

const indexRx = /\[([0-9]+)\]/g;
function findArrayIndex(path) {
  let indices = [];
  path.replace(indexRx, (i, j) => indices.push(j));
  return indices[indices.length - 1];
}

keywords.coerceTo = {
  errors: true,
  compile: function coercionFn(schema) {
    let Class = CLASSES[schema];
    return (data, path, parent) => {
      if (Class === undefined) {
        coercionFn.errors = 'invalid type specified for coercion: ' + schema;
        return false;
      }

      if (data instanceof Class) return true;
      if (parent === undefined || typeof data === 'function') return false;

      try {
        if (Array.isArray(parent)) {
          let idx = findArrayIndex(path);
          parent[idx] = new Class(data);
        } else {
          parent[path.slice(1)] = new Class(data);
        }

        return true;
      } catch (e) {
        coercionFn.errors = e;
        return false;
      }
    };
  }
};

const inlineTermValidator = (it, keyword, schema) => {
  return `
    let $data = data${it.dataLevel || ''};
    if (typeof $data === 'function' && $data.hasOwnProperty('_query')) {
      vErrors = [];
      errors = 0;
    }
  `;
};

keywords.acceptTerms = {
  errors: 'full',
  statements: true,
  inline: inlineTermValidator
};
