'use strict';
const r = require('rethinkdbdash')({ pool: false, cursor: true });

let keywords = module.exports = {};

class Binary {
  constructor(data) {
    if (data instanceof Buffer) {
      return r.binary(data);
    }

    return r.binary(new Buffer(data));
  }
}

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
  Binary: Binary,
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

const indexRx = /\[([0-9]+)\]/g;
function findArrayIndex(path) {
  let indices = [];
  path.replace(indexRx, (i, j) => indices.push(j));
  return indices[indices.length - 1];
}

keywords.coerceTo = {
  errors: true,
  compile: schema => {
    let Class = CLASSES[schema];
    return (data, path, parent) => {
      if (Class === undefined) {
        this.errors = [ 'invalid type specified for coercion: ' + schema ];
        return false;
      }

      if (data instanceof Class) return true;
      if (parent === undefined || typeof data === 'function') {
        this.errors = [ 'cant coerce raw values' ];
        return false;
      }

      try {
        let newData = new Class(data);
        if (schema === 'Date' && isNaN(newData)) {
          throw new Error('invalid date: ' + data);
        }

        if (Array.isArray(parent)) {
          let idx = findArrayIndex(path);
          parent[idx] = newData;
        } else {
          parent[path.slice(1)] = newData;
        }

        return true;
      } catch (error) {
        this.errors = [ error ];
        return false;
      }
    };
  }
};

const inlineTermValidator = (it, keyword, schema) => {
  return `
    if (typeof data${it.dataLevel || ''} === 'function' && data${it.dataLevel || ''}.hasOwnProperty('_query')) {
      vErrors = [];
      errors = 0;
      return true;
    }
  `;
};

keywords.acceptTerms = {
  errors: 'full',
  statements: true,
  inline: inlineTermValidator
};
