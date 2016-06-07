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
  Date: Date,
  Buffer: Buffer,
  RegExp: RegExp,
  Point: Point
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
  path.replace(indexRx, (g0, g1) => indices.push(g1));
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
