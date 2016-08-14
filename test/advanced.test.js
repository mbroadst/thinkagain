'use strict';
const Promise = require('bluebird'),
      TestFixture = require('./test-fixture'),
      Errors = require('../lib/errors'),
      util = require('./util'),
      assert = require('assert');

let test = new TestFixture();
describe('Advanced cases', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('saveAll', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          otherId: { type: 'string' }
        }
      });
    });

    it('hasOne - belongsTo', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      return doc.saveAll()
        .then(result => {
          assert.strictEqual(doc, result);
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);

          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, doc.has.id);
          assert.equal(result.has.otherId, doc.has.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc.id);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('hasOne - belongsTo', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      return doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, doc.has.id);
          assert.equal(result.has.otherId, doc.has.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc.id);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('belongsTo - hasOne', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      otherDoc.belongsTo = doc;

      return otherDoc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.belongsTo.id, 'string');
          assert.equal(result.otherId, result.belongsTo.id);

          assert.strictEqual(result, otherDoc);
          assert.strictEqual(result.belongsTo, otherDoc.belongsTo);
          assert.strictEqual(otherDoc.belongsTo, doc);

          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, otherDoc.id);
          assert.equal(result.has.otherId, otherDoc.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc.id);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('belongsTo - hasOne -- circular references', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      otherDoc.belongsTo = doc;
      doc.has = otherDoc;

      return otherDoc.saveAll()
        .then(function(result) {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.belongsTo.id, 'string');
          assert.equal(result.otherId, result.belongsTo.id);

          assert.strictEqual(result, otherDoc);
          assert.strictEqual(result.belongsTo, otherDoc.belongsTo);
          assert.strictEqual(otherDoc.belongsTo, doc);

          return test.Model.get(doc.id).getJoin().run();
        })
        .then(function(result) {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, otherDoc.id);
          assert.equal(result.has.otherId, otherDoc.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin().run();
        })
        .then(function(result) {
          assert.equal(result.id, otherDoc.id);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('hasMany - belongsTo', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;

      return doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);

          return test.Model.get(doc.id)
            .getJoin({ has: { _apply: sequence => sequence.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has[0].id, doc.has[0].id);
          assert.equal(result.has[1].id, doc.has[1].id);
          assert.equal(result.has[2].id, doc.has[2].id);

          assert.equal(result.has[0].otherId, result.id);
          assert.equal(result.has[1].otherId, result.id);
          assert.equal(result.has[2].otherId, result.id);

          return test.OtherModel.run();
        })
        .then(result => {
          assert.equal(result.length, 3);
        });
    });

    it('hasMany - belongsTo - 2', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      values.has = otherDocs;
      let doc = new test.Model(values);

      return doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);
          return test.Model.get(doc.id)
            .getJoin({ has: { _apply: sequence => sequence.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has[0].id, doc.has[0].id);
          assert.equal(result.has[1].id, doc.has[1].id);
          assert.equal(result.has[2].id, doc.has[2].id);

          assert.equal(result.has[0].otherId, result.id);
          assert.equal(result.has[1].otherId, result.id);
          assert.equal(result.has[2].otherId, result.id);

          return test.OtherModel.run();
        })
        .then(result => {
          assert.equal(result.length, 3);
        });
    });

    it('hasMany - belongsTo', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      return doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);
          return test.Model.get(doc.id)
            .getJoin({ has: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has[0].id, doc.has[0].id);
          assert.equal(result.has[1].id, doc.has[1].id);
          assert.equal(result.has[2].id, doc.has[2].id);

          assert.equal(result.has[0].otherId, result.id);
          assert.equal(result.has[1].otherId, result.id);
          assert.equal(result.has[2].otherId, result.id);

          return test.OtherModel.getAll(doc.id, {index: 'otherId'}).getJoin().run();
        })
        .then(result => {
          assert.equal(result.length, 3);
        });
    });

    it('belongsTo - hasMany -- circular references', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      return otherDocs[0].saveAll()
        .then(result => {
          assert.equal(typeof otherDocs[0].id, 'string');
          assert.equal(otherDocs[0].belongsTo.id, doc.id);

          return otherDocs[1].saveAll();
        })
        .then(result => {
          assert.equal(typeof otherDocs[1].id, 'string');
          assert.equal(otherDocs[1].belongsTo.id, doc.id);

          return otherDocs[2].saveAll();
        })
        .then(result => {
          assert.equal(typeof otherDocs[2].id, 'string');
          assert.equal(otherDocs[2].belongsTo.id, doc.id);

          util.sortById(otherDocs);
          return test.Model.get(doc.id)
            .getJoin({ has: { _apply: seq =>  seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has[0].id, doc.has[0].id);
          assert.equal(result.has[1].id, doc.has[1].id);
          assert.equal(result.has[2].id, doc.has[2].id);

          assert.equal(result.has[0].otherId, result.id);
          assert.equal(result.has[1].otherId, result.id);
          assert.equal(result.has[2].otherId, result.id);

          return test.OtherModel.getAll(doc.id, {index: 'otherId'}).getJoin().run();
        })
        .then(result => {
          assert.equal(result.length, 3);
        });
    });

    it('hasAndBelongsToMany -- primary keys', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherValues = {};
      let doc1 = new test.Model(values);
      let doc2 = new test.Model(otherValues);
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          assert.equal(result.links[2].id, doc1.links[2].id);
          return test.Model.get(doc2.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links[0].id, doc2.links[0].id);
          assert.equal(result.links[1].id, doc2.links[1].id);
          assert.equal(result.links[2].id, doc2.links[2].id);
        });
    });

    it('hasAndBelongsToMany -- primary keys - 2', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherValues = {};
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      values.links = [otherDoc1, otherDoc2, otherDoc4];
      otherValues.links = [otherDoc2, otherDoc3, otherDoc4];
      let doc1 = new test.Model(values);
      let doc2 = new test.Model(otherValues);

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          assert.equal(result.links[2].id, doc1.links[2].id);
          return test.Model.get(doc2.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links[0].id, doc2.links[0].id);
          assert.equal(result.links[1].id, doc2.links[1].id);
          assert.equal(result.links[2].id, doc2.links[2].id);
        });
    });

    it('hasAndBelongsToMany -- multiple saves', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      values.links = [otherDoc1];
      let doc1 = new test.Model(values);

      return doc1.saveAll()
        .then(result => {
          doc1.links.push(otherDoc2);
          doc1.links.push(otherDoc3);
          doc1.links.push(otherDoc4);
          return doc1.saveAll();
        })
        .then(result => test.Model.get(doc1.id)
          .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
          .run())
        .then(result => {
          util.sortById(doc1.links);
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          assert.equal(result.links[2].id, doc1.links[2].id);
          assert.equal(result.links[3].id, doc1.links[3].id);
          return test.OtherModel.count().execute();
        })
        .then(result => {
          assert.equal(result, 4);
          return test.thinkagain.models[test.Model._joins.links.link].count().execute();
        })
        .then(result => {
          assert.equal(result, 4);
        });
    });

    it('hasAndBelongsToMany -- partial delete', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      values.links = [otherDoc1, otherDoc2, otherDoc3, otherDoc4];
      let doc1 = new test.Model(values);
      let removedOtherDocs;

      return doc1.saveAll()
        .then(result => {
          removedOtherDocs = doc1.links.slice(2);
          doc1.links = doc1.links.slice(0, 2);
          return doc1.saveAll();
        })
        .then(result => test.Model.get(doc1.id)
          .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
          .run())
        .then(result => {
          util.sortById(doc1.links);
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          return test.OtherModel.count().execute();
        })
        .then(result => {
          assert.equal(result, 4);
          return test.thinkagain.models[test.Model._joins.links.link].count().execute();
        })
        .then(result => {
          assert.equal(result, 2);

          doc1.links.push.apply(doc1.links, removedOtherDocs);
          return doc1.saveAll();
        })
        .then(result => test.OtherModel.count().execute())
        .then(result => {
          assert.equal(result, 4);
          return test.thinkagain.models[test.Model._joins.links.link].count().execute();
        })
        .then(result => {
          assert.equal(result, 2);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- circular references', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];
      otherDoc1.links2 = [doc1];
      otherDoc2.links2 = [doc1, doc2];
      otherDoc3.links2 = [doc2];
      otherDoc4.links2 = [doc1, doc2];

      return doc1.saveAll()
        .then(result => {
          // All docs are saved
          assert.equal(doc1.isSaved(), true);
          assert.equal(doc1.links[0].isSaved(), true);
          assert.equal(doc1.links[1].isSaved(), true);
          assert.equal(doc1.links[2].isSaved(), true);
          assert.strictEqual(doc1, result);

          // All saved docs have an id
          assert.equal(typeof doc1.id, 'string');
          assert.equal(typeof doc1.links[0].id, 'string');
          assert.equal(typeof doc1.links[1].id, 'string');
          assert.equal(typeof doc1.links[2].id, 'string');
          util.sortById(doc1.links);

          return doc2.saveAll();
        })
        .then(result => {
          // All docs are saved
          assert.equal(doc2.isSaved(), true);
          assert.equal(doc2.links[0].isSaved(), true);
          assert.equal(doc2.links[1].isSaved(), true);
          assert.equal(doc2.links[2].isSaved(), true);
          assert.strictEqual(doc2, result);

          // All saved docs have an id
          assert.equal(typeof doc2.id, 'string');
          assert.equal(typeof doc2.links[0].id, 'string');
          assert.equal(typeof doc2.links[1].id, 'string');
          assert.equal(typeof doc2.links[2].id, 'string');
          util.sortById(doc2.links);

          util.sortById(doc2.links);

          // doc1 and doc2 share two common links
          let map = {};
          for (let i = 0; i < doc1.links.length; i++) {
            map[doc1.links[i].id] = true;
          }
          let count = 0;
          for (let i = 0; i < doc2.links.length; i++) {
            if (map[doc2.links[i].id] != true) {  // eslint-disable-line
              count++;
            }
          }
          assert(count, 2);

          util.sortById(otherDoc1.links2);
          util.sortById(otherDoc2.links2);
          util.sortById(otherDoc3.links2);
          util.sortById(otherDoc4.links2);

          return test.Model.get(doc1.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          assert.equal(result.links[2].id, doc1.links[2].id);
          return test.Model.get(doc2.id)
            .getJoin({ links: { _apply: seq =>  seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links[0].id, doc2.links[0].id);
          assert.equal(result.links[1].id, doc2.links[1].id);
          assert.equal(result.links[2].id, doc2.links[2].id);
          return test.OtherModel.get(otherDoc1.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc1.id);
          assert.equal(result.links2[0].id, otherDoc1.links2[0].id);
          return test.OtherModel.get(otherDoc2.id)
            .getJoin({ links2: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc2.id);
          assert.equal(result.links2[0].id, otherDoc2.links2[0].id);
          assert.equal(result.links2[1].id, otherDoc2.links2[1].id);
          return test.OtherModel.get(otherDoc3.id)
            .getJoin({ links2: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc3.id);
          assert.equal(result.links2[0].id, otherDoc3.links2[0].id);
          return test.OtherModel.get(otherDoc4.id)
            .getJoin({ links2: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(function(result) {
          assert.equal(result.id, otherDoc4.id);
          assert.equal(result.links2[0].id, otherDoc4.links2[0].id);
          assert.equal(result.links2[1].id, otherDoc4.links2[1].id);
        });
    });
  });

  describe('deleteAll', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          otherId: { type: 'string' }
        }
      });
    });

    it('hasOne - belongsTo -- no arg', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);
          return doc.deleteAll();
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          done();
        });
    });

    it('hasOne - belongsTo -- with modelToDelete', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);

          return doc.deleteAll({ has: true });
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .error(function(error) {
          assert(error instanceof Errors.DocumentNotFound);
          done();
        });
    });

    it('hasOne - belongsTo -- with empty modelToDelete', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      return doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);

          return doc.deleteAll({});
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc.id);
        });
    });

    it('hasOne - belongsTo -- with non matching modelToDelete', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.has.id, 'string');
          assert.equal(result.id, result.has.otherId);

          assert.strictEqual(result, doc);
          assert.strictEqual(result.has, doc.has);
          assert.strictEqual(doc.has, otherDoc);

          return doc.deleteAll({ foo: { bar: true } });
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .then(result => {
          assert.equal(result.id, otherDoc.id);
          done();
        });
    });

    it('belongsTo - hasOne -- with no arg', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      otherDoc.belongsTo = doc;
      doc.has = otherDoc;

      otherDoc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.belongsTo.id, 'string');
          assert.equal(result.otherId, result.belongsTo.id);

          assert.strictEqual(result, otherDoc);
          assert.strictEqual(result.belongsTo, otherDoc.belongsTo);
          assert.strictEqual(otherDoc.belongsTo, doc);
          return otherDoc.deleteAll();
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .error(function(error) {
          assert(error instanceof Errors.DocumentNotFound);
          done();
        });
    });

    it('belongsTo - hasOne -- with modelToDelete', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      otherDoc.belongsTo = doc;
      doc.has = otherDoc;

      otherDoc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.belongsTo.id, 'string');
          assert.equal(result.otherId, result.belongsTo.id);

          assert.strictEqual(result, otherDoc);
          assert.strictEqual(result.belongsTo, otherDoc.belongsTo);
          assert.strictEqual(otherDoc.belongsTo, doc);

          return otherDoc.deleteAll({ belongsTo: true });
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          done();
        });
    });

    it('belongsTo - hasOne -- with empty modelToDelete', function(done) {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      otherDoc.belongsTo = doc;
      doc.has = otherDoc;

      otherDoc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(typeof result.belongsTo.id, 'string');
          assert.equal(result.otherId, result.belongsTo.id);

          assert.strictEqual(result, otherDoc);
          assert.strictEqual(result.belongsTo, otherDoc.belongsTo);
          assert.strictEqual(otherDoc.belongsTo, doc);

          return otherDoc.deleteAll({});
        })
        .then(result => test.Model.get(doc.id).run())
        .then(result => {
          assert.equal(result.id, doc.id);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          done();
        });
    });

    it('hasMany - belongsTo', function(done) {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(otherDocs[i].isSaved(), true);
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);
          return doc.deleteAll();
        })
        .then(result => {
          assert.equal(otherDocs[0].isSaved(), false);
          assert.equal(otherDocs[1].isSaved(), false);
          assert.equal(otherDocs[2].isSaved(), false);

          assert.equal(doc.isSaved(), false);

          return test.Model.get(doc.id).run();
        })
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).run();
        })
        .then(result => {
          assert.equal(result.length, 0);
          done();
        });
    });

    it('hasMany - belongsTo -- empty modelToDelete', function(done) {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);
          return doc.deleteAll({});
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id, { index: 'id' }).run();
        })
        .then(result => {
          assert.equal(result.length, 3);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).run();
        })
        .then(result => {
          assert.equal(result.length, 0);
          done();
        });
    });

    it('hasMany - belongsTo -- good modelToDelete', function(done) {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);

          return doc.deleteAll({ has: true });
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id, { index: 'id' }).run();
        })
        .then(result => {
          assert.equal(result.length, 0);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).run();
        })
        .then(result => {
          assert.equal(result.length, 0);
          done();
        });
    });

    it('hasMany - belongsTo -- non matching modelToDelete', function(done) {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      doc.saveAll()
        .then(result => {
          assert.equal(typeof result.id, 'string');
          assert.equal(result.has.length, 3);
          for (let i = 0; i < result.has.length; i++) {
            assert.equal(typeof result.has[i].id, 'string');
            assert.equal(result.has[i].otherId, result.id);
          }

          assert.strictEqual(result, doc);
          for (let i = 0; i < result.has.length; i++) {
            assert.strictEqual(result.has[i], doc.has[i]);
          }
          assert.strictEqual(doc.has, otherDocs);

          util.sortById(otherDocs);

          return doc.deleteAll({ foo: true });
        })
        .then(result => test.Model.get(doc.id).run())
        .error(error => {
          assert(error instanceof Errors.DocumentNotFound);
          return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id, { index: 'id' }).run();
        })
        .then(result => {
          assert.equal(result.length, 3);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).run();
        })
        .then(result => {
          assert.equal(result.length, 0);
          done();
        });
    });

    it('belongsTo - hasMany -- circular references', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let doc = new test.Model(values);
      let otherDoc1 = new test.OtherModel(values);
      let otherDoc2 = new test.OtherModel(values);
      let otherDoc3 = new test.OtherModel(values);
      let otherDocs = [ otherDoc1, otherDoc2, otherDoc3 ];

      doc.has = otherDocs;
      otherDoc1.belongsTo = doc;
      otherDoc2.belongsTo = doc;
      otherDoc3.belongsTo = doc;

      return doc.saveAll()
        .then(result => otherDoc1.deleteAll())
        .then(result => {
          assert.equal(otherDocs.length, 2);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          assert.equal(otherDoc3.isSaved(), false);
          return test.OtherModel.count().execute();
        })
        .then(result => assert.equal(result, 0));
    });

    it('belongsTo - hasMany -- must manually overwrite', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc0 = new test.OtherModel(otherValues);
      let otherDoc1 = new test.OtherModel(otherValues);
      let otherDoc2 = new test.OtherModel(otherValues);
      let otherDocs = [ otherDoc0, otherDoc1, otherDoc2 ];

      doc.has = otherDocs;
      otherDoc0.belongsTo = doc;
      otherDoc1.belongsTo = doc;
      otherDoc2.belongsTo = doc;

      return doc.saveAll()
        .then(result => otherDoc0.deleteAll({ belongsTo: { has: true } }))
        .then(result => {
          assert.equal(otherDoc0.isSaved(), false);
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          return test.OtherModel.count().execute();
        })
        .then(result => assert.equal(result, 0));
    });

    it('hasAndBelongsToMany -- primary keys', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return doc1.deleteAll();
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(doc2.isSaved(), true);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          assert.equal(otherDoc4.isSaved(), false);
          assert.equal(otherDoc3.isSaved(), true);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- bidirectional - 1', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      otherDoc1.links2 = [doc1];
      otherDoc2.links2 = [doc1, doc2];
      otherDoc3.links2 = [doc2];
      otherDoc4.links2 = [doc1, doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return doc1.deleteAll({links: {links2: true}});
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          assert.equal(otherDoc4.isSaved(), false);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(doc2.isSaved(), false);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- bidirectional - 2', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      otherDoc1.links2 = [doc1];
      otherDoc2.links2 = [doc1, doc2];
      otherDoc3.links2 = [doc2];
      otherDoc4.links2 = [doc1, doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return otherDoc4.deleteAll({links2: {links: true}});
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(doc2.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          assert.equal(otherDoc3.isSaved(), false);
          assert.equal(otherDoc4.isSaved(), false);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- bidirectional - 3', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      otherDoc1.links2 = [doc1];
      otherDoc2.links2 = [doc1, doc2];
      otherDoc3.links2 = [doc2];
      otherDoc4.links2 = [doc1, doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return otherDoc4.deleteAll();
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(doc2.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), false);
          assert.equal(otherDoc3.isSaved(), false);
          assert.equal(otherDoc4.isSaved(), false);
        });
    });

    it('hasAndBelongsToMany -- not primary keys - 1', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1:');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc4];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return otherDoc4.deleteAll({links2: {links: true}});
        })
        .then(result => {
          assert.equal(doc1.isSaved(), true);
          assert.equal(doc2.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(otherDoc4.isSaved(), false);
        });
    });

    it('hasAndBelongsToMany -- not primary keys - 2', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc4];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return otherDoc4.deleteAll();
        })
        .then(result => {
          assert.equal(doc1.isSaved(), true);
          assert.equal(doc2.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(otherDoc4.isSaved(), false);
        });
    });

    it('hasAndBelongsToMany -- not primary keys -- doing what should never be done - 1', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc3];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => doc2.saveAll())
        .then(result => otherDoc4.saveAll())
        .then(result => {
          util.sortById(doc1.links);
          util.sortById(doc2.links);
          return otherDoc4.deleteAll({ links2: true });
        })
        .then(result => {
          assert.equal(doc1.isSaved(), true);
          assert.equal(doc2.isSaved(), false);
          assert.deepEqual([
            otherDoc1.isSaved(),
            otherDoc2.isSaved(),
            otherDoc3.isSaved(),
            otherDoc4.isSaved()
          ], [true, true, true, false]);
        });
    });

    it('hasAndBelongsToMany -- not primary keys -- doing what should never be done - 2', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc3];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => doc2.saveAll())
        .then(result => otherDoc4.saveAll())
        .then(result => {
          util.sortById(doc1.links);
          util.sortById(doc2.links);
          return otherDoc4.deleteAll({ links2: { links: true } });
        })
        .then(result => {
          assert.equal(doc1.isSaved(), true);
          assert.equal(doc2.isSaved(), false);
          assert.deepEqual([
            otherDoc1.isSaved(),
            otherDoc2.isSaved(),
            otherDoc3.isSaved(),
            otherDoc4.isSaved()
          ], [false, true, false, false]);
        });
    });

    it('hasAndBelongsToMany -- not primary keys -- doing what should never be done - 3', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc3];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => doc2.saveAll())
        .then(result => otherDoc4.saveAll())
        .then(result => {
          util.sortById(doc1.links);
          util.sortById(doc2.links);
          return otherDoc4.deleteAll({ links2: { links: { links2: true } } });
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(doc2.isSaved(), false);
          assert.deepEqual([
            otherDoc1.isSaved(),
            otherDoc2.isSaved(),
            otherDoc3.isSaved(),
            otherDoc4.isSaved()
          ], [false, true, false, false]);
        });
    });

    it('hasAndBelongsToMany -- not primary keys -- doing what should never be done - 4', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'field1', 'field2');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links2', 'field2', 'field1');

      let doc1 = new test.Model({field1: 1});
      let doc2 = new test.Model({field1: 2});
      let otherDoc1 = new test.OtherModel({field2: 2});
      let otherDoc2 = new test.OtherModel({field2: 1});
      let otherDoc3 = new test.OtherModel({field2: 1});
      let otherDoc4 = new test.OtherModel({field2: 2});

      doc1.links = [otherDoc2, otherDoc3];
      doc2.links = [otherDoc1, otherDoc3];

      otherDoc1.links2 = [doc2];
      otherDoc2.links2 = [doc1];
      otherDoc3.links2 = [doc1];
      otherDoc4.links2 = [doc2];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return otherDoc4.saveAll();
        })
        .then(result => {
          //
          // otherdoc4 -> doc2 -> otherdoc1 -> doc2 -> otherdoc1
          //                    -> otherdoc3
          //           -> otherdoc3 -> doc1 -> otherdoc2
          //                    -> otherdoc3
          //
          // NOTE: We explicitly force twice the deletion of doc2...
          //
          return otherDoc4.deleteAll({ links2: { links: { links2: { links: true } } } });
        })
        .then(result => {
          assert.equal(doc1.isSaved(), false);
          assert.equal(doc2.isSaved(), false);
          assert.deepEqual([
            otherDoc1.isSaved(),
            otherDoc2.isSaved(),
            otherDoc3.isSaved(),
            otherDoc4.isSaved()
          ], [false, false, false, false]);
        });
    });
  });

  describe('getJoin', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          otherId: { type: 'string' }
        }
      });
    });

    it('hasOne - belongsTo', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin().run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, doc.has.id);
          assert.equal(result.has.otherId, doc.has.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc.has.id);
          assert.equal(result.otherId, doc.has.otherId);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('hasOne - belongsTo - non matching modelToGet', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin({ foo: true }).run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has, undefined);
          return test.OtherModel.get(otherDoc.id).getJoin({ foo: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc.has.id);
          assert.equal(result.otherId, doc.has.otherId);
          assert.equal(result.belongsTo, undefined);
        });
    });

    it('hasOne - belongsTo - matching modelToGet', function() {
      test.Model.hasOne(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDoc = new test.OtherModel(otherValues);

      doc.has = otherDoc;
      otherDoc.belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin({ has: true }).run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.id, doc.has.id);
          assert.equal(result.has.otherId, doc.has.otherId);
          return test.OtherModel.get(otherDoc.id).getJoin({ belongsTo: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc.has.id);
          assert.equal(result.otherId, doc.has.otherId);
          assert.equal(result.belongsTo.id, doc.id);
        });
    });

    it('hasMany - belongsTo -- matching modelToGet', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin({ has: true }).run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.length, 3);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).getJoin({ belongsTo: true }).run();
        })
        .then(result => {
          assert.equal(result.length, 3);
          for (let i = 0; i < result.length; i++) {
            assert.equal(result[i].belongsTo.id, doc.id);
          }
        });
    });

    it('hasMany - belongsTo -- non matching modelToGet', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin({ foo: true }).run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has, undefined);
          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).getJoin({ foo: true }).run();
        })
        .then(result => {
          assert.equal(result.length, 3);
          for (let i = 0; i < result.length; i++) {
            assert.equal(result[i].belongsTo, undefined);
          }
        });
    });

    it('hasMany - belongsTo -- default, fetch everything', function() {
      test.Model.hasMany(test.OtherModel, 'has', 'id', 'otherId');
      test.OtherModel.belongsTo(test.Model, 'belongsTo', 'otherId', 'id');

      let values = {};
      let otherValues = {};
      let doc = new test.Model(values);
      let otherDocs = [
        new test.OtherModel(otherValues), new test.OtherModel(otherValues), new test.OtherModel(otherValues)
      ];

      doc.has = otherDocs;
      otherDocs[0].belongsTo = doc;
      otherDocs[1].belongsTo = doc;
      otherDocs[2].belongsTo = doc;

      return doc.saveAll()
        .then(result => test.Model.get(doc.id).getJoin().run())
        .then(result => {
          assert.equal(result.id, doc.id);
          assert.equal(result.has.length, 3);

          return test.OtherModel.getAll(doc.id, { index: 'otherId' }).getJoin().run();
        })
        .then(result => {
          assert.equal(result.length, 3);
          for (let i = 0; i < result.length; i++) {
            assert.equal(result[i].belongsTo.id, doc.id);
          }
        });
    });

    it('hasAndBelongsToMany -- primary keys -- fetch everything by default', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links.length, doc1.links.length);
          return test.Model.get(doc2.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links.length, doc2.links.length);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- matching modelToGet', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id).getJoin({ links: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links.length, doc1.links.length);
          return test.Model.get(doc2.id).getJoin({ links: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links.length, doc2.links.length);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- non matching modelToGet', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id).getJoin({ links: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links.length, doc1.links.length);
          return test.Model.get(doc2.id).getJoin({ links: true }).run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links.length, doc2.links.length);
        });
    });

    it('hasAndBelongsToMany -- primary keys -- matching modelToGet with options', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.links = [otherDoc1, otherDoc2, otherDoc4];
      doc2.links = [otherDoc2, otherDoc3, otherDoc4];

      return doc1.saveAll()
        .then(result => {
          util.sortById(doc1.links);
          return doc2.saveAll();
        })
        .then(result => {
          util.sortById(doc2.links);
          return test.Model.get(doc1.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0].id);
          assert.equal(result.links[1].id, doc1.links[1].id);
          assert.equal(result.links[2].id, doc1.links[2].id);
          return test.Model.get(doc2.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links[0].id, doc2.links[0].id);
          assert.equal(result.links[1].id, doc2.links[1].id);
          assert.equal(result.links[2].id, doc2.links[2].id);
        });
    });
  });

  describe('pair', function() {
    afterEach(() => test.cleanTables());

    it('hasAndBelongsToMany -- pairs', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      Model.hasAndBelongsToMany(Model, 'links', 'id', 'id');

      let doc1 = new Model({});
      let doc2 = new Model({});
      let doc3 = new Model({});
      doc1.links = [doc2, doc3];
      doc2.links = [doc1];
      doc3.links = [doc1, doc2];

      return doc1.saveAll({ links: true })
        .then(result => doc2.saveAll({ links: true }))
        .then(result => doc3.saveAll({ links: true }))
        .then(result => Model.get(doc1.id).getJoin().run())
        .then(result => {
          assert.equal(result.links, undefined);
          return Model.get(doc1.id).getJoin({ links: true }).run();
        })
        .then(result => assert.equal(result.links.length, 2));
    });

    it('hasAndBelongsToMany -- pairs', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      Model.hasAndBelongsToMany(Model, 'links', 'id', 'id');

      let doc1 = new Model({});
      let doc2 = new Model({});

      doc1.links = [doc2];
      return doc1.saveAll({ links: true })
        .then(result => Model.get(doc1.id).getJoin({ links: true }).run())
        .then(result => assert.deepEqual(result.links[0], doc2));
    });

    it('hasOne/belongsTo -- pairs', function() {
      let Human = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          contactId: { type: 'string' }
        }
      });

      Human.belongsTo(Human, 'emergencyContact', 'contactId', 'id');

      let michel = new Human({
        name: 'Michel'
      });
      let sophia = new Human({
        name: 'Sophia'
      });

      michel.emergencyContact = sophia;
      return michel.saveAll({ emergencyContact: true })
        .then(result => {
          assert.strictEqual(michel, result);
          assert.equal(michel.isSaved(), true);
          assert.equal(sophia.isSaved(), true);
          assert.equal(sophia.id, michel.contactId);
        });
    });
  });

  describe('delete - hidden links behavior', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; delete test.RegressionModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      test.RegressionModel = test.thinkagain.createModel(test.table(3), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        },
        required: [ 'foreignKey' ]
      });
    });

    it('should work for hasOne - 1', function() {
      test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc.isSaved(), true);
          assert.equal(otherDoc.foreignKey, undefined);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.foreignKey, undefined);
        });
    });

    it('should work for hasOne - 2', function() {
      test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => otherDoc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc.isSaved(), false);
          assert.equal(doc.otherDoc, undefined);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.otherDoc, undefined);
        });
    });

    it('should work for hasOne - 3', function() {
      test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(_doc => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc.isSaved(), true);
          assert.equal(otherDoc.foreignKey, undefined);
          return test.OtherModel.get(otherDoc.id).run();
        })
        .then(_otherDoc => {
          assert.equal(_otherDoc.isSaved(), true);
          assert.equal(_otherDoc.foreignKey, undefined);
        });
    });

    it('should work for hasOne - 4', function() {
      test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      let _otherDoc, _doc;
      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => {
          _doc = result;
          _otherDoc = result.otherDoc;
          return _otherDoc.delete();
        })
        .then(() => {
          assert.equal(_doc.isSaved(), true);
          assert.equal(_otherDoc.isSaved(), false);
          assert.equal(_doc.otherDoc, undefined);
          return test.Model.get(_doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.otherDoc, undefined);
        });
    });

    it('should work for belongsTo - 1', function() {
      test.Model.belongsTo(test.OtherModel, 'otherDoc', 'foreignKey', 'id');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc.isSaved(), true);
        });
    });

    it('should work for belongsTo - 2', function() {
      test.Model.belongsTo(test.OtherModel, 'otherDoc', 'foreignKey', 'id');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => otherDoc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc.isSaved(), false);
          assert.equal(doc.otherDoc, undefined);
          assert.equal(doc.foreignKey, undefined);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.otherDoc, undefined);
          assert.equal(result.foreignKey, undefined);
        });
    });

    it('should work for belongsTo - 3', function() {
      test.Model.belongsTo(test.OtherModel, 'otherDoc', 'foreignKey', 'id');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(doc.otherDoc.isSaved(), true);
        });
    });

    it('should work for belongsTo - 4', function() {
      test.Model.belongsTo(test.OtherModel, 'otherDoc', 'foreignKey', 'id');

      let doc = new test.Model({});
      let otherDoc = new test.OtherModel({});
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => doc.otherDoc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc.isSaved(), false);
          assert.equal(doc.otherDoc, undefined);
          assert.equal(doc.foreignKey, undefined);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.otherDoc, undefined);
          assert.equal(result.foreignKey, undefined);
        });
    });

    it('should work for hasMany - 1', function() {
      test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      return doc.saveAll()
        .then(() => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), true);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(otherDoc1.foreignKey, undefined);
          assert.equal(otherDoc2.foreignKey, undefined);
          assert.equal(otherDoc3.foreignKey, undefined);
          return test.OtherModel.get(otherDoc1.id).run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.foreignKey, undefined);
        });
    });

    it('should work for hasMany - 2', function() {
      test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      return doc.saveAll()
        .then(() => otherDoc1.delete())
        .then(() => {
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.notEqual(otherDoc1.foreignKey, undefined);
          // We currently don't clean in this case
          assert.notEqual(otherDoc2.foreignKey, undefined);
          assert.notEqual(otherDoc3.foreignKey, undefined);
          assert.equal(doc.otherDocs.length, 2);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => assert.equal(result.otherDocs.length, 2));
    });

    it('should work for hasMany - 3', function() {
      test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      let _doc, _otherDoc1, _otherDoc2, _otherDoc3;
      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => {
          _doc = result;
          _otherDoc1 = result.otherDocs[0];
          _otherDoc2 = result.otherDocs[1];
          _otherDoc3 = result.otherDocs[2];
          return result.delete();
        })
        .then(() => {
          assert.equal(_doc.isSaved(), false);
          assert.equal(_otherDoc1.isSaved(), true);
          assert.equal(_otherDoc2.isSaved(), true);
          assert.equal(_otherDoc3.isSaved(), true);
          assert.equal(_otherDoc1.foreignKey, undefined);
          assert.equal(_otherDoc2.foreignKey, undefined);
          assert.equal(_otherDoc3.foreignKey, undefined);
          return test.OtherModel.get(_otherDoc1.id).run();
        })
        .then(result => {
          assert.equal(result.isSaved(), true);
          assert.equal(result.foreignKey, undefined);
        });
    });

    it('should work for hasMany - 4', function() {
      test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      let _doc, _otherDoc1, _otherDoc2, _otherDoc3;
      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => {
          _doc = result;
          _otherDoc1 = _doc.otherDocs[0];
          _otherDoc2 = _doc.otherDocs[1];
          _otherDoc3 = _doc.otherDocs[2];
          return _otherDoc1.delete();
        })
        .then(() => {
          assert.equal(_doc.isSaved(), true);
          assert.equal(_otherDoc1.isSaved(), false);
          assert.equal(_otherDoc2.isSaved(), true);
          assert.equal(_otherDoc3.isSaved(), true);
          assert.notEqual(_otherDoc1.foreignKey, undefined);
          // We currently don't clean in this case
          //assert.equal(otherDoc2.foreignKey, undefined);
          assert.notEqual(_otherDoc3.foreignKey, undefined);
          assert.equal(_doc.otherDocs.length, 2);
          return test.Model.get(_doc.id).getJoin().run();
        })
        .then(result => assert.equal(_doc.otherDocs.length, 2));
    });

    it('should work for hasAndBelongsToMany - 1', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      let r = test.r;
      return doc.saveAll()
        .then(() => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), true);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(doc.otherDocs.length, 3);
          return r.table(test.Model._getModel()._joins.otherDocs.link).count().run();
        })
        .then(result => assert.equal(result, 0));
    });

    it('should work for hasAndBelongsToMany - 2', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      return doc.saveAll()
        .then(() => otherDoc1.delete())
        .then(() => {
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(doc.otherDocs.length, 2);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => assert.equal(doc.otherDocs.length, 2));
    });

    it('should work for hasAndBelongsToMany - 3', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      let r = test.r;
      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(result => doc.delete())
        .then(() => {
          assert.equal(doc.isSaved(), false);
          assert.equal(otherDoc1.isSaved(), true);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(doc.otherDocs.length, 3);
          return r.table(test.Model._getModel()._joins.otherDocs.link).count().run();
        })
        .then(result => assert.equal(result, 0));
    });

    it('should work for hasAndBelongsToMany - 4', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');

      let doc = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      doc.otherDocs = [otherDoc1, otherDoc2, otherDoc3];

      return doc.saveAll()
        .then(() => test.Model.get(doc.id).getJoin().run())
        .then(_doc => {
          otherDoc1 = doc.otherDocs[0];
          otherDoc2 = doc.otherDocs[1];
          otherDoc3 = doc.otherDocs[2];
          return otherDoc1.delete();
        })
        .then(result => {
          assert.strictEqual(result, otherDoc1);
          assert.equal(doc.isSaved(), true);
          assert.equal(otherDoc1.isSaved(), false);
          assert.equal(otherDoc2.isSaved(), true);
          assert.equal(otherDoc3.isSaved(), true);
          assert.equal(doc.otherDocs.length, 2);
          return test.Model.get(doc.id).getJoin().run();
        })
        .then(result => assert.equal(doc.otherDocs.length, 2));
    });

    it('hasAndBelongsToMany -- with keys only', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherValues = {};
      let doc1 = new test.Model(values);
      let doc2 = new test.Model(otherValues);
      let otherDoc1 = new test.OtherModel({id: '1'});
      let otherDoc2 = new test.OtherModel({id: '2'});
      let otherDoc3 = new test.OtherModel({id: '3'});
      let otherDoc4 = new test.OtherModel({id: '4'});

      doc1.links = ['1', '2', '4'];
      doc2.links = ['2', '3', '4'];

      return test.OtherModel.save([otherDoc1, otherDoc2, otherDoc3, otherDoc4])
        .then(() => doc1.saveAll())
        .then(result => doc2.saveAll())
        .then(result =>
          test.Model.get(doc1.id).getJoin({ links: { _apply: seq => seq.orderBy('id') } }).run())
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links[0].id, doc1.links[0]);
          assert.equal(result.links[1].id, doc1.links[1]);
          assert.equal(result.links[2].id, doc1.links[2]);
          return test.Model.get(doc2.id)
            .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
            .run();
        })
        .then(result => {
          assert.equal(result.id, doc2.id);
          assert.equal(result.links[0].id, doc2.links[0]);
          assert.equal(result.links[1].id, doc2.links[1]);
          assert.equal(result.links[2].id, doc2.links[2]);
        });
    });

    it('hasAndBelongsToMany -- with keys only and a missing doc', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherValues = {};
      let doc1 = new test.Model(values);
      let doc2 = new test.Model(otherValues);
      let otherDoc1 = new test.OtherModel({id: '1'});
      let otherDoc2 = new test.OtherModel({id: '2'});
      let otherDoc3 = new test.OtherModel({id: '3'});
      //Missing doc
      //let otherDoc4 = new OtherModel({id: '4'});

      doc1.links = ['1', '2', '4'];
      doc2.links = ['2', '3', '4'];

      return test.OtherModel.save([otherDoc1, otherDoc2, otherDoc3])
      .then(() => doc1.saveAll())
      .then(() => doc2.saveAll())
      .then(result =>
        test.Model.get(doc1.id).getJoin({ links: { _apply: seq => seq.orderBy('id') } }).run())
      .then(result => {
        assert.equal(result.id, doc1.id);
        assert.equal(result.links.length, 2);
        assert.equal(result.links[0].id, doc1.links[0]);
        assert.equal(result.links[1].id, doc1.links[1]);
        //assert.equal(result.links[2].id, doc1.links[2]);
        return test.Model.get(doc2.id)
          .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
          .run();
      })
      .then(result => {
        assert.equal(result.id, doc2.id);
        assert.equal(result.links.length, 2);
        assert.equal(result.links[0].id, doc2.links[0]);
        assert.equal(result.links[1].id, doc2.links[1]);
        //assert.equal(result.links[2].id, doc2.links[2]);
        let otherDoc4 = new test.OtherModel({id: '4'});
        return otherDoc4.save();
      })
      .then(result =>
        test.Model.get(doc1.id).getJoin({ links: { _apply: seq => seq.orderBy('id') } }).run())
      .then(result => {
        assert.equal(result.id, doc1.id);
        assert.equal(result.links.length, 3);
        assert.equal(result.links[0].id, doc1.links[0]);
        assert.equal(result.links[1].id, doc1.links[1]);
        assert.equal(result.links[2].id, doc1.links[2]);
        return test.Model.get(doc2.id)
          .getJoin({ links: { _apply: seq => seq.orderBy('id') } })
          .run();
      })
      .then(result => {
        assert.equal(result.id, doc2.id);
        assert.equal(result.links.length, 3);
        assert.equal(result.links[0].id, doc2.links[0]);
        assert.equal(result.links[1].id, doc2.links[1]);
        assert.equal(result.links[2].id, doc2.links[2]);
      });
    });

    it('hasAndBelongsToMany -- Adding a new relation', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'links', 'id', 'id');
      test.OtherModel.hasAndBelongsToMany(test.Model, 'links', 'id', 'id');

      let values = {};
      let otherValues = {};
      let doc1 = new test.Model(values);
      let doc2 = new test.Model(otherValues);
      let otherDoc1 = new test.OtherModel({id: '1'});
      let otherDoc2 = new test.OtherModel({id: '2'});
      let otherDoc3 = new test.OtherModel({id: '3'});
      let otherDoc4 = new test.OtherModel({id: '4'});

      doc1.links = ['1', '2'];
      doc2.links = ['2', '3'];

      return test.OtherModel.save([otherDoc1, otherDoc2, otherDoc3, otherDoc4])
        .then(() => doc1.saveAll())
        .then(() => doc2.saveAll())
        .then(result => test.Model.get(doc1.id).run())
        .then(result => {
          result.links = ['4'];
          return result.saveAll({ links: true });
        })
        .then(result =>
          test.Model.get(doc1.id).getJoin({ links: { _apply: seq => seq.orderBy('id') } }).run())
        .then(result => {
          assert.equal(result.id, doc1.id);
          assert.equal(result.links.length, 3);
        });
    });

    it('Regression #356 - 1', function() {
      test.Model.hasMany(test.RegressionModel, 'others', 'id', 'foreignKey' );
      test.RegressionModel.belongsTo(test.Model, 'joined', 'foreignKey', 'id');

      let doc = new test.Model({
        id: '1',
        others: [
          {id: '10'},
          {id: '20'},
          {id: '30'}
        ]
      });

      return doc.saveAll({ others: true })
        .then(() => doc.others[1].delete())
        .then(() => {
          assert.equal(doc.others.length, 2);
          return doc.saveAll({ others: true });
        })
        .then(() => test.RegressionModel._get('20').execute())
        .then(result => assert.equal(result, null));
    });

    it('Regression #356 - 2', function() {
      test.Model.hasOne(test.RegressionModel, 'other', 'id', 'foreignKey' );
      test.RegressionModel.belongsTo(test.Model, 'joined', 'foreignKey', 'id');

      let doc = new test.Model({
        id: '1',
        other: {id: '10'}
      });

      return doc.saveAll({ other: true })
        .then(() => doc.other.delete())
        .then(() => {
          assert.equal(doc.other, undefined);
          return doc.saveAll({ other: true });
        })
        .then(() => test.RegressionModel._get('10').execute())
        .then(result => assert.equal(result, null));
    });
  });

  describe('manual joins', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });
    });

    it('innerJoin', function() {
      let doc = new test.Model({});
      let otherDocs = [
        new test.OtherModel({}), new test.OtherModel({}), new test.OtherModel({})
      ];
      let promises = [
        doc.save(), otherDocs[0].save(), otherDocs[1].save(), otherDocs[2].save()
      ];

      let r = test.r;
      return Promise.all(promises)
        .then(() =>
          test.Model.innerJoin(test.OtherModel.between(r.minval, r.maxval)._query, () => true).execute())
        .then(result => {
          assert.equal(result.length, 3);
          assert.deepEqual(result[0].left, doc);
          assert.deepEqual(result[1].left, doc);
          assert.deepEqual(result[2].left, doc);
        });
    });
  });

  describe('multiple hasAndBelongsToMany', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.Model; delete test.OtherModel; });
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      test.OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });
    });

    it('between two modes should work (not just pairs)', function() {
      test.Model.hasAndBelongsToMany(test.OtherModel, 'type1', 'id', 'id', { type: 'type1' });
      test.Model.hasAndBelongsToMany(test.OtherModel, 'type2', 'id', 'id', { type: 'type2' });
      test.OtherModel.hasAndBelongsToMany(test.Model, 'type1', 'id', 'id', { type: 'type1' });
      test.OtherModel.hasAndBelongsToMany(test.Model, 'type2', 'id', 'id', { type: 'type2' });

      let doc1 = new test.Model({});
      let doc2 = new test.Model({});
      let otherDoc1 = new test.OtherModel({});
      let otherDoc2 = new test.OtherModel({});
      let otherDoc3 = new test.OtherModel({});
      let otherDoc4 = new test.OtherModel({});

      doc1.type1 = [otherDoc1, otherDoc2];
      doc1.type2 = [otherDoc3, otherDoc4];
      doc2.type1 = [otherDoc3];
      doc2.type2 = [otherDoc1, otherDoc4];

      return doc1.saveAll({ type1: true, type2: true })
        .then(result => doc2.saveAll({ type1: true, type2: true }))
        .then(result => test.Model.get(doc1.id).getJoin({ type1: true, type2: true }).run())
        .then(result => {
          util.sortById(doc1.type1);
          util.sortById(doc1.type2);
          util.sortById(doc2.type1);
          util.sortById(doc2.type2);

          util.sortById(result.type1);
          util.sortById(result.type2);

          assert.equal(result.type1.length, 2);
          assert.equal(result.type1[0].id, doc1.type1[0].id);
          assert.equal(result.type1[1].id, doc1.type1[1].id);
          assert.equal(result.type2.length, 2);
          assert.equal(result.type2[0].id, doc1.type2[0].id);
          assert.equal(result.type2[1].id, doc1.type2[1].id);
          return test.Model.get(doc2.id).getJoin({ type1: true, type2: true }).run();
        })
        .then(result => {
          util.sortById(result.type1);
          util.sortById(result.type2);

          assert.equal(result.type1.length, 1);
          assert.equal(result.type1[0].id, doc2.type1[0].id);
          assert.equal(result.type2.length, 2);
          assert.equal(result.type2[0].id, doc2.type2[0].id);
          assert.equal(result.type2[1].id, doc2.type2[1].id);
          return test.OtherModel.get(otherDoc1.id).getJoin({ type1: true, type2: true }).run();
        })
        .then(result => {
          assert.equal(result.type1.length, 1);
          assert.equal(result.type1[0].id, doc1.id);
          assert.equal(result.type2.length, 1);
          assert.equal(result.type2[0].id, doc2.id);
          return test.OtherModel.get(otherDoc4.id).getJoin({ type1: true, type2: true }).run();
        })
        .then(result => {
          util.sortById(result.type2);
          let expected = [doc1, doc2];
          util.sortById(expected);

          assert.equal(result.type1.length, 0);
          assert.equal(result.type2.length, 2);
          assert.equal(result.type2[0].id, expected[0].id);
          assert.equal(result.type2[1].id, expected[1].id);
        });
    });
  });
});
