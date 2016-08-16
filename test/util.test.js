'use strict';
const util = require('../lib/util'),
      expect = require('chai').expect;

describe('util', function() {
  describe('copySchemaDefinition', function() {
    it('should inject an `id` property if no `pk` is specified', () => {
      let schema = { type: 'object', properties: { name: { type: 'string' } } };
      let result = util.copySchemaDefinition(schema);
      expect(result).to.eql({
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' }
        }
      });
    });

    it('should not inject an `id` property if `pk` is specified', () => {
      let schema = { type: 'object', properties: { name: { type: 'string' } } };
      let result = util.copySchemaDefinition(schema, { pk: 'name' });
      expect(result).to.eql({
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
    });
  }); // copySchemaDefinition

  describe('injectTermSupport', function() {
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
        let actual = util.injectTermSupport(t.schema);
        expect(actual).to.eql(t.expected);
      });
    });
  }); // injectTermSupport
}); // util
