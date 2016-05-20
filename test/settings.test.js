'use strict';
let config = require('./config');

/*
 * Extend config with
 *  timeforma='ŕaw'
 *  enforce={
 *  extra: true
 *  missing: true
 *  type: 'strict'
 *  }
 */
config.timeFormat = 'raw';
config.enforce_extra =  'strict';
config.enforce_missing =  true;
config.enforce_type =  'strict';
config.validate = 'oncreate';

const thinky = require('../lib/thinky')(config),
      r = thinky.r,

      libUtil = require('../lib/util'),
      util = require('./util'),
      assert = require('assert');

describe('Options', function() {
  it('Options on the top level namespace', function() {
    assert.deepEqual(thinky.getOptions(), {
      timeFormat: 'raw',
      enforce_extra: 'strict',
      enforce_missing: true,
      enforce_type: 'strict',
      validate: 'oncreate'
    });
  });

  it('Options on a model', function() {
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String}, {
      timeFormat: 'native',
      enforce_extra: 'none',
      enforce_missing: false,
      enforce_type: 'loose',
      validate: 'onsave'
    });

    assert.deepEqual(Model.getOptions(), {
      timeFormat: 'native',
      enforce_extra: 'none',
      enforce_missing: false,
      enforce_type: 'loose',
      validate: 'onsave'
    });

    // Make sure we didn't messed up the global options
    assert.deepEqual(thinky.getOptions(), {
      timeFormat: 'raw',
      enforce_extra: 'strict',
      enforce_missing: true,
      enforce_type: 'strict',
      validate: 'oncreate'
    });
  });

  it('pk option on a model', function(done) {
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String}, {
      pk: 'path'
    });

    Model.once('ready', () => {
      r.table(Model.getTableName()).info().run()
        .then(result => {
          assert.equal(result.primary_key, 'path');
          done();
        });
    });
  });

  it('table option on a model', function(done) {
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String}, {
      table: {
        durability: 'soft'
      }
    });

    Model.once('ready', () => {
      r.table(Model.getTableName()).config().run()
        .then(result => {
          assert.equal(result.durability, 'soft');
          done();
        });
    });
  });

  it('Options on a document', function() {
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String});
    let doc = new Model({}, {
      timeFormat: 'raw',
      enforce_extra: 'none',
      enforce_missing: false,
      enforce_type: 'none',
      validate: 'onsave'
    });

    assert.deepEqual(doc._getOptions(), {
      timeFormat: 'raw',
      validate: 'onsave'
    });

    // Make sure we didn't messed up the global options
    assert.deepEqual(thinky.getOptions(), {
      timeFormat: 'raw',
      enforce_extra: 'strict',
      enforce_missing: true,
      enforce_type: 'strict',
      validate: 'oncreate'
    });
  });
});

describe('Priorities for options', function() {
  it('Thinky options are used by default', function() {
    /*
    Thinky options:
      config['timeFormat'] = 'raw';
      config['enforce_extra'] =  'strict';
      config['enforce_missing'] =  true;
      config['enforce_type'] =  'strict';
      config['validate'] = 'oncreate';
    */
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String});
    assert.throws(() => {
      let doc = new Model({});  // eslint-disable-line
    }, error => {
      return error.message === 'Value for [id] must be defined.';
    });
  });

  it("Thinky options can be overwritten by the Model's one", function() {
    /*
    Thinky options:
      config['timeFormat'] = 'raw';
      config['enforce_extra'] =  'strict';
      config['enforce_missing'] =  true;
      config['enforce_type'] =  'strict';
      config['validate'] = 'oncreate';
    */
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String}, {enforce_missing: false});
    let doc = new Model({});
    doc.validate();
  });

  it("Thinky options can be overwritten by the Document's one", function() {
    /*
    Thinky options:
      config['timeFormat'] = 'raw';
      config['enforce_extra'] =  'strict';
      config['enforce_missing'] =  true;
      config['enforce_type'] =  'strict';
      config['validate'] = 'oncreate';
    */
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String});
    let doc = new Model({}, {enforce_missing: false});
    doc.validate();
  });

  it('Thinky options can be overwritten by the options given to validate', function() {
    /*
    Thinky options:
      config['timeFormat'] = 'raw';
      config['enforce_extra'] =  'strict';
      config['enforce_missing'] =  true;
      config['enforce_type'] =  'strict';
      config['validate'] = 'oncreate';
    */
    let name = util.s8();
    let Model = thinky.createModel(name, {id: String, name: String}, {validate: 'onsave'});
    let doc = new Model({});
    doc.validate({enforce_missing: false});
  });

  it('Thinky options can be overwritten by the options in the schema', function() {
    /*
    Thinky options:
      config['timeFormat'] = 'raw';
      config['enforce_extra'] = 'strict';
      config['enforce_missing'] =  true;
      config['enforce_type'] =  'strict';
      config['validate'] = 'oncreate';
    */
    let name = util.s8();
    let Model = thinky.createModel(name, {id: {_type: String, options: {enforce_missing: false}}, name: {_type: String, options: {enforce_missing: false}}});
    let doc = new Model({});
    doc.validate();
  });
});

