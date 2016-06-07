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
    return (data, path, parent) => {
      // console.log('[instanceOf] data instanceOf ', schema, ' ? ', data instanceof Class);
      return data instanceof Class;
    };
  }
};

keywords.coerceTo = {
  errors: true,
  compile: function coercionFn(schema) {
    let Class = CLASSES[schema];
    return (data, path, parent) => {
      if (data instanceof Class) return true;

      try {
        parent[path.slice(1)] = new Class(data);
        return true;
      } catch (e) {
        coercionFn.errors = e;
        return false;
      }
    };
  }
};
