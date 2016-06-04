'use strict';
let keywords = module.exports = {};

const CLASSES = {
  Date: Date,
  Buffer: Buffer,
  RegExp: RegExp
};

keywords.instanceOf = {
  compile: schema => {
    let Class = CLASSES[schema];
    return (data, path, parent) => {
      console.log('[instanceOf] data instanceOf ', schema, ' ? ', data instanceof Class);
      return data instanceof Class;
    };
  }
};

keywords.coerceTo = {
  compile: schema => {
    let Class = CLASSES[schema];
    return (data, path, parent) => {
      if (data instanceof Class) return true;

      try {
        parent.date = new Class(data);
        data = new Class(data);
        console.log('[coerceTo] isDate? ', data instanceof Date);
        return true;
      } catch (e) {
        console.log('coercion error: ', e);
        return false;
      }
    };
  }
};

keywords.noop = {
  compile: schema => {
    return (data, path, parent) => {
      console.log('noop: ', data);
      return true;
    };
  }
};
