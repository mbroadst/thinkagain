'use strict';
const TestFixture = require('./test-fixture'),
      type = require('../lib/type'),
      Errors = require('../lib/errors'),
      util = require('./util'),
      assert = require('assert'),
      expect = require('chai').expect;

/* eslint-disable no-unused-vars */

let test = new TestFixture();
describe('schema', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('schema', function() {
    it('String', function() {
      test.thinky.createModel(test.table(), {id: String}, {init: false});
    });

    it('Number', function() {
      test.thinky.createModel(test.table(), {id: Number}, {init: false});
    });

    it('Boolean', function() {
      test.thinky.createModel(test.table(), {id: Boolean}, {init: false});
    });

    it('Array', function() {
      test.thinky.createModel(test.table(), {id: Array}, {init: false});
    });

    it('Object', function() {
      test.thinky.createModel(test.table(), {id: Object}, {init: false});
    });

    it('String - 2', function() {
      test.thinky.createModel(test.table(), {id: {_type: String}}, {init: false});
    });

    it('Number - 2', function() {
      test.thinky.createModel(test.table(), {id: {_type: Number}}, {init: false});
    });

    it('Boolean', function() {
      test.thinky.createModel(test.table(), {id: {_type: Boolean}}, {init: false});
    });

    it('Array', function() {
      test.thinky.createModel(test.table(), {id: {_type: Array}}, {init: false});
    });

    it('Object', function() {
      test.thinky.createModel(test.table(), {id: {_type: Object}}, {init: false});
    });

    it('Non valid value - 1', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: 1}, {init: false});
      } catch (err) {
        assert.equal(err.message, "The value must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for [id]");
        done();
      }
    });

    it('Non valid value - undefined', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: undefined}, {init: false});
      } catch (err) {
        assert.equal(err.message, "The value must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for [id]");
        done();
      }
    });

    it('Empty object is valid', function() {
      test.thinky.createModel(test.table(), {id: {}}, {init: false});
    });

    it('Non valid value - nested 1', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: {bar: 2}}, {init: false});
      } catch (err) {
        assert.equal(err.message, "The value must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for [id][bar]");
        done();
      }
    });

    it('Empty array is valid', function() {
      test.thinky.createModel(test.table(), {id: []}, {init: false});
    });

    it('Array of length > 1 should throw', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: [{bar: String}, {foo: String}]}, {init: false});
      } catch (err) {
        assert.equal(err.message, 'An array in a schema can have at most one element. Found 2 elements in [id]');
        done();
      }
    });

    it('Array of length 1 with class is valid - String', function() {
      test.thinky.createModel(test.table(), {id: [String]}, {init: false});
    });

    it('Array of length 1 with class is valid - Boolean', function() {
      test.thinky.createModel(test.table(), {id: [Boolean]}, {init: false});
    });

    it('Array of length 1 with class is valid - Number', function() {
      test.thinky.createModel(test.table(), {id: [Number]}, {init: false});
    });

    it('Array of length 1 with class is valid - Object', function() {
      test.thinky.createModel(test.table(), {id: [Object]}, {init: false});
    });

    it('Array of length 1 with class is valid - Array', function() {
      test.thinky.createModel(test.table(), {id: [Array]}, {init: false});
    });

    it('Array of Array', function() {
      test.thinky.createModel(test.table(), {id: [[String]]}, {init: false});
    });

    it('Object in Object', function() {
      test.thinky.createModel(test.table(), {id: {foo: {bar: String}}}, {init: false});
    });

    it('Object in Object - non valid type - 1', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: {foo: {bar: 1}}}, {init: false});
        done(new Error('Expecting error'));
      } catch (err) {
        assert.equal(err.message, "The value must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for [id][foo][bar]");
        done();
      }
    });

    it('Object in Object - non valid type - 2', function(done) {
      try {
        test.thinky.createModel(test.table(), {id: {foo: {bar: {_type: 1}}}}, {init: false});
        done(new Error('Expecting error'));
      } catch (err) {
        assert.equal(err.message, "The field `_type` must be `String`/`Number`/`Boolean`/`Date`/`Buffer`/`Object`/`Array`/`'virtual'`/`'Point'` for [id][foo][bar]");
        done();
      }
    });

    it('Object in Object - non valid type - 3', function(done) {
      try {
        test.thinky.createModel(test.table(), 1, {init: false});
        done(new Error('Expecting error'));
      } catch (err) {
        assert.equal(err.message, 'The schema must be a plain object.');
        done();
      }
    });
  });

  describe('Chainable types', function() {
    // Chainable types were added in 1.15.3, prior tests still validates options and such.
    // These tests are mostly for new validators like `min`/`max`/`alphanum`/etc.
    it('General - chainable types in nested schemas', function() {
      let Model = test.thinky.createModel(test.table(),
      {id: type.string(),
        objectArray: [{ myAttribute: type.object() }]});
      let doc = new Model({ id: util.s8(), objectArray: {} });
    });

    it('String - basic - valid string', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string()},
        {init: false});
      let doc = new Model({ id: util.s8() });
    });

    it('String - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string()},
        {init: false});

      let doc = new Model({ id: 1 });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string or null.');
    });

    it('String - basic - null', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string()},
        {init: false});
      let doc = new Model({});
      doc.validate();
    });

    it('String - basic - null and strict - deprecated', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().options({enforce_type: 'strict'})},
        {init: false});

      let doc = new Model({ id: null});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string.');
    });

    it('String - basic - null and strict', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().allowNull(false)},
        {init: false});

      let doc = new Model({ id: null});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string.');
    });

    it('String - basic - null and strict', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().allowNull(false)},
        {init: false});

      let doc = new Model({ id: null});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string.');
    });

    it('String - basic - undefined', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().allowNull(false)},
        {init: false});
      let doc = new Model({});
      doc.validate();
    });

    it('String - basic - undefined - enforce_missing: strict', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().required()},
        {init: false});

      let doc = new Model({});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be defined.');
    });

    it('String - r.uuid', function() {
      let r = test.r;
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().default(r.uuid())},
        {init: false});
      let doc = new Model({});
      doc.validate();
    });

    it('String - min - too short', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().min(2) },
        {init: false});

      let doc = new Model({ id: 'a'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be longer than 2.');
    });

    it('String - min - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().min(2) },
        {init: false});
      let doc = new Model({ id: 'abc'});
      doc.validate();
    });

    it('String - max - too long', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().max(5) },
        {init: false});

      let doc = new Model({ id: 'abcdefgh'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be shorter than 5.');
    });

    it('String - max - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().max(5) },
        {init: false});
      let doc = new Model({ id: 'abc'});
      doc.validate();
    });

    it('String - length - too long', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().length(5) },
        {init: false});

      let doc = new Model({ id: 'abcdef'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string with 5 characters.');
    });

    it('String - length - too short', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().length(5) },
        {init: false});

      let doc = new Model({ id: 'abc'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a string with 5 characters.');
    });

    it('String - length - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().max(5) },
        {init: false});
      let doc = new Model({ id: 'abcde'});
      doc.validate();
    });

    it('String - regex - not matching', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().regex('^foo') },
        {init: false});

      let doc = new Model({ id: 'bar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must match the regex.');
    });

    it('String - regex - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().regex('^foo') },
        {init: false});
      let doc = new Model({ id: 'foobar'});
      doc.validate();
    });

    it('String - regex with flags - not matching', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().regex('^foo', 'i') },
        {init: false});

      let doc = new Model({ id: 'bar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must match the regex.');
    });

    it('String - regex with flags - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().regex('^foo', 'i') },
        {init: false});
      let doc = new Model({ id: 'FOObar'});
      doc = new Model({ id: 'Foobar'});
      doc = new Model({ id: 'fOObar'});
      doc.validate();
    });

    it('String - alphanum - not alphanum', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().alphanum() },
        {init: false});

      let doc = new Model({ id: 'élégant'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an alphanumeric string.');
    });

    it('String - alphanum - match', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().alphanum() },
        {init: false});
      let doc = new Model({ id: 'fOOb12ar'});
      doc.validate();
    });

    it('String - email - not an email', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().email() },
        {init: false});

      let doc = new Model({ id: 'fooATbar.com'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a valid email.');
    });

    it('String - email - match', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().email() },
        {init: false});
      let doc = new Model({ id: 'foo@bar.com'});
      doc.validate();
    });

    it('String - lowercase - not lowercase', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().lowercase() },
        {init: false});

      let doc = new Model({ id: 'fooBar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a lowercase string.');
    });

    it('String - lowercase - match', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().lowercase() },
        {init: false});
      let doc = new Model({ id: 'foobar'});
      doc.validate();
    });

    it('String - uppercase - not uppercase', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uppercase() },
        {init: false});

      let doc = new Model({ id: 'fooBar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a uppercase string.');
    });

    it('String - uppercase - match', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uppercase() },
        {init: false});
      let doc = new Model({ id: 'FOOBAR'});
      doc.validate();
    });

    it('String - uuid - not uuid v3', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(3) },
        {init: false});
      let doc = new Model({id: 'xxxA987FBC9-4BED-3078-CF07-9141BA07C9F3'});
    });

    it('String - uuid - is uuid v3', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(3) },
        {init: false});
      let doc = new Model({id: 'A987FBC9-4BED-3078-CF07-9141BA07C9F3'});
    });

    it('String - uuid - not uuid v4', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(4) },
        {init: false});
      let doc = new Model({id: 'A987FBC9-4BED-5078-AF07-9141BA07C9F3'});
    });

    it('String - uuid - is uuid v4', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(4) },
        {init: false});
      let doc = new Model({id: '713ae7e3-cb32-45f9-adcb-7c4fa86b90c1'});
    });

    it('String - uuid - not uuid v5', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(5) },
        {init: false});
      let doc = new Model({id: '9c858901-8a57-4791-81fe-4c455b099bc9'});
    });

    it('String - uuid - is uuid v5', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().uuid(5) },
        {init: false});
      let doc = new Model({id: '987FBC97-4BED-5078-BF07-9141BA07C9F3'});
    });

    it('String - validator - return false', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().validator(function() { return false; }) },
        {init: false});

      let doc = new Model({ id: 'fooBar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [id] returned `false`.');
    });

    it('String - validator - return true', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().validator(function() { return true; }) },
        {init: false});
      let doc = new Model({ id: 'FOOBAR'});
      doc.validate();
    });

    it('String - validator - throw', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().validator(function() { throw new Errors.ValidationError('Not good'); }) },
        {init: false});

      let doc = new Model({ id: 'fooBar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Not good');
    });

    it('String - enum - unknown value - 1', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum('foo', 'bar') },
        {init: false});

      let doc = new Model({ id: 'buzz'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [id] must be one of these values: foo, bar.');
    });

    it('String - enum - unknown value - 2', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum(['foo', 'bar']) },
        {init: false});

      let doc = new Model({ id: 'buzz'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [id] must be one of these values: foo, bar.');
    });

    it('String - enum - unknown value - 3', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum(['foo']) },
        {init: false});

      let doc = new Model({ id: 'buzz'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [id] must be one of these values: foo.');
    });

    it('String - enum - unknown value - 4', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum('foo') },
        {init: false});

      let doc = new Model({ id: 'buzz'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [id] must be one of these values: foo.');
    });

    it('String - enum - known value - 1', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum('foo', 'bar') },
        {init: false});
      let doc = new Model({ id: 'foo'});
      doc.validate();
    });

    it('String - enum - known value - 2', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum(['foo', 'bar']) },
        {init: false});
      let doc = new Model({ id: 'foo'});
      doc.validate();
    });

    it('String - enum - known value - 3', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum(['foo']) },
        {init: false});
      let doc = new Model({ id: 'foo'});
      doc.validate();
    });

    it('String - enum - known value - 4', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.string().enum('foo') },
        {init: false});
      let doc = new Model({ id: 'foo'});
      doc.validate();
    });

    it('Number - basic - valid number', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number()},
        {init: false});
      let doc = new Model({ id: 1 });
    });

    it('Number - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number()},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a finite number or null.');
    });

    it('Number - basic - NaN', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number()},
        {init: false});

      let doc = new Model({ id: NaN });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a finite number or null.');
    });

    it('Number - r.random()', function() {
      let r = test.r;
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().default(r.uuid())},
        {init: false});
      let doc = new Model({});
      doc.validate();
    });

    it('Number - basic - Infinity', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number()},
        {init: false});

      let doc = new Model({ id: Infinity });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a finite number or null.');
    });

    it('Number - basic - -Infinity', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number()},
        {init: false});

      let doc = new Model({ id: -Infinity });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a finite number or null.');
    });

    it('Number - min - too small', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().min(2) },
        {init: false});

      let doc = new Model({ id: 1});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be greater than 2.');
    });

    it('Number - min - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().min(2) },
        {init: false});
      let doc = new Model({ id: 3});
      doc.validate();
    });

    it('Number - max - too big', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().max(5) },
        {init: false});

      let doc = new Model({ id: 8});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be less than 5.');
    });

    it('Number - max - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().max(5) },
        {init: false});
      let doc = new Model({ id: 3});
      return doc.validate();
    });

    it('Number - integer - float', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().integer() },
        {init: false});

      let doc = new Model({ id: 3.14});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an integer.');
    });

    it('Number - integer - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().integer() },
        {init: false});
      let doc = new Model({ id: 3});
      doc.validate();
    });

    it('Number - validator - return false', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().validator(function() { return false; }) },
        {init: false});

      let doc = new Model({ id: 2});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [id] returned `false`.');
    });

    it('Number - validator - return true', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().validator(function() { return true; }) },
        {init: false});
      let doc = new Model({ id: 3});
      doc.validate();
    });

    it('Number - validator - throw', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().validator(function() { throw new Errors.ValidationError('Not good'); }) },
        {init: false});

      let doc = new Model({ id: 4});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Not good');
    });

    it('Boolean - basic - valid boolean', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.boolean()},
        {init: false});
      let doc = new Model({ id: true });
    });

    it('Boolean - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.boolean()},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a boolean or null.');
    });

    it('Boolean - validator - return false', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.boolean().validator(function() { return false; }) },
        {init: false});

      let doc = new Model({ id: true});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [id] returned `false`.');
    });

    it('Boolean - validator - return true', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.boolean().validator(function() { return true; }) },
        {init: false});
      let doc = new Model({ id: true});
      doc.validate();
    });

    it('Boolean - validator - throw', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.number().validator(function() { throw new Errors.ValidationError('Not good'); }) },
        {init: false});

      let doc = new Model({ id: true});
      return expect(doc.validate()).to.be.rejectedWith(Errors.ValidationError, 'Not good');
    });

    it('Date - basic - valid date', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date()},
        {init: false});
      let doc = new Model({ id: new Date() });
      doc.validate();
    });

    it('Date - null', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date().allowNull(true)},
        {init: false});
      let doc = new Model({ id: null });
      doc.validate();
    });

    it('Date - number', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date()},
        {init: false});
      let doc = new Model({ id: Date.now() });
      doc.validate();
    });

    it('Date - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date()},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a date or a valid string or null.');
    });

    it('Date - min - too small', function() {
      let minDate = new Date(0);
      minDate.setUTCSeconds(60 * 60 * 24 * 2);
      let valueDate = new Date(0);
      valueDate.setUTCSeconds(60 * 60 * 24);

      let Model = test.thinky.createModel(test.table(),
        {id: type.date().min(minDate) },
        {init: false});

      let doc = new Model({ id: valueDate});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, /Value for .id. must be after/);
    });

    it('Date - min - good', function() {
      let minDate = new Date(0);
      minDate.setUTCSeconds(60 * 60 * 24);
      let valueDate = new Date(0);
      valueDate.setUTCSeconds(60 * 60 * 24 * 2);

      let Model = test.thinky.createModel(test.table(),
        {id: type.date().min(minDate) },
        {init: false});
      let doc = new Model({ id: valueDate});
      doc.validate();
    });

    it('Date - max - too big', function() {
      let maxDate = new Date(0);
      maxDate.setUTCSeconds(60 * 60 * 24);
      let valueDate = new Date(0);
      valueDate.setUTCSeconds(60 * 60 * 24 * 2);

      let Model = test.thinky.createModel(test.table(),
        {id: type.date().max(maxDate) },
        {init: false});

      let doc = new Model({ id: valueDate});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, /Value for .id. must be before/);
    });

    it('Date - max - good', function() {
      let maxDate = new Date(0);
      maxDate.setUTCSeconds(60 * 60 * 24 * 2);
      let valueDate = new Date(0);
      valueDate.setUTCSeconds(60 * 60 * 24);

      let Model = test.thinky.createModel(test.table(),
        {id: type.date().max(maxDate) },
        {init: false});
      let doc = new Model({ id: valueDate});
      doc.validate();
    });

    it('Date - validator - return false', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date().validator(function() { return false; }) },
        {init: false});

      let doc = new Model({ id: new Date()});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [id] returned `false`.');
    });

    it('Date - validator - return true', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date().validator(function() { return true; }) },
        {init: false});
      let doc = new Model({ id: new Date()});
      doc.validate();
    });

    it('Date - validator - throw', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.date().validator(function() { throw new Errors.ValidationError('Not good'); }) },
        {init: false});

      let doc = new Model({ id: new Date()});
      return expect(doc.validate()).to.be.rejectedWith(Errors.ValidationError, 'Not good');
    });

    it('Buffer - basic - valid buffer', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.buffer()},
        {init: false});
      let doc = new Model({ id: new Buffer('foobar') });
      doc.validate();
    });

    it('Buffer - basic - valid buffer', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.buffer()},
        {init: false});
      let doc = new Model({ id: null});
      doc.validate();
    });

    it('Buffer - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.buffer()},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a buffer or null.');
    });

    it('Point - basic - valid point - 1', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.point()},
        {init: false});
      let doc = new Model({ id: [10, 2] });
    });

    it('Point - basic - valid point - 2', function() {
      let r = test.r;
      let Model = test.thinky.createModel(test.table(),
        {id: type.point()},
        {init: false});
      let doc = new Model({ id: r.point(2, 10) });
    });

    it('Point - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.point()},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be a Point or null.');
    });

    it('Object - basic - valid object', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.object().schema({
          foo: type.string()
        })},
        {init: false});
      let doc = new Model({ id: {foo: 'bar' }});
    });

    it('Object - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.object().schema({
          foo: type.string()
        })},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an object or null.');
    });

    it('Array - basic - valid array', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string())},
        {init: false});
      let doc = new Model({ id: ['bar']});
    });

    it('Array - basic - wrong type', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string())},
        {init: false});

      let doc = new Model({ id: 'foo' });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an array or null.');
    });

    it('Array - basic - wrong nested type - 1', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string())},
        {init: false});

      let doc = new Model({ id: [2] });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id][0] must be a string or null.');
    });

    it('Array - basic - wrong nested type - 2', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(String)},
        {init: false});

      let doc = new Model({ id: [2] });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id][0] must be a string or null.');
    });

    it('Array - no schema - valid array - 1', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array()},
        {init: false});
      let doc = new Model({ id: ['bar']});
      doc.validate();
    });

    it('Array - no schema - valid array - 2', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array()},
        {init: false});
      let doc = new Model({ id: [{foo: 'bar'}]});
      doc.validate();
    });

    it('Array - no schema - non valid array', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array()},
        {init: false});

      let doc = new Model({ id: 'bar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an array or null.');
    });

    it('Array - basic - wrong nested type - 3', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema({_type: String})},
        {init: false});

      let doc = new Model({ id: [2] });
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id][0] must be a string or null.');
    });

    it('Array - min - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).min(2)},
        {init: false});
      let doc = new Model({ id: ['foo', 'bar', 'buzz']});
      doc.validate();
    });

    it('Array - min - error', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).min(2)},
        {init: false});

      let doc = new Model({ id: ['foo']});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must have at least 2 elements.');
    });

    it('Array - max - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).max(2)},
        {init: false});
      let doc = new Model({ id: ['foo']});
      doc.validate();
    });

    it('Array - max - error', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).max(2)},
        {init: false});

      let doc = new Model({ id: ['foo', 'bar', 'buzz']});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must have at most 2 elements.');
    });

    it('Array - length - good', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).length(2)},
        {init: false});
      let doc = new Model({ id: ['foo', 'bar']});
      doc.validate();
    });

    it('Array - length - error', function() {
      let Model = test.thinky.createModel(test.table(),
        {id: type.array().schema(type.string()).length(2)},
        {init: false});

      let doc = new Model({ id: ['foo', 'bar', 'buzz']});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [id] must be an array with 2 elements.');
    });

    it('Virtual - basic', function() {
      let Model = test.thinky.createModel(test.table(),
        {
          id: type.string(),
          foo: type.virtual()
        },
        {init: false});
      let doc = new Model({ id: 'bar', foo: 'bar'});
    });

    it('Any - basic', function() {
      let Model = test.thinky.createModel(test.table(),
        {
          id: type.string(),
          foo: type.any()
        },
        {init: false});
      let doc = new Model({ id: 'bar', foo: 'bar'});
      doc.validate();
      doc = new Model({ id: 'bar', foo: 2});
      doc.validate();
      doc = new Model({ id: 'bar', foo: undefined});
      doc.validate();
      doc = new Model({ id: 'bar', foo: null});
      doc.validate();
    });
  });

  describe('generateDefault', function() {
    it('String - constant', function() {
      let str = util.s8();
      let defaultValue = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });
      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('String - function', function() {
      let str = util.s8();
      let defaultValue = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, default: function() {
          return defaultValue;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('String - function - Test binding', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, default: function() {
          return this.id;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, str);
    });

    it('Number - constant', function() {
      let str = util.s8();
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Number, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('Number - function', function() {
      let str = util.s8();
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Number, default: function() {
          return defaultValue;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('Bool - constant', function() {
      let str = util.s8();
      let defaultValue = util.bool();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Boolean, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('Bool - function', function() {
      let str = util.s8();
      let defaultValue = util.bool();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Boolean, default: function() {
          return defaultValue;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.field, defaultValue);
    });

    it('Array - constant', function() {
      let str = util.s8();
      let defaultValue = [1, 2, 3];

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Array, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.field, defaultValue);
    });

    it('Array - function', function() {
      let str = util.s8();
      let defaultValue = [1, 2, 3];

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Array, default: function() {
          return defaultValue;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.field, defaultValue);
    });

    it('Object - constant', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Object, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.field, defaultValue);
    });

    it('Object - function', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Object, default: function() {
          return defaultValue;
        }}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.field, defaultValue);
    });

    it('Object - constant', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: Object, default: defaultValue}
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.field, defaultValue);
      assert.notStrictEqual(doc.field, defaultValue);
    });

    it('Number - nested value', function() {
      let str = util.s8();
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Object,
          schema: {
            field: {_type: Number, default: defaultValue}
          },
          default: {}
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.equal(doc.nested.field, defaultValue);
    });

    it('Array - nested value - 1', function() {
      let str = util.s8();
      let defaultArray = [1, 2, 3];
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Array,
          schema: {
            field: {_type: Number, default: defaultValue}
          },
          default: defaultArray
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.nested, defaultArray);
    });

    it('Array - nested value - 2', function() {
      let str = util.s8();
      let defaultArray = [1, 2, 3];
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Array,
          schema: {
            field: {
              _type: Object,
              schema: {value: {_type: Number, default: defaultValue} }
            }
          },
          default: defaultArray
        }
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: []
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.nested, []);
    });

    it('Array - nested value - 3', function() {
      let str = util.s8();
      let defaultArray = [1, 2, 3];
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Array,
          schema: {
            _type: Object,
            schema: {
              field: {_type: Number, default: defaultValue}
            }
          },
          default: defaultArray
        }
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: [{}]

      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.nested, [{field: defaultValue}]);
    });

    it('Array - nested value - 4', function() {
      let str = util.s8();
      let defaultArray = [1, 2, 3];
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: [{
          _type: Object,
          schema: {
            field: {_type: Number, default: defaultValue}
          }
        }]
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: [{}]

      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.nested, [{field: defaultValue}]);
    });

    it('Array - nested value - 5', function() {
      let str = util.s8();
      let defaultArray = [1, 2, 3];
      let defaultValue = util.random();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: [{
          _type: Object,
          schema: {
            field: {_type: Number, default: defaultValue}
          }
        }]
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: [{}, {field: 4}, {}]

      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.nested, [{field: defaultValue}, {field: 4}, {field: defaultValue}]);
    });

    it('Object - deep nested - 1', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Object,
          schema: {
            field1: {_type: Number, default: 1},
            field2: {_type: String, default: 'hello'}
          }
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc, { id: str });
    });

    it('Object - deep nested - 2', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          _type: Object,
          schema: {
            field1: {_type: Number, default: 1},
            field2: {_type: String, default: 'hello'}
          },
          default: {}
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc, { id: str, nested: { field1: 1, field2: 'hello' } });
    });

    it('Object - deep nested - 3', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          field1: {_type: Number, default: 1},
          field2: {_type: String, default: 'hello'}
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc, { id: str});
    });

    it('Object - deep nested - 4', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          field1: {_type: Number, default: 1},
          field2: {_type: String, default: 'hello'}
        }
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: {}
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc, { id: str, nested: {field1: 1, field2: 'hello'}});
    });

    it('Default array', function() {
      let str = util.s8();
      let defaultValue = {foo: 'bar'};

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        ar: {
          _type: Array,
          default: function() { return [1, 2, 3]; }
        }
      }, {init: false});

      let doc = new Model({
        id: str
      });

      assert.equal(doc.id, str);
      assert.deepEqual(doc.ar, [1, 2, 3]);
    });

    it('Object - default should make a deep copy', function() {
      let Model = test.thinky.createModel(test.table(), {
        field: type.object().default({foo: 'bar'}).schema({
          foo: type.string()
        })
      }, {init: false});
      let doc1 = new Model({});
      let doc2 = new Model({});
      assert.equal(doc1.field.foo, 'bar');
      assert.equal(doc2.field.foo, 'bar');
      assert.notEqual(doc1.field, doc2.field);
      assert.deepEqual(doc1.field, doc2.field);
    });

    it('Array - default should make a deep copy', function() {
      let Model = test.thinky.createModel(test.table(), {
        field: type.array().default([{foo: 'bar'}]).schema({
          foo: type.string()
        })
      }, {init: false});
      let doc1 = new Model({});
      let doc2 = new Model({});
      assert.equal(doc1.field.length, 1);
      assert.equal(doc2.field.length, 1);
      assert.equal(doc1.field[0].foo, 'bar');
      assert.equal(doc2.field[0].foo, 'bar');
      assert.notEqual(doc1.field, doc2.field);
      assert.deepEqual(doc1.field, doc2.field);
    });

    it('Nested object should not throw with a null value - #314', function() {
      let str = util.s8();
      let defaultValue = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          field: type.string().default(2)
        }
      }, {init: false});

      let doc = new Model({
        id: str,
        nested: null
      });
      doc.validate();
    });
  });

  describe('validate', function() {
    it('String - wrong type - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 1
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a string.');
    });

    it('String - wrong type  - type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 1
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a string or null.');
    });

    it('String - wrong type  - type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: 1
      });

      doc.validate();
    });

    it('String - undefined - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: undefined
      });

      doc.validate();
    });

    it('String - undefined  - type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: undefined
      });

      doc.validate();
    });

    it('String - undefined  - type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: undefined
      });

      doc.validate();
    });

    it('String - undefined  - type: "none"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'none', enforce_missing: true});

      let doc = new Model({
        id: str,
        field: undefined
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('String - null - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: null
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a string.');
    });

    it('String - null  - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: null
      });

      doc.validate();
    });

    it('String - null  - type: "none"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: null
      });

      doc.validate();
    });

    it('Number - wrong type - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Number
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a finite number.');
    });

    it('Number - wrong type  - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Number
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a finite number or null.');
    });

    it('Number - wrong type  - type: "none"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Number
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      doc.validate();
    });

    it('Number - not wrong type - numeric string', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Number
      }, {init: false});

      let doc = new Model({
        id: str,
        field: '123456'
      });

      doc.validate();
    });

    it('Boolean - wrong type - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Boolean
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a boolean.');
    });

    it('Boolean - wrong type  - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Boolean
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a boolean or null.');
    });

    it('Boolean - wrong type  - type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Boolean
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      doc.validate();
    });

    it('Date - string type - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: (new Date()).toJSON()
      });

      doc.validate();
    });

    it('Date - wrong type - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a date or a valid string.');
    });

    it('Date - wrong type  - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a date or a valid string or null.');
    });

    it('Date - string type - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: (new Date()).toJSON()
      });
      doc.validate();
    });

    it('Date - wrong type  - type: "none"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      doc.validate();
    });

    it('Date - raw type - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: {$reql_type$: 'TIME', epoch_time: 1231, timezone: '+10:00' }
      });

      doc.validate();
    });

    it('Date - raw type - missing timezone - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: {$reql_type$: 'TIME', epoch_time: 1231}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The raw date object for [field] is missing the required field timezone.');
    });

    it('Date - raw type - missing epoch_time - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: {$reql_type$: 'TIME', timezone: '+00:00'}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The raw date object for [field] is missing the required field epoch_time.');
    });

    it('Date - r.now', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false});

      let r = test.r;
      let doc = new Model({
        id: str,
        field: r.now()
      });
      doc.validate();
    });

    it('Date - undefined - enforce_missing: true', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_missing: true});

      let doc = new Model({
        id: str
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('Date - undefined - enforce_missing: false', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Date
      }, {init: false, enforce_missing: false});

      let doc = new Model({
        id: str
      });
      doc.validate();
    });

    it('Buffer - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: new Buffer([1, 2, 3])
      });

      doc.validate();
    });

    it('Buffer - wrong type - type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a buffer.');
    });

    it('Buffer - wrong type  - type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be a buffer or null.');
    });

    it('Buffer - wrong type  - type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      doc.validate();
    });

    it('Buffer - raw type - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: {$reql_type$: 'BINARY', data: (new Buffer('hello')).toString('base64') }
      });

      doc.validate();
    });

    it('Buffer - raw type - missing data - type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: { $reql_type$: 'BINARY' }
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The raw binary object for [field] is missing the required field data.');
    });

    it('Buffer - r.http', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false});

      let r = test.r;
      let doc = new Model({
        id: str,
        field: r.http('http://some/domain/com/some/binary/file')
      });
      doc.validate();
    });

    it('Buffer - undefined - enforce_missing: true', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_missing: true});

      let doc = new Model({
        id: str
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('Buffer - undefined - enforce_missing: false', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: Buffer
      }, {init: false, enforce_missing: false});

      let doc = new Model({
        id: str
      });
      doc.validate();
    });

    it('Array - missing - enforce_missing: true', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_missing: true});

      let doc = new Model({
        id: str
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('Array - undefined - enforce_missing: true', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_missing: true});

      let doc = new Model({
        id: str
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('Array - undefined - enforce_missing: false', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_missing: false});

      let doc = new Model({
        id: str
      });

      doc.validate();
    });

    it('Array - wrong type - enforce_type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 2
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be an array or null.');
    });

    it('Array - wrong type - enforce_type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: {}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be an array or null.');
    });

    it('Array - wrong type - enforce_type: "none"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str
      });

      doc.validate();
    });

    it('Array - wrong type inside - enforce_type: "strict"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: ['hello']
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][0] must be a finite number.');
    });

    it('Array - wrong type inside - enforce_type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: ['hello']
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][0] must be a finite number or null.');
    });

    it('Array - wrong type inside - enforce_type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: ['hello']
      });

      doc.validate();
    });

    it('Array - wrong type inside - not first - enforce_type: "strict" - 1', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: [1, 2, 3, 'hello']
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][3] must be a finite number.');
    });

    it('Array - wrong type inside - not first - enforce_type: "strict" - 2', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: [1, 2, 3, undefined]
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The element in the array [field] (position 3) cannot be `undefined`.');
    });

    it('Array - wrong type inside - not first - enforce_type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: [1, 2, 3, undefined]
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The element in the array [field] (position 3) cannot be `undefined`.');
    });

    it('Array - null - enforce_type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: [Number]
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: [1, 2, 3, null]
      });

      doc.validate();
    });

    it('Object - undefined - enforce_missing: true', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {}
      }, {init: false, enforce_missing: true});

      let doc = new Model({
        id: str
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be defined.');
    });

    it('Object - undefined - enforce_missing: false', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {}
      }, {init: false, enforce_missing: false});

      let doc = new Model({
        id: str
      });

      doc.validate();
    });

    it('Object - undefined - enforce_type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {}
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: 'foo'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be an object or null.');
    });

    it('Object - undefined - enforce_type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {}
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str
      });

      doc.validate();
    });

    it('Object - undefined - enforce_type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {}
      }, {init: false, enforce_type: 'none'});

      let doc = new Model({
        id: str
      });

      doc.validate();
    });

    it('Object - nested - enforce_type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: Number
        }
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'bar'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be an object.');
    });

    it('Object - nested wrong type - enforce_type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: Number
        }
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field] must be an object.');
    });

    it('Object - nested wrong type - enforce_type: "strict" - 2', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: Number
        }
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({
        id: str,
        field: {
          foo: 'str'
        }
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][foo] must be a finite number.');
    });

    it('Object - nested wrong type - enforce_type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: Number
        }
      }, {init: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: {
          foo: 'str'
        }
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][foo] must be a finite number or null.');
    });

    it('Object - Empty - enforce_type: "strict"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String
      }, {init: false, enforce_type: 'strict'});

      let doc = new Model({});

      doc.validate();
    });

    it('Object - nested wrong type 2 - enforce_type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: {_type: Number}
        }
      }, {init: false, enforce_missing: true, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: {}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][foo] must be defined.');
    });

    it('Object - undefined - enforce_type: "loose"', function() {
      let str = util.s8();
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: {_type: Number}
        }
      }, {init: false, enforce_missing: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: {}
      });

      doc.validate();
    });

    it('Object - nested wrong type 4 - enforce_type: "loose"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: {_type: Number, default: 'foo'}
        }
      }, {init: false, enforce_missing: false, enforce_type: 'loose'});

      let doc = new Model({
        id: str,
        field: {}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [field][foo] must be a finite number or null.');
    });

    it('Object - nested wrong type 5 - enforce_type: "none"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {
          foo: {_type: Number}
        }
      }, {init: false, enforce_missing: false, enforce_type: 'none'});

      let doc = new Model({
        id: str,
        field: {}
      });

      doc.validate();
    });

    it('Extra field - 1', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String
      }, {init: false, enforce_extra: 'strict'});

      let doc = new Model({
        id: str,
        foo: 'hello'
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Extra field `foo` not allowed.');
    });

    it('Extra field - 2', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        foo: [{bar: String}]
      }, {init: false, enforce_extra: 'strict'});

      let doc = new Model({
        id: str,
        foo: [{bar: 'Hello', buzz: 'World'}]
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Extra field `buzz` in [foo][0] not allowed.');
    });

    it('Extra field - 3', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        foo: {bar: String}
      }, {init: false, enforce_extra: 'strict'});

      let doc = new Model({
        id: str,
        foo: {bar: 'Hello', buzz: 'World'}
      });

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Extra field `buzz` in [foo] not allowed.');
    });

    it('Extra field - enforce_extra:"remove" - global option', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        foo: {fizz: String}
      }, {init: false, enforce_extra: 'remove'});

      let doc = new Model({
        id: str,
        foo: {fizz: 'Hello', buzz: 'OMIT'},
        bar: 'OMIT'
      });
      doc.validate();

      assert.equal(false, doc.foo.hasOwnProperty('buzz'));
      assert.deepEqual(doc, {
        id: str,
        foo: { fizz: 'Hello' }
      });
    });

    it('Extra field - enforce_extra:"remove" - deprecated', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        foo: {
          _type: Object,
          schema: {
            fizz: String
          },
          options: {enforce_extra: 'remove'}
        }
      }, {init: false});

      let doc = new Model({
        id: str,
        foo: {fizz: 'Hello', buzz: 'OMIT'},
        bar: 'keep'
      });
      doc.validate();

      assert.equal(false, doc.foo.hasOwnProperty('buzz'));
      assert.deepEqual(doc, {
        id: str,
        foo: { fizz: 'Hello' },
        bar: 'keep'
      });
    });

    it('Extra field - enforce_extra:"remove"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        foo: type.object().schema({
          fizz: type.string()
        }).removeExtra()
      }, {init: false});

      let doc = new Model({
        id: str,
        foo: {fizz: 'Hello', buzz: 'OMIT'},
        bar: 'keep'
      });
      doc.validate();
      assert.equal(false, doc.foo.hasOwnProperty('buzz'));
      assert.deepEqual(doc, {
        id: str,
        foo: { fizz: 'Hello' },
        bar: 'keep'
      });
    });

    it('Extra field - enforce_extra:"remove" - should not removed joined documents', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String
      }, {init: false, enforce_extra: 'remove'});


      let OtherModel = test.thinky.createModel(test.table(), {
        id: String,
        otherId: String
      }, {init: false, enforce_extra: 'remove'});

      Model.hasOne(OtherModel, 'otherDoc', 'id', 'otherId', {init: false});

      let value = { id: util.s8() };
      let value2 = { id: util.s8(), otherId: value.id };
      let doc = new Model(value);
      let otherDoc = new OtherModel(value2);
      doc.otherDoc = otherDoc;

      doc.validateAll();

      assert.deepEqual(doc, {id: value.id, otherDoc: {id: otherDoc.id, otherId: otherDoc.otherId}});
    });

    it('Test option validate="oncreate"', function() {
      let str = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict', enforce_missing: true, enforce_extra: 'strict', validate: 'oncreate'});

      assert.throws(() => {
        let doc = new Model({ id: str, field: 1 });
      }, error => {
        return ((error instanceof Errors.ValidationError) && (error.message === 'Value for [field] must be a string.'));
      });
    });
  });

  describe('validateAll', function() {
    it('it should check joined Document too -- hasOne - 1', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasOne(OtherModel, 'otherDoc', 'otherId', 'id', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDoc: {
          id: str3,
          field: 1
        }
      });

      return expect(doc.validateAll())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDoc][field] must be a string or null.');
    });

    it('it should check joined Document too -- hasOne - 2', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasOne(OtherModel, 'otherDoc', 'otherId', 'id', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDoc: {
          id: str3,
          field: 1
        }
      });

      return expect(doc.validateAll({otherDoc: true}))
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDoc][field] must be a string or null.');
    });

    it('it should check joined Document too -- belongsTo - 1', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasOne(OtherModel, 'otherDoc', 'otherId', 'id', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDoc: {
          id: str3,
          field: 1
        }
      });

      return expect(doc.validateAll())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDoc][field] must be a string or null.');
    });

    it('it should check joined Document too -- belongsTo - 2', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasOne(OtherModel, 'otherDoc', 'otherId', 'id', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDoc: {
          id: str3,
          field: 1
        }
      });

      return expect(doc.validateAll({otherDoc: true}))
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDoc][field] must be a string or null.');
    });

    it('it should check joined Document too -- hasMany - 1', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'otherId', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDocs: [{
          id: str3,
          field: 1
        }]
      });

      return expect(doc.validateAll())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDocs][0][field] must be a string or null.');
    });

    it('it should check joined Document too -- hasMany - 2', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'otherId', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDocs: [{
          id: str3,
          field: 1
        }]
      });

      return expect(doc.validateAll({otherDocs: true}))
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDocs][0][field] must be a string or null.');
    });

    it('it should check joined Document too -- hasAndBelongsToMany - 1', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'otherId', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDocs: [{
          id: str3,
          field: 1
        }]
      });

      return expect(doc.validateAll())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDocs][0][field] must be a string or null.');
    });

    it('it should check joined Document too -- hasAndBelongsToMany - 2', function() {
      let otherName = util.s8();

      let str1 = util.s8();
      let str2 = util.s8();
      let str3 = util.s8();

      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: String
      }, {init: false, enforce_type: 'strict'});

      let OtherModel = test.thinky.createModel(otherName, {
        id: String,
        field: String,
        otherId: String
      }, {init: false, enforce_type: 'loose'});

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'otherId', {init: false});

      let doc = new Model({
        id: str1,
        field: str2,
        otherDocs: [{
          id: str3,
          field: 1
        }]
      });

      return expect(doc.validateAll({otherDocs: true}))
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [otherDocs][0][field] must be a string or null.');
    });

    it('hasOne with a circular reference', function() {
      let Model = test.thinky.createModel(test.table(), { id: String});
      let OtherModel = test.thinky.createModel(test.table(), { id: String, otherId: String });

      Model.hasOne(OtherModel, 'has', 'id', 'otherId');
      OtherModel.belongsTo(Model, 'belongsTo', 'otherId', 'id');

      return Promise.all([ Model.ready(), OtherModel.ready() ])
        .then(() => {
          let doc = new Model({});
          let otherDoc = new Model({});
          doc.has = otherDoc;
          otherDoc.belongsTo = doc;
          doc.validate();
          otherDoc.validate();
        });
    });

    it('hasOne with a circular reference - second reference should not be checked', function() {
      let Model = test.thinky.createModel(test.table(), { id: String});
      let OtherModel = test.thinky.createModel(test.table(), { id: String, otherId: String });

      Model.hasOne(OtherModel, 'has', 'id', 'otherId');
      OtherModel.belongsTo(Model, 'belongsTo', 'otherId', 'id');

      return Promise.all([ Model.ready(), OtherModel.ready() ])
        .then(() => {
          let doc = new Model({});
          let otherDoc = new Model({});
          let wrongDoc = new Model({id: 1});
          doc.has = otherDoc;
          otherDoc.belongsTo = wrongDoc;
          doc.validateAll();
        });
    });

    it('hasOne with a circular reference - second reference should be checked if manually asked', function() {
      let Model = test.thinky.createModel(test.table(), { id: String});
      let OtherModel = test.thinky.createModel(test.table(), { id: String, otherId: String });

      Model.hasOne(OtherModel, 'has', 'id', 'otherId');
      OtherModel.belongsTo(Model, 'belongsTo', 'otherId', 'id');

      return Promise.all([ Model.ready(), OtherModel.ready() ])
        .then(() => {
          let doc = new Model({});
          let otherDoc = new OtherModel({});
          let wrongDoc = new Model({id: 1});
          doc.has = otherDoc;
          otherDoc.belongsTo = wrongDoc;
          return expect(doc.validateAll({}, {has: {belongsTo: true}}))
            .to.be.rejectedWith(Errors.ValidationError, 'Value for [has][belongsTo][id] must be a string or null.');
        });
    });
  });

  describe('_validator', function() {
    it('validate on the whole document - bind with the doc - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String},
        foreignKey: String
      }, {init: false, validator: function() {
        if (this.id !== this.field) {
          throw new Errors.ValidationError('Expecting `id` value to be `field` value.');
        }
      }
      });
      let doc = new Model({id: 'abc', field: 'abc'});
      doc.validate();
    });

    it('validate on the whole document - bind with the doc - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String},
        foreignKey: String
      }, {init: false, validator: function() {
        if (this.id !== this.field) {
          throw new Errors.ValidationError('Expecting `id` value to be `field` value.');
        }
      }
      });
      let doc = new Model({id: '', field: 'abc'});

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Expecting `id` value to be `field` value.');
    });

    // it('validate on the whole document - make sure a relation is defined ', function(done) {
    //   let Model = test.thinky.createModel(test.table(), {
    //     id: String,
    //     field: String
    //   }, {validator: function() {
    //     if (this.otherDoc === null) {
    //       throw new Errors.ValidationError('Relation must be defined.');
    //     }
    //   }});
    //   let doc = new Model({id: 'abc', field: 'abc'});

    //   Model.once('ready', function() {
    //     expect(doc.validate()).to.be.rejectedWith(Errors.ValidationError, ));
    //       doc.validate();
    //     }, function(error) {
    //       return (error instanceof Errors.ValidationError) && (error.message === 'Relation must be defined.');
    //     });

    //     Model.hasOne(Model, 'otherDoc', 'id', 'foreignKey');
    //     let otherDoc = new Model({});

    //     doc.otherDoc = otherDoc;

    //     doc.validate();
    //     doc.saveAll().then(function() {
    //       done();
    //     });
    //   });
    // });

    it('validate on the whole document - bind with the doc - return false - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function() {
        return this.id === this.field;
      }
      });
      let doc = new Model({id: 'abc', field: 'abc'});
      doc.validate();
    });

    it('validate on the whole document - bind with the doc - return false with arg - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function(doc) {
        return doc.id === this.field;
      }
      });
      let doc = new Model({id: 'abc', field: 'abc'});
      doc.validate();
    });

    it('validate on the whole document - bind with the doc - return false with arg (error)- 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function(doc) {
        return doc.id === this.field;
      }
      });

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, "Document's validator returned `false`.");
    });

    it('validate on the whole document - bind with the doc - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function() {
        if (this.id !== this.field) {
          throw new Errors.ValidationError('Expecting `id` value to be `field` value.');
        }
      }
      });

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Expecting `id` value to be `field` value.');
    });

    it('validate on the whole document - bind with the doc - return false - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function() {
        return this.id === this.field;
      }
      });

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, "Document's validator returned `false`.");
    });

    it('validate on the whole document - nested field - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function() {
        if (this.id !== this.nested.field) {
          throw new Errors.ValidationError('Expecting `id` value to be `field` value.');
        }
      }
      });

      let doc = new Model({id: 'abc', nested: {field: 'abc'}});
      doc.validate();
    });

    it('validate on the whole document - nested field - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String}
      }, {init: false, validator: function() {
        if (this.id !== this.nested.field) {
          throw new Errors.ValidationError('Expecting `field` value to be `field` value.');
        }
      }
      });

      let doc = new Model({id: 'abc', nested: { field: ''}});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Expecting `field` value to be `field` value.');
    });

    it('validate on a field - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, validator: function(value) {
          if (value !== 'abc') {
            throw new Errors.ValidationError("Expecting `field` value to be 'abc'.");
          }
        }}
      }, {init: false});

      let doc = new Model({id: 'abc', field: 'abc'});
      doc.validate();
    });

    it('validate on a field - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, validator: function(value) {
          if (value !== 'abc') {
            throw new Errors.ValidationError("Expecting `field` value to be 'abc'.");
          }
        }}
      }, {init: false});

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, "Expecting `field` value to be 'abc'.");
    });

    it('validate on a field - 3', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, validator: function(value) {
          return value === 'abc';
        }}
      }, {init: false});

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [field] returned `false`.');
    });

    it('validate on a field - 4', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, validator: function(value) {
          return this === 'abc';
        }}
      }, {init: false});

      let doc = new Model({id: 'abc', field: ''});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Validator for the field [field] returned `false`.');
    });

    it('validate on the whole document - nested field - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          field: {_type: String, validator: function(value) {
            if (value !== 'abc') {
              throw new Errors.ValidationError("Expecting `field` value to be 'abc'.");
            }
          }
        }}
      }, {init: false});


      let doc = new Model({id: 'abc', nested: {field: 'abc'}});
      doc.validate();
    });

    it('validate on the whole document - nested field - 3', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        nested: {
          field: {_type: String, validator: function(value) {
            if (value !== 'abc') {
              throw new Errors.ValidationError("Expecting `field` value to be 'abc'.");
            }
          }
        }}
      }, {init: false});

      let doc = new Model({id: 'abc', nested: { field: ''}});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, "Expecting `field` value to be 'abc'.");
    });

    it('validate with _type: Array - 1', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        arr: {_type: Array, schema: Number}
      }, {init: false});

      let doc = new Model({id: 'abc', arr: [2, 3]});
      doc.validate();
    });

    it('validate with _type: Array - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        arr: {_type: Array, schema: Number}
      }, {init: false});

      let doc = new Model({id: 'abc', arr: [2, 'ikk', 4]});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [arr][1] must be a finite number or null.');
    });

    it('validate with _type: Object - 1', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        ob: {_type: Object, schema: {foo: String}}
      }, {init: false});

      let doc = new Model({id: 'abc', ob: {foo: 'bar'}});
      doc.validate();
    });

    it('validate with _type: Object - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        ob: {_type: Object, schema: {foo: String}}
      }, {init: false});

      let doc = new Model({id: 'abc', ob: {foo: 1}});
      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'Value for [ob][foo] must be a string or null.');
    });

    it('Check extra fields only if the schema is an object without the _type field', function() {
      let User = test.thinky.createModel('users', {
        email: {
          _type: String,
          validator: function() { return true; }
        }
      }, {
        enforce_extra: 'strict',
        enforce_type: 'strict',
        init: false
      });

      let user = new User({});
      user.email = 'hello@world.com';
      user.validate();
    });

    it('Enum - success ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, enum: ['foo', 'bar', 'buzz']}
      }, {init: false});
      let doc = new Model({id: 'abc', field: 'bar'});
      doc.validate();
    });

    it('Enum - throw - 1 ', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, enum: ['foo', 'bar', 'buzz']}
      }, {init: false});
      let doc = new Model({id: 'abc', field: 'notavalidvalue'});

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [field] must be one of these values: foo, bar, buzz.');
    });

    it('Enum - throw - 2', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
      }, {init: false});
      let doc = new Model({id: 'abc', field: 'notavalidvalue'});

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [field] must be one of these values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.');
    });

    it('Enum - throw - 3', function() {
      let Model = test.thinky.createModel(test.table(), {
        id: String,
        field: {_type: String, enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']}
      }, {init: false});
      let doc = new Model({id: 'abc', field: 'notavalidvalue'});

      return expect(doc.validate())
        .to.be.rejectedWith(Errors.ValidationError, 'The field [field] must be one of these values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10...');
    });

    it('Array without type', function() {
      let Model = test.thinky.createModel(test.table(), {id: Array}, {init: false});
      let doc = new Model({id: [1, 2, 3]});
      doc.validate();
    });
  });
});
