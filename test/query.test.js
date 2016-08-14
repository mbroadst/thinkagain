'use strict';
const Promise = require('bluebird'),
      Document = require('../lib/document'),
      TestFixture = require('./test-fixture'),
      Errors = require('../lib/errors'),
      util = require('./util'),
      assert = require('assert');

let test = new TestFixture();
describe('queries', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('Model queries', function() {
    after(() => test.cleanTables());
    before(function() {
      test.data = [];
      test.bag = {};
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let docs = [
        new test.Model({ str: util.s8(), num: util.random() }),
        new test.Model({ str: util.s8(), num: util.random() }),
        new test.Model({ str: util.s8(), num: util.random() })
      ];

      return Promise.map(docs, doc => doc.save())
        .then(data => {
          test.data = data;
          for (let i = 0, ii = data.length; i < ii; ++i) {
            test.bag[data[i].id] = data[i];
          }
        });
    });

    it('Model.run() should return', function() {
      return test.Model.run();
    });

    it('Model.run() should take a callback', function(done) {
      test.Model.run(done);
    });

    it('Model.run() should return the data', function() {
      return test.Model.run()
        .tap(result => assert.equal(result.length, 3))
        .then(result => {
          let newBag = {};
          for (let i = 0; i < result.length; i++) {
            newBag[result[i].id] = result[i];
          }

          assert.equal(result.length, 3);
          assert.deepEqual(test.bag, newBag);
        });
    });

    it('Model.run() should return instances of Document', function() {
      return test.Model.run()
        .tap(result => assert.equal(result.length, 3))
        .map(result => assert(result instanceof Document));
    });

    it('Model.run() should return instances of the model', function() {
      return test.Model.run()
        .tap(result => assert.equal(result.length, 3))
        .map(doc => {
          assert.deepEqual(doc.__proto__.constructor, test.Model);  // eslint-disable-line
          assert.deepEqual(doc.constructor, test.Model);
        });
    });

    it('Model.add(1).run() should be able to error', function(done) {
      test.Model.add(1).run()
        .error(error => {
          assert(error.message.match(/^Expected type DATUM but found TABLE/));
          done();
        });
    });

    it('Model.map(1).run should error', function(done) {
      test.Model.map(() => 1).run()
        .error(error => {
          assert.equal(error.message, 'The results could not be converted to instances of `' + test.Model.getTableName() + '`\nDetailed error: Cannot build a new instance of `' + test.Model.getTableName() + '` without an object');
          done();
        });
    });

    it('Model.get() should return the expected document', function() {
      return test.Model.get(test.data[0].id).run()
        .then(result => assert.deepEqual(test.data[0], result));
    });

    it('Model._get() should return null if no doc is found', function() {
      return test.Model._get('nonExistingId').execute()
        .then(result => assert.equal(result, null));
    });

    it('Model.get().merge(..) should throw before calling merge', function(done) {
      test.Model.get('NonExistingKey').merge({ foo: 'bar' }).run()
        .error(error => {
          assert(error.message.match(Errors.DOCUMENT_NOT_FOUND_REGEX));
          done();
        });
    });

    it('Model.get() should return an instance of the model', function() {
      return test.Model.get(test.data[0].id).run()
        .then(result => {
          assert.deepEqual(result.__proto__.constructor, test.Model); // eslint-disable-line
          assert.deepEqual(result.constructor, test.Model);
        });
    });

    it('Model.group("foo").run should work -- without extra argument', function() {
      return test.Model.group('foo').run()
        .map(group => Promise.map(group.reduction, reduction => {
          assert(reduction instanceof Document);
          assert(reduction.isSaved());
        }));
    });

    it('Model.group("foo").ungroup().run should work -- without extra argument', function() {
      return test.Model.group('foo').ungroup().run()
        .map(group => Promise.map(group.reduction, reduction => {
          assert(reduction instanceof Document);
          assert(reduction.isSaved());
        }));
    });

    it('Model.group("foo").ungroup().nth(0)("reduction").nth(0).run should work -- without extra argument', function() {
      return test.Model.group('foo').ungroup().nth(0).bracket('reduction').nth(0).run()
        .then(result => {
          assert(result instanceof Document);
          assert(result.isSaved());
        });
    });

    it('Model.group("foo").run should work', function() {
      return test.Model.group('foo').run({ groupFormat: 'raw' })
        .map(group => Promise.map(group.reduction, reduction => {
          assert(reduction instanceof Document);
          assert(reduction.isSaved());
        }));
    });

    it('Model.group("foo").run should not create instance of doc with groupFormat=native', function() {
      return test.Model.group('foo').run({ groupFormat: 'native' })
        .map(group => Promise.map(group.reduction, reduction => {
          assert.equal(reduction instanceof Document, false);
        }));
    });

    it('Model.filter() should work', function() {
      return test.Model.filter(true).run()
        .tap(result => assert.equal(result.length, 3))
        .then(result => {
          let newBag = {};
          for (let i = 0, ii = result.length; i < ii; ++i) {
            assert(result[i] instanceof Document);
            assert.deepEqual(result[i].__proto__.constructor, test.Model);  // eslint-disable-line
            assert.deepEqual(result[i].constructor, test.Model);
            newBag[result[i].id] = result[i];
          }

          assert.equal(result.length, 3);
          assert.deepEqual(test.bag, newBag);
        });
    });

    it('Model.filter(false) should work', function() {
      return test.Model.filter(false).run()
        .then(result => assert.equal(result.length, 0));
    });

    it('Model.execute should not return instances of the model', function() {
      return test.Model.execute()
        .then(result => {
          assert(!(result[0] instanceof Document));
          assert.equal(result.length, 3);
        });
    });

    it('Model.execute should work with a callback', function(done) {
      test.Model.execute(function(err, result) {
        if (!!err) return done(err);
        assert(!(result[0] instanceof Document));
        assert.equal(result.length, 3);
        done();
      });
    });

    it('Model.map(1).execute should work', function() {
      return test.Model.map(() => 1).execute()
        .then(result => {
          assert(!(result[0] instanceof Document));
          assert.equal(result.length, 3);
        });
    });

    it('Model.add(1).execute() should be able to error', function(done) {
      test.Model.add(1).execute()
        .error(error => {
          assert(error.message.match(/^Expected type DATUM but found TABLE/));
          done();
        });
    });
  });

  describe('getJoin', function() {
    describe('Joins - hasOne', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(() => {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');

        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        test.doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        test.doc.otherDoc = otherDoc;

        return test.doc.saveAll();
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            assert(result.otherDoc.isSaved());
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({ id: test.doc.id }).getJoin().run()
          .then(result => {
            assert.deepEqual([ test.doc ], result);
            assert(result[0].isSaved());
            assert(result[0].otherDoc.isSaved());
          });
      });
    });

    describe('Joins - belongsTo', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.Model.belongsTo(test.OtherModel, 'otherDoc', 'foreignKey', 'id');

        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        test.doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        test.doc.otherDoc = otherDoc;
        return test.doc.saveAll();
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            assert(result.otherDoc.isSaved());
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({ id: test.doc.id }).getJoin().run()
          .then(result => {
            assert.deepEqual([test.doc], result);
            assert(result[0].isSaved());
            assert(result[0].otherDoc.isSaved());
          });
      });
    });

    describe('Joins - hasMany with { additionalProperties: false }', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          },
          additionalProperties: false
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

        let docValues = {str: util.s8(), num: util.random()};
        test.doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        test.doc.otherDocs = otherDocs;
        return test.doc.saveAll()
          .then(doc => util.sortById(doc.otherDocs));
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            util.sortById(result.otherDocs);
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            for (let i = 0; i < result.otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
            }
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({ id: test.doc.id }).getJoin().run()
          .then(result => {
            util.sortById(result[0].otherDocs);
            assert.deepEqual([test.doc], result);
            assert(result[0].isSaved());
            for (let i = 0; i < result[0].otherDocs.length; i++) {
              assert.equal(result[0].otherDocs[i].isSaved(), true);
            }
          });
      });
    });

    describe('Joins - hasMany with removeExtra()', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        }
        // ).removeExtra()
        );

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

        let docValues = {str: util.s8(), num: util.random()};
        test.doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        test.doc.otherDocs = otherDocs;
        return test.doc.saveAll()
          .then(doc => util.sortById(doc.otherDocs));
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            util.sortById(result.otherDocs);
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            for (let i = 0; i < result.otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
            }
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({id: test.doc.id}).getJoin().run()
          .then(result => {
            util.sortById(result[0].otherDocs);
            assert.deepEqual([test.doc], result);
            assert(result[0].isSaved());
            for (let i = 0; i < result[0].otherDocs.length; i++) {
              assert.equal(result[0].otherDocs[i].isSaved(), true);
            }
          });
      });
    });

    describe('Joins - hasMany', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');

        let docValues = {str: util.s8(), num: util.random()};
        test.doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        test.doc.otherDocs = otherDocs;
        return test.doc.saveAll()
          .then(doc => util.sortById(doc.otherDocs));
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            util.sortById(result.otherDocs);
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            for (let i = 0; i < result.otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
            }
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({id: test.doc.id}).getJoin().run()
          .then(result => {
            util.sortById(result[0].otherDocs);
            assert.deepEqual([test.doc], result);
            assert(result[0].isSaved());
            for (let i = 0; i < result[0].otherDocs.length; i++) {
              assert.equal(result[0].otherDocs[i].isSaved(), true);
            }
          });
      });
    });

    describe('Joins - hasAndBelongsToMany', function() {
      after(() => {
        delete test.Model; delete test.OtherModel; delete test.doc;
        return test.cleanTables();
      });

      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });
        test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');

        let docValues = {str: util.s8(), num: util.random()};
        test.doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        test.doc.otherDocs = otherDocs;

        return test.doc.saveAll()
          .then(doc => util.sortById(doc.otherDocs));
      });

      it('should retrieve joined documents with object', function() {
        return test.Model.get(test.doc.id).getJoin().run()
          .then(result => {
            util.sortById(result.otherDocs);
            assert.deepEqual(test.doc, result);
            assert(result.isSaved());
            for (let i = 0; i < result.otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
            }
          });
      });

      it('should retrieve joined documents with sequence', function() {
        return test.Model.filter({id: test.doc.id}).getJoin().run()
          .then(result => {
            util.sortById(result[0].otherDocs);
            assert.deepEqual([test.doc], result);
            assert(result[0].isSaved());
            for (let i = 0; i < result[0].otherDocs.length; i++) {
              assert.equal(result[0].otherDocs[i].isSaved(), true);
            }
          });
      });
    });

    describe('options', function() {
      afterEach(() => test.cleanTables());

      it('hasMany - belongsTo', function() {
        let Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: { id: { type: 'string' } }
        });

        let OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            otherId: { type: 'string' }
          }
        });

        Model.hasMany(OtherModel, 'has', 'id', 'otherId');
        OtherModel.belongsTo(Model, 'belongsTo', 'otherId', 'id');

        let values = {};
        let otherValues = {};
        let doc = new Model(values);
        let otherDocs = [
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues)
        ];

        doc.has = otherDocs;

        return doc.saveAll()
          .then(result => Model.get(doc.id)
            .getJoin({ has: { _apply: seq => seq.orderBy('id').limit(5) } })
            .run())
          .then(result => {
            for (let i = 0; i < result.has.length; i++) {
              for (let j = i + 1; j < result.has.length; j++) {
                assert(result.has[i].id < result.has[j].id);
              }
            }
            assert.equal(result.has.length, 5);
          });
      });

      /***
       * NOTE: I don't quite understand this test
      it('_apply should work with count (not coerce to arrays)', function() {
        let Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: { id: { type: 'string' } }
        });

        let OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            otherId: { type: 'string' }
          }
        });

        Model.hasMany(OtherModel, 'has', 'id', 'otherId');
        OtherModel.belongsTo(Model, 'belongsTo', 'otherId', 'id');

        let values = {};
        let otherValues = {};
        let doc = new Model(values);
        let otherDocs = [
          new OtherModel(otherValues),
          new OtherModel(otherValues),
          new OtherModel(otherValues)
        ];

        doc.has = otherDocs;
        return doc.saveAll()
          .then(result => Model.get(doc.id)
            .getJoin({ has: { _apply: seq => seq.count(), _array: false } }).run())
          .then(result => assert.equal(result.has, 3))
      });
      */
    });

    describe('should not throw with missing keys', function() {
      afterEach(() => {
        delete test.Model; delete test.OtherModel;
        return test.cleanTables();
      });

      it('hasOne', function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasOne(test.OtherModel, 'otherDoc', 'str', 'foreignKey');

        let doc = new test.Model({
          id: util.s8(),
          num: 1
        });

        return doc.save()
          .then(() => test.Model.get(doc.id).getJoin().run())
          .then(result => assert.equal(result.otherDoc, undefined));
      });

      it('belongsTo', function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });
        test.Model.belongsTo(test.OtherModel, 'otherDoc', 'str', 'id');

        let docValues = {num: util.random(), foreignKey: util.s8()};
        let doc = new test.Model(docValues);

        return doc.save()
          .then(result => test.Model.get(result.id).getJoin().run())
          .then(result => assert.equal(result.otherDoc, undefined));
      });

      it('hasMany', function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });
        test.Model.hasMany(test.OtherModel, 'otherDocs', 'str', 'foreignKey');

        let docValues = {num: util.random()};
        let doc = new test.Model(docValues);
        return doc.save()
          .then(() => test.Model.get(doc.id).getJoin().run())
          .then(result => assert.equal(result.otherDocs, undefined));
      });

      it('hasAndBelongsToMany', function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        test.OtherModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });
        test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'str', 'id');

        let docValues = {num: util.random()};
        let doc = new test.Model(docValues);
        return doc.save()
          .then(result => test.Model.get(result.id).getJoin().run())
          .then(result => assert.equal(result.otherDocs, undefined));
      });
    });
  });

  describe('addRelation', function() {
    afterEach(() => test.cleanTables());

    it('hasOne - pk', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'otherDoc', 'id', 'foreignKey');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('otherDoc', {id: otherDoc.id}))
        .then(otherDocResult => {
          assert.equal(otherDocResult.foreignKey, doc.id);
          return Model.get(doc.id).getJoin({otherDoc: true}).run();
        })
        .then(result => {
          assert.equal(result.otherDoc.foreignKey, result.id);
          assert.deepEqual(result.otherDoc.id, otherDoc.id);
          assert.deepEqual(result.otherDoc.str, otherDoc.str);
          assert.deepEqual(result.otherDoc.name, otherDoc.name);
        });
    });

    it('hasMany - pk', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('otherDocs', {id: otherDoc.id}))
        .then(otherDocResult => {
          assert.equal(otherDocResult.foreignKey, doc.id);
          return Model.get(doc.id).getJoin({otherDocs: true}).run();
        })
        .then(result => {
          assert.equal(result.otherDocs.length, 1);
          assert.equal(result.otherDocs[0].foreignKey, result.id);
          assert.deepEqual(result.otherDocs[0].id, otherDoc.id);
          assert.deepEqual(result.otherDocs[0].str, otherDoc.str);
          assert.deepEqual(result.otherDocs[0].name, otherDoc.name);
        });
    });

    it('belongsTo - pk', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.belongsTo(OtherModel, 'otherDoc', 'foreignKey', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('otherDoc', {id: otherDoc.id}))
        .then(result => {
          assert.equal(result.foreignKey, otherDoc.str);
          return Model.get(result.id).getJoin({otherDoc: true}).run();
        })
        .then(result => {
          assert.equal(result.foreignKey, result.otherDoc.str);
          assert.deepEqual(result.otherDoc.id, otherDoc.id);
          assert.deepEqual(result.otherDoc.str, otherDoc.str);
          assert.deepEqual(result.otherDoc.name, otherDoc.name);
        });
    });

    it('belongsTo - field', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.belongsTo(OtherModel, 'otherDoc', 'foreignKey', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('otherDoc', {str: otherDoc.str}))
        .then(result => {
          assert.equal(result.foreignKey, otherDoc.str);
          return Model.get(result.id).getJoin({otherDoc: true}).run();
        })
        .then(result => {
          assert.equal(result.foreignKey, result.otherDoc.str);
          assert.deepEqual(result.otherDoc.id, otherDoc.id);
          assert.deepEqual(result.otherDoc.str, otherDoc.str);
          assert.deepEqual(result.otherDoc.name, otherDoc.name);
        });
    });

    it('hasAndBelongsToMany - pair - field', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(Model, 'others', 'id', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new Model({str: util.s8(), num: util.random()});
      let anotherDoc = new Model({str: otherDoc.str, num: util.random()});

      return doc.save()
      .then(() => otherDoc.save())
      .then(() => Model.get(doc.id).addRelation('others', {str: otherDoc.str}))
      .then(result => {
        assert.equal(result, true); // Change the default value?
        return Model.get(doc.id).getJoin({others: true}).run();
      })
      .then(result => {
        assert.equal(result.others.length, 1);
        return anotherDoc.save();
      })
      .then(() => Model.get(doc.id).getJoin({others: true}).run())
      .then(result => assert.equal(result.others.length, 2));
    });

    it('hasAndBelongsToMany - pair - id', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(Model, 'others', 'id', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new Model({str: util.s8(), num: util.random()});
      let anotherDoc = new Model({str: otherDoc.str, num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('others', {id: otherDoc.id}))
        .then(result => {
          assert.equal(result, true); // Change the default value?
          return Model.get(doc.id).getJoin({others: true}).run();
        })
        .then(result => {
          assert.equal(result.others.length, 1);
          return anotherDoc.save();
        })
        .then(() => Model.get(doc.id).getJoin({others: true}).run())
        .then(result => assert.equal(result.others.length, 2));
    });

    it('hasAndBelongsToMany - id', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'others', 'id', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});
      let anotherDoc = new OtherModel({str: otherDoc.str, num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('others', {id: otherDoc.id}))
        .then(result => {
          assert.equal(result, true); // Change the default value?
          return Model.get(doc.id).getJoin({others: true}).run();
        })
        .then(result => anotherDoc.save())
        .then(() => Model.get(doc.id).getJoin({others: true}).run())
        .then(result => assert.equal(result.others.length, 2));
    });

    it('hasAndBelongsToMany - field', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'others', 'id', 'str');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc = new OtherModel({str: util.s8(), num: util.random()});
      let anotherDoc = new OtherModel({str: otherDoc.str, num: util.random()});

      return doc.save()
        .then(() => otherDoc.save())
        .then(() => Model.get(doc.id).addRelation('others', {str: otherDoc.str}))
        .then(result => {
          assert.equal(result, true); // Change the default value?
          return Model.get(doc.id).getJoin({others: true}).run();
        })
        .then(() => anotherDoc.save())
        .then(() => Model.get(doc.id).getJoin({others: true}).run())
        .then(result => assert.equal(result.others.length, 2));
    });
  });

  describe('removeRelation', function() {
    afterEach(() => test.cleanTables());

    it('should work for hasOne', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'otherDoc', 'id', 'foreignKey');

      let docValues = { str: util.s8(), num: util.random() };
      let otherDocValues = { str: util.s8(), num: util.random() };

      let doc = new Model(docValues);
      let otherDoc = new OtherModel(otherDocValues);
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(result => Model.get(result.id).removeRelation('otherDoc').run())
        .then(otherDocResults => {
          assert.equal(otherDocResults.id, otherDoc.id);
          assert.equal(otherDocResults.str, otherDoc.str);
          assert.equal(otherDocResults.num, otherDoc.num);
          return OtherModel.get(otherDoc.id).run();
        })
        .then(result => assert.equal(result.foreignKey, undefined));
    });

    it('should work for hasMany - all', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'foreignKey');

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc = new OtherModel(otherDocValues);
      doc.otherDocs = [otherDoc];

      return doc.saveAll()
        .then(result => Model.get(result.id).removeRelation('otherDocs').run())
        .then(otherDocResults => {
          assert.equal(otherDocResults.length, 1);
          assert.equal(otherDocResults[0].id, otherDoc.id);
          assert.equal(otherDocResults[0].str, otherDoc.str);
          assert.equal(otherDocResults[0].num, otherDoc.num);
          return OtherModel.get(otherDoc.id).run();
        })
        .then(result => assert.equal(result.foreignKey, undefined));
    });

    it('should work for hasMany - one', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'foreignKey');

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues1 = {str: util.s8(), num: util.random()};
      let otherDocValues2 = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc1 = new OtherModel(otherDocValues1);
      let otherDoc2 = new OtherModel(otherDocValues2);
      doc.otherDocs = [otherDoc1, otherDoc2];

      return doc.saveAll()
        .then(result => Model.get(result.id).removeRelation('otherDocs', {id: otherDoc2.id}).run())
        .then(otherDocResults => {
          assert.equal(otherDocResults.length, 1);
          assert.equal(otherDocResults[0].id, otherDoc2.id);
          assert.equal(otherDocResults[0].str, otherDoc2.str);
          assert.equal(otherDocResults[0].num, otherDoc2.num);
          return Model.get(doc.id).getJoin({otherDocs: true}).run();
        })
        .then(result => {
          assert.equal(result.otherDocs.length, 1);
          assert.equal(result.otherDocs[0].id, otherDoc1.id);
        });
    });

    it('should work for belongsTo', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      Model.belongsTo(OtherModel, 'otherDoc', 'foreignKey', 'id');

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc = new OtherModel(otherDocValues);
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(result => Model.get(result.id).removeRelation('otherDoc').run())
        .then(docResult => {
          assert.equal(docResult.foreignKey, undefined);
          assert.equal(docResult.id, doc.id);
          assert.equal(docResult.str, doc.str);
          assert.equal(docResult.num, doc.num);
          return Model.get(doc.id).run();
        })
        .then(result => assert.equal(result.foreignKey, undefined));
    });

    it('should work for hasAndBelongsTo - all', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'id');

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc = new OtherModel(otherDocValues);
      doc.otherDocs = [otherDoc];

      return doc.saveAll({otherDocs: true})
        .then(result => Model.get(result.id).removeRelation('otherDocs').run())
        .then(() => Model.get(doc.id).getJoin({otherDocs: true}).run())
        .then(result => assert.equal(result.otherDocs.length, 0));
    });

    it('should work for hasAndBelongsTo - one', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'id');

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues1 = {str: util.s8(), num: util.random()};
      let otherDocValues2 = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc1 = new OtherModel(otherDocValues1);
      let otherDoc2 = new OtherModel(otherDocValues2);
      doc.otherDocs = [otherDoc1, otherDoc2];

      return doc.saveAll({otherDocs: true})
        .then(result => Model.get(result.id).removeRelation('otherDocs', {id: otherDoc2.id}).run())
        .then(() => Model.get(doc.id).getJoin({otherDocs: true}).run())
        .then(result => {
          assert.equal(result.otherDocs.length, 1);
          assert.equal(result.otherDocs[0].id, otherDoc1.id);
        });
    });

    it('should work for hasAndBelongsToMany - pair - all', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(Model, 'others', 'id', 'id');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc1 = new Model({str: util.s8(), num: util.random()});
      let otherDoc2 = new Model({str: util.s8(), num: util.random()});
      doc.others = [otherDoc1, otherDoc2];

      return doc.saveAll({others: true})
        .then(result => Model.get(result.id).removeRelation('others').run())
        .then(() => Model.get(doc.id).getJoin({'others': true}).run())
        .then(result => assert.equal(result.others.length, 0));
    });

    it('should work for hasAndBelongsToMany - pair - one', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(Model, 'others', 'id', 'id');

      let doc = new Model({str: util.s8(), num: util.random()});
      let otherDoc1 = new Model({str: util.s8(), num: util.random()});
      let otherDoc2 = new Model({str: util.s8(), num: util.random()});
      doc.others = [otherDoc1, otherDoc2];

      return doc.saveAll({others: true})
        .then(result => Model.get(result.id).removeRelation('others', {id: otherDoc2.id}).run())
        .then(() => Model.get(doc.id).getJoin({'others': true}).run())
        .then(result => {
          assert.equal(result.others.length, 1);
          assert.equal(result.others[0].id, otherDoc1.id);
        });
    });
  });

  describe('Query.run() should take options', function() {
    after(() => {
      delete test.Model; delete test.data;
      return test.cleanTables();
    });

    before(function() {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      let docs = [
        new test.Model({ str: util.s8(), num: 1 }),
        new test.Model({ str: util.s8(), num: 1 }),
        new test.Model({ str: util.s8(), num: 2 })
      ];

      return Promise.map(docs, doc => doc.save())
        .then(data => { test.data = data; });
    });

    it('Query.run() should return a DocumentNotFound error if no document is found - 1', function(done) {
      test.Model.get(0).run()
        .catch(Errors.DocumentNotFound, err => {
          assert(err.message.match(Errors.DOCUMENT_NOT_FOUND_REGEX));
          done();
        });
    });

    it('Query.run() should return a DocumentNotFound error if no document is found - 2', function(done) {
      test.Model.get(0).run()
        .error(err => {
          assert(err instanceof Errors.DocumentNotFound);
          assert(err.message.match(Errors.DOCUMENT_NOT_FOUND_REGEX));
          done();
        });
    });

    it('Query.run() should parse objects in each group', function() {
      return test.Model.group('num').run()
        .tap(result => assert.equal(result.length, 2))
        .map(result => {
          assert(result.group);
          assert(result.reduction.length > 0);
          return Promise.map(result.reduction, reduction => assert.equal(reduction.isSaved(), true));
        });
    });

    it('Query.run({groupFormat: "raw"}) should be ignored', function() {
      return test.Model.group('num').run({groupFormat: 'raw'})
        .tap(results => assert.equal(results.length, 2))
        .map(result => {
          assert(result.group);
          assert(result.reduction.length > 0);
        });
    });

    it('Query.execute({groupFormat: "raw"}) should not be ignored', function() {
      return test.Model.group('num').execute({groupFormat: 'raw'})
        .then(result => {
          assert.equal(result.$reql_type$, 'GROUPED_DATA');
          assert.equal(result.data.length, 2);
          return Promise.map(result.data, data => assert.equal(data.length, 2));
        });
    });

    it('Query.group("num").count().run() should not work', function(done) {
      test.Model.group('num').count().run()
        .error(function(err) { done(); });
    });

    it('Query.group("num").max("id").run() should not work', function() {
      return test.Model.group('num').max('id').run()
        .then(result => {
          assert.equal(result.length, 2);
          assert(result[0].reduction instanceof Document);
        });
    });

    it('Query.group("num").count().execute() should work', function() {
      return test.Model.group('num').count().execute()
        .then(result => {
          assert.equal(result.length, 2);
          assert((result[0].reduction === 2 && result[0].group === 1) || (result[0].reduction === 1 && result[0].group === 2));
        });
    });
  });

  describe('thinkagain.Query', function() {
    afterEach(() => test.cleanTables());

    it('Manual query', function() {
      let Query = test.thinkagain.Query;
      let r = test.thinkagain.r;
      let User = test.thinkagain.createModel(test.table(0), {
        type: 'object', properties: { id: { type: 'string' } }
      });

      let savedUser;
      let query = new Query(User, r);
      return query.expr(1).execute()
        .then(result => {
          assert.equal(result, 1);
          let user = new User({});
          return user.save();
        })
        .then(saved => {
          savedUser = saved;
          query = new Query(User, r);
          return query.table(User.getTableName()).nth(0).run();
        })
        .then(doc => assert.deepEqual(doc, savedUser));
    });
  });

  describe('then', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.User; });
    before(() => {
      test.User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });
      return test.User.tableReady();
    });

    it('should run the query and call handler (naked table)', function(done) {
      test.User.then(() => done());
    });

    it('should run the query and call handler', function(done) {
      test.User.filter({}).then(() => done());
    });

    it('should return a promise', function(done) {
      let promise = test.User.filter({}).then(function() {});
      assert(promise instanceof Promise, 'not a promise');
      promise.finally(() => done());
    });
  });

  describe('error', function() {
    afterEach(() => test.cleanTables());

    it('should run the query and call handler', function(done) {
      let r = test.r;
      let User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, {init: false});

      User.filter(r.error('test'))
        .error(() => done());
    });

    it('should return a promise', function(done) {
      let r = test.r;
      let User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let promise = User.filter(r.error('test')).error(() => {});
      assert(promise instanceof Promise, 'not a promise');
      promise.finally(() => done());
    });
  });

  describe('catch', function() {
    afterEach(() => test.cleanTables());

    it('should run the query and call handler', function(done) {
      let r = test.r;
      let User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false});

      User.filter(r.error('test')).catch(() => done());
    });

    it('should return a promise', function(done) {
      let r = test.r;
      let User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let promise = User.filter(r.error('test')).catch(function() {});
      assert(promise instanceof Promise, 'not a promise');
      promise.finally(() => done());
    });
  });

  describe('finally', function() {
    afterEach(() => test.cleanTables());
    after(() => { delete test.User; });
    before(() => {
      test.User = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });
      return test.User.tableReady();
    });

    it('should run the query and call handler', function(done) {
      test.User.filter({}).finally(() => done());
    });

    it('should return a promise', function(done) {
      let promise = test.User.filter({}).finally(() => {});
      assert(promise instanceof Promise, 'not a promise');
      promise.finally(() => done());
    });
  });

  describe('clone', function() {
    afterEach(() => test.cleanTables());

    it('people should be able to fork queries', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });
      let query = Model.filter(true);

      let count = 0;
      query.count().execute()
        .then(result => {
          assert.equal(result, 0);
          count++;
          if (count === 2) { done(); }
        });

      query.count().add(1).execute()
        .then(result => {
          assert.equal(result, 1);
          count++;
          if (count === 2) { done(); }
        });
    });
  });

  describe('optimizer', function() {
    afterEach(() => test.cleanTables());

    // Test that the queries built under the hood are optimized by having the server throw an error
    before(function(done) {
      let r = test.r;
      let name = util.s8();
      r.tableCreate(name).run()
        .then(result => r.table(name).indexCreate('name1').run())
        .then(() => {
          test.Model = test.thinkagain.createModel(test.table(0), {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name1: { type: 'string' },
              name2: { type: 'string' },
              hasOneKey: { type: 'string' },
              belongsToKey: { type: 'string' },
              hasMany: { type: 'string' },
              hasAndBelongsToMany1: { type: 'string' },
              hasAndBelongsToMany2: { type: 'string' }
            }
          });

          test.Model.hasOne(test.Model, 'other', 'id', 'hasOneKey');
          test.Model.hasMany(test.Model, 'others', 'id', 'hasManyKey');
          test.Model.belongsTo(test.Model, 'belongsTo', 'belongsToKey', 'belongsToLink');
          test.Model.hasAndBelongsToMany(test.Model, 'manyToMany', 'hasAndBelongsToMany1', 'hasAndBelongsToMany2');

          test.Model.ensureIndex('name1');
          test.Model.once('ready', () => done());
        });
    });

    it('orderBy should be able to use an index - thanks to ensureIndex', function() {
      let query = test.Model.orderBy('name1').toString();
      assert(query.match(/index: "name1"/));
    });

    it('orderBy should be able to use an index - thanks to hasOne', function() {
      let query = test.Model.orderBy('hasOneKey').toString();
      assert(query.match(/index: "hasOneKey"/));
    });

    it('orderBy should be able to use an index - thanks to hasMany', function() {
      let query = test.Model.orderBy('hasManyKey').toString();
      assert(query.match(/index: "hasManyKey"/));
    });

    it('orderBy should be able to use an index - thanks to belongsTo', function() {
      let query = test.Model.orderBy('belongsToLink').toString();
      assert(query.match(/index: "belongsToLink"/));
    });

    it('orderBy should be able to use an index - thanks to hasAndBelongsToMany - 1', function() {
      let query = test.Model.orderBy('hasAndBelongsToMany1').toString();
      assert(query.match(/index: "hasAndBelongsToMany1"/));
    });

    it('orderBy should be able to use an index - thanks to hasAndBelongsToMany - 2', function() {
      let query = test.Model.orderBy('hasAndBelongsToMany2').toString();
      assert(query.match(/index: "hasAndBelongsToMany2"/));
    });

    it('orderBy should be able to use an index - thanks to indexList', function() {
      let query = test.Model.orderBy('name1').toString();
      assert(query.match(/index: "name1"/));
    });

    it('filter should be able to use an index - single field', function() {
      let query = test.Model.filter({name1: 'Michel'}).toString();
      assert(query.match(/index: "name1"/));
    });

    it('filter should be able to use an index - multiple fields', function() {
      let query = test.Model.filter({name1: 'Michel', foo: 'bar'}).toString();
      assert.equal(query.replace(/\s/g, ''), 'r.table("' + test.Model.getTableName() + '").getAll("Michel",{index:"name1"}).filter({foo:"bar"})');
    });

    it('filter should not optimize a field without index', function() {
      let query = test.Model.filter({name2: 'Michel'}).toString();
      assert.equal(query.match(/index: "name2"/), null);
    });

    it('filter should use an index only on a table', function() {
      let query = test.Model.filter({foo: 'bar'}).filter({name1: 'Michel'}).toString();
      assert(query.match(/index: "name1"/) === null);
    });
  });

  describe('In place writes', function() {
    after(() => { delete test.Model; });
    afterEach(() => test.cleanTables());
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          num: { type: 'number' }
        }
      });
    });

    it('Point write - valid', function() {
      let doc = new test.Model({id: util.s8(), num: 0});
      return doc.save()
        .then(() => test.Model.get(doc.id).update({num: 1}).run())
        .then(result => {
          assert(result);
          assert.equal(result.id, doc.id);
          assert.equal(result.num, 1);
          return test.Model.get(doc.id).update({num: 1}).run();
        })
        .then(result => assert.deepEqual(result, {id: doc.id, num: 1}));
    });

    it('Point write - post non valid - primary key is a string', function(done) {
      let r = test.r;
      let doc = new test.Model({id: util.s8(), num: 0});
      doc.save()
        .then(() => test.Model.get(doc.id).update({num: r.expr('foo')}).run())
        .error(error => {
          assert(error instanceof Errors.ThinkAgainError);
          assert(error.message.match('The write failed, and the changes were reverted'));
          return test.Model.get(doc.id).run();
        })
        .then(result => {
          assert.deepEqual(doc, result);
          done();
        });
    });

    it('Point write - post non valid - primary key not a string', function(done) {
      let Model = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'number' },
          num: { type: 'number' }
        }
      });

      let r = test.r;
      let doc = new Model({id: 1, num: 0});
      doc.save()
        .then(() => Model.get(doc.id).update({num: r.expr('foo')}).run())
        .error(error => {
          assert(error.message.match('The write failed, and the changes were reverted'));
          return Model.get(doc.id).run();
        })
        .then(result => {
          assert.deepEqual(doc, result);
          done();
        });
    });

    it('Range write - valid', function() {
      let docs = [{id: util.s8(), num: 0}, {id: util.s8(), num: 0}];
      return test.Model.save(docs)
        .then(() => test.Model.update({num: 1}).run())
        .then(result => {
          assert(result);
          docs.sort(function(a, b) { return (a.id > b.id) ? 1 : -1; });
          result.sort(function(a, b) { return (a.id > b.id) ? 1 : -1; });

          assert.equal(result[0].id, docs[0].id);
          assert.equal(result[1].id, docs[1].id);
          assert.equal(result[0].num, 1);
          assert.equal(result[1].num, 1);
        });
    });

    it('Range write with one doc - valid', function() {
      let docs = [{id: util.s8(), num: 0}, {id: util.s8(), num: 0}];
      return test.Model.save(docs)
        .then(() => test.Model.filter({id: docs[0].id}).update({num: 1}).run())
        .then(result => {
          assert(Array.isArray(result));
          assert.equal(result[0].id, docs[0].id);
          assert.equal(result[0].num, 1);
        });
    });

    it('Range write - post non valid - primary key is a string', function(done) {
      let r = test.r;
      let docs = [{id: util.s8(), num: 0}, {id: util.s8(), num: 1}];

      test.Model.save(docs)
        .then(() => test.Model.update({num: r.expr('foo')}).run())
        .error(error => {
          assert(error.message.match('The write failed, and the changes were reverted'));
          return test.Model.run();
        })
        .then(result => {
          result.sort(function(a, b) { return (a.num > b.num) ? 1 : -1; });
          assert.equal(result[0].num, 0);
          assert.equal(result[1].num, 1);
          done();
        });
    });

    // it('Range write - post non valid - primary key is not a string', function(done) {
    //   let r = test.r;
    //   let docs = [{id: 0, num: 0}, {id: 1, num: 1}];

    //   return test.Model.save(docs)
    //   .then(() => test.Model.update({num: r.expr('foo')}).run())
    //   .error(error => {
    //     assert(error.message.match('The partial value is not valid, so the write was not executed.'));
    //     return test.Model.run();
    //   })
    //   .then(result => {
    //     result.sort(function(a, b) { return (a.num > b.num) ? 1 : -1; });
    //     assert.equal(result[0].num, 0);
    //     assert.equal(result[1].num, 1);
    //     done();
    //   });
    // });

    it('Point write - pre non valid', function(done) {
      let doc = new test.Model({id: util.s8(), num: 0});
      doc.save()
        .then(() => test.Model.get(doc.id).update({num: 'foo'}).run())
        .error(error => {
          assert(error.message.match('The partial value is not valid, so the write was not executed.'));
          return test.Model.get(doc.id).run();
        })
        .then(result => {
          assert.deepEqual(doc, result);
          done();
        });
    });

    it('Point write on non existing doc', function(done) {
      test.Model.get('nonExistingId').update({foo: 'bar'}).run()
        .error(error => {
          assert(Errors.DOCUMENT_NOT_FOUND_REGEX.test(error.message));
          done();
        });
    });

    it('should spread filter and count queries', function() {
      //let User = test.thinkagain.createModel(test.table(0), {id: String}, {init: false});
      let Model = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      let r = test.r;
      let query = Model;
      query = query.orderBy(r.desc('id'));
      query = query.slice(0, 1);

      let countQuery = query;
      return Promise.all([ query.run(), countQuery.count().execute() ])
        .spread(function(results, total) {
          assert(results !== undefined);
          assert(total !== undefined);
        });
    });

    describe('Query.prototype.bindRun()', function() {
      after(() => { delete test.Model; });
      afterEach(() => test.cleanTables());
      before(() => {
        test.Model = test.thinkagain.createModel(test.table(1), {
          type: 'object', properties: { id: { type: 'string' } }
        });
      });

      it('handles Promises', function() {
        let doc = new test.Model({id: util.s8(), num: 0});
        let bound = test.Model.get(doc.id).bindRun();

        let instance1;
        return doc.save()
          .then(() => test.Model.get(doc.id))
          .then(instance => { instance1 = instance; return util.passThru(bound); })
          .then(instance2 => assert(instance2.id === instance1.id));
      });

      it('handles node-style callbacks', function(done) {
        let doc = new test.Model({id: util.s8(), num: 0});
        let bound = test.Model.get(doc.id).bindRun();

        doc.save()
          .then(() => {
            test.Model.get(doc.id).run(function(err, instance1) {
              bound(function(e, instance2) {
                assert(instance2.id === instance1.id);
                done();
              });
            });
          });
      });
    });

    describe('Query.prototype.bindExecute()', function() {
      after(() => { delete test.Model; });
      afterEach(() => test.cleanTables());
      before(() => {
        test.Model = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: { id: { type: 'string' } }
        });
      });

      it('handles Promises', function() {
        let doc = new test.Model({id: util.s8(), num: 0});
        let bound = test.Model.get(doc.id).bindExecute();

        let instance1;
        return doc.save()
          .then(() => test.Model.get(doc.id))
          .then(instance => { instance1 = instance; return util.passThru(bound); })
          .then(instance2 => assert(instance2.id === instance1.id));
      });

      it('handles node-style callbacks', function(done) {
        let doc = new test.Model({id: util.s8(), num: 0});
        let bound = test.Model.get(doc.id).bindExecute();

        doc.save().then(() => {
          test.Model.get(doc.id).run(function(err, instance1) {
            bound(function(e, instance2) {
              assert(instance2.id === instance1.id);
              done();
            });
          });
        });
      });
    });
  });
});
