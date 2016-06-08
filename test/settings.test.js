'use strict';
const TestFixture = require('./test-fixture'),
      assert = require('assert');

let config = {
  timeFormat: 'raw',
  validate: 'oncreate'
};

let test = new TestFixture();
describe('settings', function() {
  before(() => test.setup(config));
  after(() => test.teardown());

  describe('Options', function() {
    it('Options on the top level namespace', function() {
      assert.deepEqual(test.thinkagain.getOptions(), {
        timeFormat: 'raw',
        validate: 'oncreate'
      });
    });

    it('Options on a model', function() {
      let Model = test.thinkagain.createModel(test.table(), {
        type: 'object',
        properties: {
          id: { type: 'string' }, name: { type: 'string' }
        }
      }, {
        timeFormat: 'native',
        validate: 'onsave'
      });

      assert.deepEqual(Model.getOptions(), {
        timeFormat: 'native',
        validate: 'onsave'
      });

      // Make sure we didn't mess up the global options
      assert.deepEqual(test.thinkagain.getOptions(), {
        timeFormat: 'raw',
        validate: 'oncreate'
      });

      return Model.tableReady();
    });

    it('pk option on a model', function(done) {
      let Model = test.thinkagain.createModel(test.table(), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, {
        pk: 'path'
      });

      let r = test.r;
      Model.once('ready', () => {
        r.table(Model.getTableName()).info().run()
          .then(result => {
            assert.equal(result.primary_key, 'path');
            done();
          });
      });
    });

    it('table option on a model', function(done) {
      let Model = test.thinkagain.createModel(test.table(), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, {
        table: {
          durability: 'soft'
        }
      });

      let r = test.r;
      Model.once('ready', () => {
        r.table(Model.getTableName()).config().run()
          .then(result => {
            assert.equal(result.durability, 'soft');
            done();
          });
      });
    });

    it('Options on a document', function() {
      let Model = test.thinkagain.createModel(test.table(), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      });

      let doc = new Model({}, {
        timeFormat: 'raw',
        validate: 'onsave'
      });

      assert.deepEqual(doc._getOptions(), {
        timeFormat: 'raw',
        validate: 'onsave'
      });

      // Make sure we didn't messed up the global options
      assert.deepEqual(test.thinkagain.getOptions(), {
        timeFormat: 'raw',
        validate: 'oncreate'
      });
    });
  });

  describe('Priorities for options', function() {
    // it('thinkagain options are used by default', function() {
    //   /*
    //   thinkagain options:
    //     config['timeFormat'] = 'raw';
    //     config['validate'] = 'oncreate';
    //   */
    //   let Model = test.thinkagain.createModel(test.table(), {
    //     type: 'object',
    //     properties: {
    //       id: { type: 'string' },
    //       name: { type: 'string' }
    //     }
    //   });

    //   assert.throws(() => {
    //     let doc = new Model({});  // eslint-disable-line
    //   }, error => {
    //     return error.message === 'Value for [id] must be defined.';
    //   });
    // });

  });
});
