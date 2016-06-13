'use strict';
const TestFixture = require('./test-fixture'),
      Errors = require('../lib/errors'),
      util = require('./util'),
      assert = require('assert'),
      expect = require('chai').expect;

let test = new TestFixture();
describe('types', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('coerceTo', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; });

    it('should generate an error on invalid type', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string', coerceTo: 'invalid' } }
      }, { init: false });

      let doc = new Model({ id: 'llama' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validation failed');
    });
  });

  describe('Date', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; });

    it('should accept Date objects', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { $ref: 'date' }
        }
      });

      let t = new Model({ id: util.s8(), date: new Date() });
      return t.save()
        .then(result => {
          assert(t.date instanceof Date);
          assert.equal(t.date.getYear(), new Date().getYear());
          return Model.get(t.id).execute({ timeFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.date), '[object Object]');
          assert.equal(result.date.$reql_type$, 'TIME');
        });
    });

    it('should should coerce strings to ReQL dates', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { $ref: 'date' }
        }
      });

      let t = new Model({ id: util.s8(), date: (new Date()).toISOString() });
      return t.save()
        .then(result => {
          assert(t.date instanceof Date);
          assert.equal(t.date.getYear(), new Date().getYear());
          return Model.get(t.id).execute({ timeFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.date), '[object Object]');
          assert.equal(result.date.$reql_type$, 'TIME');
        });
    });

    it('should coerce strings in an array to ReQL dates', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          array: {
            type: 'array',
            items: { $ref: 'date' }
          }
        }
      });

      let t = new Model({ id: util.s8(), array: [ (new Date()).toISOString() ] });
      return t.save()
        .then(result => {
          assert(t.array[0] instanceof Date);
          assert.equal(t.array[0].getYear(), new Date().getYear());
          return Model.get(t.id).execute({ timeFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.array[0]), '[object Object]');
          assert.equal(result.array[0].$reql_type$, 'TIME');
        });
    });

    it('should coerce numbers to ReQL dates', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { $ref: 'date' }
        }
      });

      let t = new Model({ id: util.s8(), date: Date.now() });
      return t.save()
        .then(result => {
          assert(t.date instanceof Date);
          return Model.get(t.id).execute({ timeFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.date), '[object Object]');
          assert.equal(result.date.$reql_type$, 'TIME');
        });
    });

    it('should accept r.now()', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { $ref: 'date' }
        }
      });

      let r = test.r;
      let t = new Model({ id: util.s8(), date: r.now() });
      return t.save()
        .then(result => {
          assert(t.date instanceof Date);
          assert.equal(t.date.getYear(), new Date().getYear());
          return Model.get(t.id).execute({ timeFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.date), '[object Object]');
          assert.equal(result.date.$reql_type$, 'TIME');
        });
    });
  }); // Date

  describe('Point', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; });

    it('Points as array should be coerced to ReQL points', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          loc: { $ref: 'point' }
        }
      });

      let t = new Model({ id: util.s8(), loc: [1, 1] });
      return t.save()
        .then(result => Model.get(t.id).execute())
        .then(result => {
          assert.equal(t.loc.$reql_type$, 'GEOMETRY');
          assert.equal(t.loc.type, 'Point');
          assert(Array.isArray(t.loc.coordinates));
        });
    });

    it('Raw ReQL points should work', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          loc: { $ref: 'point' }
        }
      });

      let t = new Model({
        id: util.s8(),
        loc: {
          '$reql_type$': 'GEOMETRY',
          coordinates: [ 1, 2 ],
          type: 'Point'
        }
      });

      return t.save()
        .then(result => Model.get(t.id).execute())
        .then(result => {
          assert.equal(t.loc.$reql_type$, 'GEOMETRY');
          assert.equal(t.loc.type, 'Point');
          assert(Array.isArray(t.loc.coordinates));
        });
    });

    it('Points as objects should be coerced to ReQL points', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          loc: { $ref: 'point' }
        }
      });

      let t = new Model({ id: util.s8(), loc: { latitude: 1, longitude: 2 } });
      return t.save()
        .then(result => Model.get(t.id).execute())
        .then(result => {
          assert.equal(t.loc.$reql_type$, 'GEOMETRY');
          assert(Array.isArray(t.loc.coordinates));
        });
    });

    it('Points as geojson should be coerced to ReQL points', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          loc: { $ref: 'point' }
        }
      });

      let t = new Model({ id: util.s8(), loc: { type: 'Point', coordinates: [1, 2] } });
      return t.save()
        .then(result => Model.get(t.id).execute())
        .then(result => {
          assert.equal(t.loc.$reql_type$, 'GEOMETRY');
          assert(Array.isArray(t.loc.coordinates));
        });
    });
  }); // Point

  describe('Binary', function() {
    after(() => { delete test.Model; });
    before(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          buf: { $ref: 'binary' }
        }
      });
    });

    it('should support raw binary types', function() {
      let t = new test.Model({
        id: util.s8(),
        buf: {
          $reql_type$: 'BINARY',
          data: (new Buffer('hello')).toString('base64')
        }
      });

      return t.save()
        .then(result => {
          assert(t.buf instanceof Buffer);
          return test.Model.get(t.id).execute({ binaryFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.buf), '[object Object]');
          assert.equal(result.buf.$reql_type$, 'BINARY');
        });
    });

    it('should coerce strings to r.binary', function() {
      let t = new test.Model({ id: util.s8(), buf: (new Buffer('hello')).toString('base64') });
      return t.save()
        .then(result => {
          assert(t.buf instanceof Buffer);
          return test.Model.get(t.id).execute({ binaryFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.buf), '[object Object]');
          assert.equal(result.buf.$reql_type$, 'BINARY');
        });
    });

    it('should coerce Buffers to r.binary', function() {
      let t = new test.Model({ id: util.s8(), buf: new Buffer([1, 2, 3]) });
      return t.save()
        .then(result => {
          assert(t.buf instanceof Buffer);
          return test.Model.get(t.id).execute({ binaryFormat: 'raw' });
        })
        .then(result => {
          assert.equal(Object.prototype.toString.call(result.buf), '[object Object]');
          assert.equal(result.buf.$reql_type$, 'BINARY');
        });
    });
  });


  // it('Number as string should be coerced to number', function() {
  //   let Model = test.thinkagain.createModel(test.table(0), {
  //     type: 'object',
  //     properties: {
  //       id: { type: 'string' },
  //       number: { type: 'number' }
  //     }
  //   });

  //   let t = new Model({
  //     id: util.s8(),
  //     number: '123456'
  //   });

  //   return t.save()
  //     .then(result => Model.get(t.id).execute())
  //     .then(result => {
  //       assert.equal(typeof t.number, 'number');
  //       assert.equal(t.number, 123456);
  //     });
  // });
});