describe('mergeOptions', function() {
  it('mergeOptions - merge to an empty object', function() {
    let newOptions = libUtil.mergeOptions(undefined, {enforce_missing: true});
    assert.equal(newOptions.enforce_missing, true);
    assert.equal(newOptions.enforce_extra, undefined);
    assert.equal(newOptions.enforce_type, undefined);
  });

  it('mergeOptions - replace an existing option', function() {
    let existingOptions = {enforce_missing: true};
    let newOptions = libUtil.mergeOptions(existingOptions, {enforce_missing: false});
    assert.equal(newOptions.enforce_missing, false);
    assert.equal(newOptions.enforce_extra, undefined);
    assert.equal(newOptions.enforce_type, undefined);
  });

  it('mergeOptions - without affecting other options - enforce_missing', function() {
    let existingOptions = {enforce_type: 'strict', enforce_extra: false};
    let newOptions = libUtil.mergeOptions(existingOptions, {enforce_missing: true});
    assert.equal(newOptions.enforce_missing, true);
    assert.equal(newOptions.enforce_extra, false);
    assert.equal(newOptions.enforce_type, 'strict');
  });

  it('mergeOptions - without affecting other options - enforce_type', function() {
    let existingOptions = {enforce_missing: true, enforce_extra: false};
    let newOptions = libUtil.mergeOptions(existingOptions, {enforce_type: 'loose'});
    assert.equal(newOptions.enforce_missing, true);
    assert.equal(newOptions.enforce_extra, false);
    assert.equal(newOptions.enforce_type, 'loose');
  });

  it('mergeOptions - without affecting other options - enforce_extra', function() {
    let existingOptions = {enforce_missing: false, enforce_type: 'loose'};
    let newOptions = libUtil.mergeOptions(existingOptions, {enforce_extra: true});
    assert.equal(newOptions.enforce_missing, false);
    assert.equal(newOptions.enforce_extra, true);
    assert.equal(newOptions.enforce_type, 'loose');
  });

  it('mergeOptions - with empty new options object', function() {
    let existingOptions = {enforce_missing: true, enforce_extra: true, enforce_type: 'loose'};
    let newOptions = libUtil.mergeOptions(existingOptions, {});
    assert.equal(newOptions.enforce_missing, true);
    assert.equal(newOptions.enforce_extra, true);
    assert.equal(newOptions.enforce_type, 'loose');
  });

  it('mergeOptions - with undefined new options object', function() {
    let existingOptions = {enforce_missing: false, enforce_extra: false, enforce_type: 'strict'};
    let newOptions = libUtil.mergeOptions(existingOptions, undefined);
    assert.equal(newOptions.enforce_missing, false);
    assert.equal(newOptions.enforce_extra, false);
    assert.equal(newOptions.enforce_type, 'strict');
  });
});
