'use strict';
const TestFixture = require('./test-fixture'),
      util = require('./util'),
      assert = require('assert');

let test = new TestFixture();
describe('events', function() {
  before(() => test.setup());
  after(() => test.teardown());
  afterEach(() => test.cleanTables());

  it('Add events on doc', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    }, { init: false });

    let doc = new Model({});
    doc.addListener('foo', () => done());
    doc.emit('foo');
  });

  it('Events on model should be forward to documents', function(done) {
    let count = 0;
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    }, { init: false });

    Model.docOn('foo', () => {
      count++;
      if (count === 2) done();
    });

    let doc = new Model({});
    doc.emit('foo');
    doc.emit('foo');
  });

  it('Doc should emit save when saved', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    });

    let doc = new Model({});
    doc.once('saved', () => done());
    doc.save();
  });

  it('Doc should emit save when saved', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    });

    let doc = new Model({});
    doc.once('deleted', () => done());
    doc.save().then(() => doc.delete());
  });

  it('Doc should emit save when deleted -- hasAndBelongsToMany', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    });

    Model.hasAndBelongsToMany(Model, 'links', 'id', 'id');

    let doc1 = new Model({});
    let doc2 = new Model({});
    doc1.links = [doc2];

    doc2.once('deleted', () => done());
    doc1.saveAll({ links: true })
      .then(() => {
        assert.equal(doc2.isSaved(), true);
        return doc1.deleteAll({ links: true });
      })
      .then(() => assert.equal(doc2.isSaved(), false));
  });

  it('Doc should emit save when deleted -- hasMany', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: {
        id: { type: 'string' },
        foreignKey: { type: 'string' }
      }
    });

    Model.hasMany(Model, 'links', 'id', 'foreignKey');

    let doc1 = new Model({});
    let doc2 = new Model({});
    doc1.links = [doc2];

    doc2.once('deleted', () => done());
    doc1.saveAll({ links: true })
      .then(() => {
        assert.equal(doc2.isSaved(), true);
        return doc1.deleteAll({ links: true });
      })
      .then(() => assert.equal(doc2.isSaved(), false));
  });

  it('Test saving event', function() {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'number' } }
    });

    let doc = new Model({});
    doc.addListener('saving', _doc => { _doc.id = 1; });
    return doc.save()
      .then(() => {
        assert.equal(doc.id, 1);
        return Model.get(doc.id).run();
      })
      .then(result => assert.equal(result.id, 1));
  });

  it('Test saving event to validate a relation', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    });

    let OtherModel = test.thinkagain.createModel(test.table(1), {
      type: 'object', properties: {
        id: { type: 'string' },
        foreignKey: { type: 'string' }
      }
    });

    Model.hasOne(OtherModel, 'joinedDoc', 'id', 'foreignKey');
    let doc = new Model({});
    doc.addListener('saving', saveDoc => {
      if (saveDoc.joinedDoc === undefined) throw new Error('Relation must be defined.');
    });

    assert.throws(() => {
      doc.save();
    }, error => {
      return (error instanceof Error) && (error.message === 'Relation must be defined.');
    });

    let otherDoc = new OtherModel({});
    doc.joinedDoc = otherDoc;
    doc.saveAll(() => done());
  });

  it('Test retrieved event', function() {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'number' } }
    });

    let doc = new Model({ id: 1 });
    Model.addListener('retrieved', _doc => { _doc.id++; });
    return doc.save()
      .then(() => {
        assert.equal(doc.id, 1);
        return Model.get(doc.id).run();
      })
      .then(result => assert.equal(result.id, 2));
  });

  it('Test retrieved event for joined documents', function(done) {
    let Model = test.thinkagain.createModel(test.table(0), {
      type: 'object', properties: { id: { type: 'string' } }
    });

    let OtherModel = test.thinkagain.createModel(test.table(1), {
      type: 'object', properties: {
        id: { type: 'string' },
        foreignKey: { type: 'string' }
      }
    });

    Model.hasOne(OtherModel, 'joinedDoc', 'id', 'foreignKey');

    let doc = new Model({id: util.s8()});
    let otherDoc = new OtherModel({id: util.s8()});
    doc.joinedDoc = otherDoc;

    let count = 0;
    Model.addListener('retrieved', () => {
      count++;
      if (count === 2) done();
    });

    OtherModel.addListener('retrieved', () => {
      count++;
      if (count === 2) done();
    });

    doc.saveAll().then(() => Model.get(doc.id).getJoin().run());
  });
});
