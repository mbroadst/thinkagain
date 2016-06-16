'use strict';
const util = require('../lib/util'),
      expect = require('chai').expect;

describe('util', function() {
  describe('inject', function() {
    [
      {
        name: 'object',
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } }
        },
        expected: {
          type: 'object',
          properties: { id: { type: 'string', acceptTerms: true } }
        }
      },
      {
        name: 'array',
        schema: { type: 'array', items: { type: 'string' } },
        expected: { type: 'array', items: { type: 'string', acceptTerms: true } }
      }
    ].forEach(t => {
      it('should inject term support into schema: ' + t.name, () => {
        let actual = util.inject(t.schema);
        expect(actual).to.eql(t.expected);
      });
    });

    it('should inject an `id` property if no `pk` is specified', () => {
      let schema = { type: 'object', properties: { name: { type: 'string' } } };
      let result = util.inject(schema);
      expect(result).to.eql({
        type: 'object',
        properties: {
          id: { type: 'string', acceptTerms: true },
          name: { type: 'string', acceptTerms: true }
        }
      });
    });

    it('should not inject an `id` property if `pk` is specified', () => {
      let schema = { type: 'object', properties: { name: { type: 'string' } } };
      let result = util.inject(schema, { pk: 'name' });
      expect(result).to.eql({
        type: 'object',
        properties: {
          name: { type: 'string', acceptTerms: true }
        }
      });
    });
  }); // inject
}); // util
