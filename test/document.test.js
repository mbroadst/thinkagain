'use strict';
const TestFixture = require('./test-fixture'),
      Errors = require('../lib/errors'),
      util = require('./util'),
      assert = require('assert'),
      expect = require('chai').expect;

let test = new TestFixture();
describe('documents', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('save', function() {
    describe('Basic', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.PointModel; });
      before(function() {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });
      });

      it('Save should change the status of the doc', function() {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        assert.equal(doc.isSaved(), false);
        return doc.save()
          .then(result => assert.equal(doc.isSaved(), true));
      });

      it('Save should fail if validate throws', function(done) {
        let doc = new test.Model({
          str: util.random(),
          num: util.random()
        });

        assert.equal(doc.isSaved(), false);
        doc.save()
          .error(error => done());
      });

      it('Save should work with a callback', function(done) {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        assert.equal(doc.isSaved(), false);
        doc.save((err, result) => {
          assert.equal(err, null);
          assert.equal(doc.isSaved(), true);
          done();
        });
      });

      it('Save should fail if the primary key already exists', function(done) {
        let str = util.s8();
        let doc = new test.Model({ id: str });
        let doc2 = new test.Model({ id: str });

        doc.save()
          .then(result => doc2.save())
          .then(result => done(new Error('Expecting error')))
          .error(err => {
            assert(err instanceof Errors.DuplicatePrimaryKey);
            assert(err.message.match(Errors.DUPLICATE_PRIMARY_KEY_REGEX));
            assert.equal(err.primaryKey, 'id');
            done();
          });
      });

      it('setSaved should do the same', function() {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        assert.equal(doc.isSaved(), false);
        assert.equal(doc.setSaved());
        assert.equal(doc.isSaved(), true);
      });

      it('Save when the table is not yet ready', function() {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        return doc.save();
      });

      it('Save then the table is ready', function() {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        return doc.save();
      });

      it('Save the document should be updated on place', function() {
        let str = util.s8();
        let num = util.random();
        let doc = new test.Model({
          str: str,
          num: num
        });

        return doc.save()
          .then(result => {
            assert.strictEqual(doc, result);
            assert.equal(doc.str, str);
            assert.equal(doc.num, num);
            assert.notEqual(doc.id, undefined);
          });
      });

      it('Save should be able to update a doc', function() {
        let doc = new test.Model({
          str: util.s8(),
          num: util.random()
        });

        let newStr = util.s8();
        return doc.save()
          .then(result => {
            assert.strictEqual(doc, result);
            doc.str = newStr;
            return doc.save();
          })
          .then(result => test.Model.get(doc.id).run())
          .then(result => assert.equal(doc.str, newStr));
      });

      it('Updating a document should keep a reference to the old value ', function() {
        let str = util.s8();
        let num = util.random();
        let newStr = util.s8();
        let doc = new test.Model({
          str: str,
          num: num
        });

        return doc.save()
          .then(result => {
            assert.strictEqual(doc, result);
            doc.str = newStr;
            return doc.save();
          })
          .then(result => assert.deepEqual(doc.getOldValue(), {
            id: doc.id,
            str: str,
            num: num
          }));
      });

      it('Updating a document should validate it first (and in case of failure, it should not be persisted in the db)', function(done) {
        let str = util.s8();
        let num = util.random();
        let doc = new test.Model({
          str: str,
          num: num
        });

        doc.save()
          .then(result => {
            assert.strictEqual(doc, result);
            doc.str = 2;
            return doc.save();
          })
          .then(result => done(new Error('Expecting an error')))
          .error(() => test.Model.get(doc.id).run())
          .then(result => {
            // Make sure that the document was not updated
            assert.equal(result.str, str);
            done();
          });
      });

      it('Regression #117 - #118', function() {
        let t = new test.Model({
          id: util.s8(),
          extra: { nested: 1 }
        });

        return t.save()
          .then(result => assert.equal(result.extra.nested, 1));
      });

      it('Nesting undefined field', function() {
        let t = new test.Model({
          id: util.s8(),
          extra: { nested: { foo: 1 } }
        });

        return t.save()
          .then(result => assert.equal(result.extra.nested.foo, 1));
      });

      it('Point - ReQL point', function() {
        test.PointModel = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            point: { $ref: 'point' }
          }
        });

        let r = test.r;
        let t = new test.Model({
          id: util.s8(),
          point: r.point(2, 10)
        });

        return t.save()
          .then(result => assert.equal(result.point.$reql_type$, 'GEOMETRY'));
      });
    });

    describe('Replacement', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; });

      // it('enforce_extra: "remove" should not save the field in the db', function() {
      //   let Model = test.thinkagain.createModel(test.table(0), {
      //     type: 'object',
      //     properties: {
      //       id: { type: 'string' },
      //       str: { type: 'string' }
      //     }
      //   }, { enforce_extra: 'remove' });

      //   let t = new Model({
      //     id: 'foo',
      //     str: 'bar',
      //     extra: 'buzz'
      //   });

      //   return t.save()
      //     .then(result => Model.get(t.id).execute())
      //     .then(result => assert.equal(result.extra, undefined));
      // });

      it('Date as string should be coerced to ReQL dates', function() {
        let Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { $ref: 'date' }
          }
        });

        let t = new Model({
          id: util.s8(),
          date: (new Date()).toISOString()
        });

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

      it('Date as string should be coerced to ReQL dates in array', function() {
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

        let t = new Model({
          id: util.s8(),
          array: [ (new Date()).toISOString() ]
        });

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

      it('Date as number should be coerced to ReQL dates', function() {
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

      it('Points as array should be coerced to ReQL points', function() {
        let Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            loc: { $ref: 'point' }
          }
        });

        let t = new Model({
          id: util.s8(),
          loc: [1, 1]
        });

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

        let t = new Model({
          id: util.s8(),
          loc: { latitude: 1, longitude: 2 }
        });

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

        let t = new Model({
          id: util.s8(),
          loc: { type: 'Point', coordinates: [1, 2] }
        });

        return t.save()
          .then(result => Model.get(t.id).execute())
          .then(result => {
            assert.equal(t.loc.$reql_type$, 'GEOMETRY');
            assert(Array.isArray(t.loc.coordinates));
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

    describe('Joins - hasOne', function() {
      afterEach(() => test.cleanTables());
      after(() => {
        delete test.Model;
        delete test.OtherModel;
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

        test.Model.hasOne(test.OtherModel, 'otherDoc', 'id', 'foreignKey');
      });

      it('save should save only one doc', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        return doc.save()
          .then(result => {
            assert.equal(result.isSaved(), true);
            assert.equal(result.otherDoc.isSaved(), false);
            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);
          });
      });

      it('new should create instances of Document for joined documents too', function() {
        let docValues = {
          str: util.s8(), num: util.random(),
          otherDoc: { str: util.s8(), num: util.random()}
        };

        let doc = new test.Model(docValues);
        assert.equal(doc._getModel()._name, test.Model.getTableName());
        assert.equal(doc.otherDoc._getModel()._name, test.OtherModel.getTableName());
      });

      it('save should not change the joined document', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        return doc.save()
          .then(result => assert.strictEqual(result.otherDoc, otherDoc));
      });

      it('saveAll should save everything', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            assert.equal(result.otherDoc.isSaved(), true);
            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);

            assert.strictEqual(result.otherDoc, otherDoc);
            assert.strictEqual(result.otherDoc.foreignKey, doc.id);
          });
      });

      it('save should not remove the foreign key', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(result => test.OtherModel.get(otherDoc.id).run())
          .then(result => {
            assert.equal(result.foreignKey, doc.id);
            return result.save();
          })
          .then(result => assert.equal(result.foreignKey, doc.id));
      });
    });

    describe('Joins - belongsTo', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
      });

      it('save should save only one doc', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.save()
          .then(result => {
            assert.equal(result.isSaved(), true);
            assert.equal(result.otherDoc.isSaved(), false);
            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);
          });
      });

      it('save should not change the joined document', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.save()
          .then(result => assert.strictEqual(result.otherDoc, otherDoc));
      });

      it('saveAll should save everything', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(result => {
            assert.equal(doc.isSaved(), true);
            assert.equal(doc.otherDoc.isSaved(), true);
            assert.equal(typeof doc.id, 'string');
            assert.equal(doc.str, docValues.str);
            assert.equal(doc.num, docValues.num);

            assert.strictEqual(doc.otherDoc, otherDoc);
            assert.strictEqual(doc.foreignKey, doc.otherDoc.id);
          });
      });

      it('saveAll should save a referene to this in the belongsTo doc', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(doc2 => {
            assert.equal(doc.otherDoc.__proto__._parents._belongsTo[test.Model.getTableName()][0].doc, doc); // eslint-disable-line
          });
      });

      it('saveAll should delete a reference of belongsTo if the document was removed', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(doc2 => {
            assert.equal(doc.isSaved(), true);
            assert.equal(doc.otherDoc.isSaved(), true);

            delete doc.otherDoc;
            return doc.saveAll();
          })
          .then(doc2 => {
            assert.equal(doc.isSaved(), true);
            assert.equal(doc.otherId, undefined);
          });
      });

      it('saveAll should delete a reference of belongsTo only if the document was first retrieved', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        let result1;
        return doc.saveAll()
          .then(function(doc2) {
            assert.equal(doc.isSaved(), true);
            assert.equal(doc.otherDoc.isSaved(), true);
            return test.Model.get(doc.id).run();
          })
          .then(result => {
            result1 = result;
            return result.saveAll();
          })
          .then(result2 => {
            assert.strictEqual(result1, result2);
            assert.equal(result2.foreignKey, doc.foreignKey);
            assert.notEqual(result2.foreignKey, undefined);
            assert.notEqual(result2.foreignKey, null);
            return test.Model.get(doc.id).getJoin().run();
          })
          .then(result => {
            assert.equal(result.isSaved(), true);
            assert.equal(result.otherDoc.isSaved(), true);
          });
      });

      it('save should not remove the foreign key', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let otherDocValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        return doc.saveAll()
          .then(result => test.Model.get(result.id).run())
          .then(result => {
            assert.equal(result.foreignKey, otherDoc.id);
            return result.save();
          })
          .then(result => assert.equal(result.foreignKey, otherDoc.id));
      });
    });

    describe('Joins - hasMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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

        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');
      });

      it('save should save only one doc', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        doc.otherDocs = otherDocs;
        return doc.save()
          .then(result => {
            assert.equal(result.isSaved(), true);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), false);
            }

            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);
          });
      });

      it('save should not change the joined document', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];

        doc.otherDocs = otherDocs;
        return doc.save()
          .then(result => assert.strictEqual(result.otherDocs, otherDocs));
      });

      it('saveAll should save everything', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        doc.otherDocs = otherDocs;
        return doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
            }
            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);

            assert.strictEqual(result.otherDocs, otherDocs);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.strictEqual(result.otherDocs[i].foreignKey, doc.id);
            }
          });
      });

      it('saveAll should not throw if the joined documents are missing', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        return doc.saveAll();
      });
    });

    describe('Joins - hasAndBelongsToMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
            num: { type: 'number' }
          }
        });

        test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');
      });

      it('save should save only one doc', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        doc.otherDocs = otherDocs;
        return doc.save()
          .then(result => {
            assert.equal(result.isSaved(), true);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), false);
            }
            assert.equal(typeof result.id, 'string');
            assert.equal(result.str, docValues.str);
            assert.equal(result.num, docValues.num);
          });
      });

      it('save should not change the joined document', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        doc.otherDocs = otherDocs;
        return doc.save()
          .then(result => assert.strictEqual(result.otherDocs, otherDocs));
      });

      it('saveAll should save everything', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        let r = test.r;
        doc.otherDocs = otherDocs;
        return doc.saveAll()
          .then(result => {
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
              assert.equal(typeof result.otherDocs[i].id, 'string');
            }

            return r.table(util.linkTableName(test.Model, test.OtherModel)).run();
          })
          .then(result => {
            assert.equal(result.length, 3);
            assert.equal(doc.isSaved(), true);
            assert.equal(typeof doc.id, 'string');
            assert.equal(doc.str, docValues.str);
            assert.equal(doc.num, docValues.num);
            assert.strictEqual(doc.otherDocs, otherDocs);
          });
      });

      it('saveAll should create new links with the good id', function() {
        let docValues = { str: util.s8(), num: util.random() };
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() }),
          new test.OtherModel({ str: util.s8(), num: util.random() })
        ];

        let r = test.r;
        doc.otherDocs = otherDocs;
        return doc.saveAll()
          .then(result => r.table(util.linkTableName(test.Model, test.OtherModel)).run())
          .then(result => {
            let total = 0;
            // Check id
            for (let i = 0; i < result.length; i++) {
              for (let j = 0; j < otherDocs.length; j++) {
                if (test.Model.getTableName() < test.OtherModel.getTableName()) {
                  if (result[i].id === doc.id + '_' + otherDocs[j].id) {
                    total++;
                    break;
                  }
                } else {
                  if (result[i].id === otherDocs[j].id + '_' + doc.id) {
                    total++;
                    break;
                  }
                }
              }
            }
            assert.equal(total, 3);
          });
      });

      it('saveAll should create new links with the secondary value', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        let r = test.r;
        return doc.saveAll()
          .then(result => {
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(result.otherDocs[i].isSaved(), true);
              assert.equal(typeof result.otherDocs[i].id, 'string');
            }

            return r.table(util.linkTableName(test.Model, test.OtherModel)).run();
          })
          .then(result => {
            let total = 0, found = false;
            // Testing the values of the primary key
            for (let i = 0; i < result.length; i++) {
              if (result[i][test.Model.getTableName() + '_id'] ===  doc.id) {
                found = false;
                for (let j = 0; j < otherDocs.length; j++) {
                  if (result[i][test.OtherModel.getTableName() + '_id'] === otherDocs[j].id) {
                    total++;
                    found = true;
                    break;
                  }
                }
                assert(found);
              }
            }

            assert.equal(total, 3);
          });
      });

      it('saveAll should delete links if they are missing', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        return doc.saveAll()
          .then(result => {
            result.otherDocs.splice(1, 1);
            return result.saveAll();
          })
          .then(result => {
            assert.equal(result.otherDocs.length, 2);
            return test.Model.get(doc.id).getJoin().run();
          })
          .then(result => assert.equal(result.otherDocs.length, 2));
      });

      it('Keep the same reference', function() {
        let otherDoc = new test.OtherModel({ str: util.s8(), num: util.random() });
        let otherDocs = [ otherDoc ];
        let docValues = {
          str: util.s8(),
          num: util.random(),
          otherDocs: otherDocs
        };
        let doc = new test.Model(docValues);
        assert.strictEqual(doc.otherDocs[0], otherDoc);

        // NOTE: this used to be `return done()` right here

        // let r = test.r;
        // return doc.saveAll()
        //   .then(() => r.table(util.linkTableName(test.Model, test.OtherModel)).run())
        //   .then(result => {
        //     let total = 0;
        //     // Check id
        //     for (let i = 0; i < result.length; i++) {
        //       for (let j = 0; j < otherDocs.length; j++) {
        //         if (test.Model.getTableName() < test.OtherModel.getTableName()) {
        //           if (result[i].id === doc.id + '_' + otherDocs[j].id) {
        //             total++;
        //             break;
        //           }
        //         } else {
        //           if (result[i].id === otherDocs[j].id + '_' + doc.id) {
        //             total++;
        //             break;
        //           }
        //         }
        //       }
        //     }
        //     assert.equal(total, 3);
        //   });
      });
    });

    describe('saveAll with missing docs for hasOne', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
      });

      it('Should update link', function() {
        let doc = new test.Model({
          id: util.s8(),
          str: util.s8(),
          num: util.random()
        });

        let otherDoc = new test.OtherModel({
          id: util.s8(),
          str: util.s8(),
          num: util.random()
        });

        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(() => {
            assert(doc.isSaved());
            assert(doc.otherDoc.isSaved());
            doc.otherDoc = null;
            return doc.saveAll();
          })
          .then(() => test.OtherModel.get(otherDoc.id).run())
          .then(result => assert.equal(result.foreignKey, undefined));
      });
    });

    describe('saveAll with missing docs for hasMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
          prperties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' },
            foreignKey: { type: 'string' }
          }
        });

        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');
      });

      it('Should update link', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];

        doc.otherDocs = otherDocs;
        doc.saveAll()
          .then(() => {
            assert(doc.isSaved());
            for (let i = 0; i < doc.otherDocs.length; i++) {
              assert(doc.otherDocs[i].isSaved());
            }

            doc.otherDocs.splice(1, 1);  // remove a document
            return doc.saveAll()
              .then(() => test.OtherModel.getAll(doc.id, { index: 'foreignKey' }).run())
              .then(result => {
                assert.equal(result.length, 2);
                return test.OtherModel.run();
              })
              .then(result => {
                assert.equal(result.length, 3);
                return test.Model.get(doc.id).getJoin().run();
              })
              .then(result => {
                util.sortById(doc.otherDocs);
                util.sortById(result.otherDocs);
                assert.deepEqual(doc, result);
                done();
              });
          });
      });
    });

    describe('saveAll with missing docs for belongsTo', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
      before(() => {
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
      });

      it('Should update link', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel({str: util.s8(), num: util.random()});
        doc.otherDoc = otherDoc;

        return doc.saveAll()
          .then(() => {
            assert(doc.isSaved());
            assert.equal(typeof doc.foreignKey, 'string');
            doc.otherDoc = null;
            return doc.saveAll();
          })
          .then(result => {
            assert.equal(doc.foreignKey, undefined);
            return test.OtherModel.run();
          })
          .then(result => {
            assert.equal(result.length, 1);
            return test.Model.get(doc.id).getJoin().run();
          })
          .then(result => {
            delete doc.otherDoc;
            assert.deepEqual(result, doc);
          });
      });
    });

    describe('saveAll with missing docs for hasAndBelongsToMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
      before(() => {
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

        test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');
        return test.cleanTables();
      });

      it('Should remove link', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];

        let r = test.r;
        doc.otherDocs = otherDocs;
        return doc.saveAll()
          .then(() => {
            assert(doc.isSaved());
            for (let i = 0; i < otherDocs.length; i++) {
              assert(doc.otherDocs[i].isSaved());
            }
            doc.otherDocs.splice(1, 1); // remove a document
            return doc.saveAll();
          })
          .then(result => {
            assert.equal(doc.otherDocs.length, 2);
            assert.equal(result.otherDocs.length, 2);
            return r.table(util.linkTableName(test.Model, test.OtherModel)).count().run();
          })
          .then(result => {
            assert.equal(result, 2);
            return test.Model.get(doc.id).getJoin().run();
          })
          .then(result => assert.equal(result.otherDocs.length, 2));
      });
    });

    describe('modelToSave', function() {
      afterEach(() => test.cleanTables());
      after(() => {
        delete test.Model1;
        delete test.Model2;
        delete test.Model3;
        delete test.Model4;
        delete test.Model5;
        delete test.Model6;
      });

      before(() => {
        test.Model1 = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey31: { type: 'string' }
          }
        });

        test.Model2 = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey12: { type: 'string' }
          }
        });

        test.Model3 = test.thinkagain.createModel(test.table(2), {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        });

        test.Model4 = test.thinkagain.createModel(test.table(3), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey14: { type: 'string' }
          }
        });

        test.Model5 = test.thinkagain.createModel(test.table(4), {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        });

        test.Model6 = test.thinkagain.createModel(test.table(5), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey26: { type: 'string' }
          }
        });

        test.Model1.hasOne(test.Model2, 'doc2', 'id', 'foreignkey12');
        test.Model1.belongsTo(test.Model3, 'doc3', 'foreignkey31', 'id');
        test.Model1.hasMany(test.Model4, 'docs4', 'id', 'foreignkey14');
        test.Model1.hasAndBelongsToMany(test.Model5, 'docs5', 'id', 'id');
        test.Model2.hasOne(test.Model6, 'doc6', 'id', 'foreignkey26');
      });

      it('save should save only this', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.save()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), false);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), false);
            assert.equal(doc52.isSaved(), false);
            assert.equal(doc6.isSaved(), false);
          });
      });

      it('saveAll should save everything', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
          });
      });

      it('saveAll should be limited by modelToSave - 1', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll({ doc2: true })
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), false);
            assert.equal(doc52.isSaved(), false);
            assert.equal(doc6.isSaved(), false);
          });
      });

      it('saveAll should be limited by modelToSave - 2', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll({ doc2: { doc6: true } })
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), false);
            assert.equal(doc52.isSaved(), false);
            assert.equal(doc6.isSaved(), true);
          });
      });

      it('saveAll should be limited by modelToSave - 3', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll({ doc2: true, docs4: true })
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), false);
            assert.equal(doc52.isSaved(), false);
            assert.equal(doc6.isSaved(), false);
          });
      });

      it('saveAll should be limited by modelToSave - 4', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll({ doc2: true, docs5: true })
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), false);
          });
      });
    });

    describe('validate', function() {
      afterEach(() => test.cleanTables());

      it('should validate then build the query - Regression #163', function() {
        let Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: { id: { $ref: 'date' } }
        });

        let doc = new Model({ id: 'notADate' });
        return expect(doc.save())
          .to.be.rejectedWith(Errors.ValidationError, 'Validation failed');
      });
    });
  });

  describe('delete', function() {
    describe('Basic', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.doc; });
      before(() => {
        test.Model = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            str: { type: 'string' },
            num: { type: 'number' }
          }
        });

        let str = util.s8();
        let num = util.random();
        test.doc = new test.Model({
          str: str,
          num: num
        });

        assert.equal(test.doc.isSaved(), false);
        return test.cleanTables()
          .then(() => test.doc.save())
          .then(result => {
            assert.equal(typeof test.doc.id, 'string');
            assert.equal(test.doc.isSaved(), true);
          });
      });

      it('should delete the document', function() {
        return test.doc.delete()
          .then(() => test.Model.run())
          .then(result => assert.equal(result.length, 0));
      });

      it('should work with a callback', function(done) {
        test.doc.delete(() => {
          test.Model.run((err, result) => {
            assert.equal(result.length, 0);
            done();
          });
        });
      });

      it('should set the doc unsaved', function() {
        return test.doc.save()
          .then(result => {
            assert.equal(typeof test.doc.id, 'string');
            assert.equal(test.doc.isSaved(), true);
            return test.doc.delete();
          })
          .then(() => test.Model.run())
          .then(result => assert.equal(test.doc.isSaved(), false));
      });
    });

    describe('hasOne', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
        return test.cleanTables();
      });

      it('delete should delete only the document and update the other', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.delete();
          })
          .then(() => test.Model.run())
          .then(result => {
            assert.equal(result.length, 0);
            assert.equal(otherDoc.foreignKey, undefined);
            return test.OtherModel.run();
          })
          .then(result => {
            assert.equal(result.length, 1);
            assert.deepEqual(result[0], otherDoc);
          });
      });

      it('deleteAll should delete everything', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll();
          })
          .then(() => {
            assert.equal(doc.isSaved(), false);
            assert.equal(otherDoc.isSaved(), false);
            return test.Model.get(doc.id).run();
          })
          .then(() => done(new Error('expected an error')))
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            done();
          });
      });

      it('deleteAll should delete everything', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll({ otherDoc: true });
          })
          .then(() => {
            assert.equal(doc.isSaved(), false);
            assert.equal(otherDoc.isSaved(), false);
            return test.Model.get(doc.id).run();
          })
          .then(() => done(new Error('expected an error')))
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            done();
          });
      });

      it('deleteAll with wrong modelToDelete should delete only the document and update the other', function() {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;
        return doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll({ foo: 'bar' });
          })
          .then(() => test.Model.run())
          .then(result => {
            assert.equal(result.length, 0);
            assert.equal(otherDoc.foreignKey, undefined);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .then(result => assert.deepEqual(result, otherDoc));
      });
    });

    describe('belongsTo', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
      before(() => {
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
      });

      //Why this test was commented?
      it('delete should delete only the document and not update the other', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        let otherDocCopy;
        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            otherDocCopy = util.deepCopy(result.otherDoc);
            return result.delete();
          })
          .then(() => test.Model.get(doc.id).run())
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .then(result => {
            assert.deepEqual(result, otherDoc);
            assert.deepEqual(result, otherDocCopy);
            done();
          });
      });

      it('deleteAll should delete everything', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll();
          })
          .then(result => {
            assert.equal(doc.isSaved(), false);
            assert.equal(otherDoc.isSaved(), false);
            assert.strictEqual(doc, result);
            assert.equal(doc.otherDoc, undefined);
            assert.equal(otherDoc.isSaved(), false);
            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            done();
          });
      });

      it('deleteAll should delete everything when given the appropriate modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll({ otherDoc: true });
          })
          .then(result => {
            assert.equal(doc.isSaved(), false);
            assert.equal(otherDoc.isSaved(), false);
            assert.strictEqual(doc, result);
            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            done();
          });
      });

      it('delete should delete only the document with non matching modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let otherDocValues = {str: util.s8(), num: util.random()};

        let doc = new test.Model(docValues);
        let otherDoc = new test.OtherModel(otherDocValues);
        doc.otherDoc = otherDoc;

        let otherDocCopy;
        doc.saveAll()
          .then(result => {
            assert.equal(doc.isSaved(), true);
            otherDocCopy = util.deepCopy(doc.otherDoc);
            return doc.deleteAll({ foo: true });
          })
          .then(() => test.Model.get(doc.id).run())
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.get(otherDoc.id).run();
          })
          .then(result => {
            assert.deepEqual(result, otherDoc);
            assert.deepEqual(result, otherDocCopy);
            done();
          });
      });
    });

    describe('hasMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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

        test.Model.hasMany(test.OtherModel, 'otherDocs', 'id', 'foreignKey');
      });

      it('delete should delete only the document and update the other', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];

        doc.otherDocs = otherDocs;
        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.delete();
          })
          .then(() => test.Model.get(doc.id).run())
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].foreignKey, undefined);
              assert.equal(otherDocs[i].isSaved(), true);
            }

            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 3);
            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
            done();
          });
      });

      it('delete should delete only the document and update the other -- non matching modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll({ foo: true });
          })
          .then(() => test.Model.get(doc.id).run())
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            assert.equal(doc.isSaved(), false);
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].foreignKey, undefined);
              assert.equal(otherDocs[i].isSaved(), true);
            }

            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 3);
            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
            done();
          });
      });

      it('deleteAll should delete everything', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll();
          })
          .then(result => {
            assert.strictEqual(result, doc);
            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].isSaved(), false);
              // We want to keep the foreign key -- consistent yet unsaved data
              assert.notEqual(otherDocs[i].foreignKey, undefined);
            }

            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });

      it('deleteAll should delete everything -- with modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        doc.saveAll()
          .then(result => {
            assert.equal(result.isSaved(), true);
            return result.deleteAll({ otherDocs: true });
          })
          .then(result => {
            assert.strictEqual(result, doc);
            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].isSaved(), false);
              // We want to keep the foreign key -- consistent yet unsaved data
              assert.notEqual(otherDocs[i].foreignKey, undefined);
            }

            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });
    });

    describe('hasAndBelongsToMany', function() {
      afterEach(() => test.cleanTables());
      after(() => { delete test.Model; delete test.OtherModel; });
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
            num: { type: 'number' }
          }
        });

        test.Model.hasAndBelongsToMany(test.OtherModel, 'otherDocs', 'id', 'id');
        return test.cleanTables();
      });

      it('delete should delete only the document and update the other', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        let r = test.r;
        doc.saveAll()
          .then(result => result.delete())
          .then(result => {
            assert.strictEqual(doc, result);
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(doc.otherDocs[i].isSaved(), true);
            }

            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 3);
            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
            return r.table(test.Model._joins.otherDocs.link).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });

      it('deleteAll should delete only the document and update the other -- with non matching modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        let r = test.r;
        doc.saveAll()
          .then(result => result.deleteAll({ foo: true }))
          .then(() => {
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(doc.otherDocs[i].isSaved(), true);
            }

            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 3);
            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
            return r.table(test.Model._joins.otherDocs.link).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });

      it('deleteAll should delete everything', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        let r = test.r;
        doc.saveAll()
          .then(result => result.deleteAll())
          .then(() => {
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].isSaved(), false);
            }

            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            return r.table(test.Model._joins.otherDocs.link).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });

      it('deleteAll should delete everything -- with the appropriate modelToDelete', function(done) {
        let docValues = {str: util.s8(), num: util.random()};
        let doc = new test.Model(docValues);
        let otherDocs = [
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()}),
          new test.OtherModel({str: util.s8(), num: util.random()})
        ];
        doc.otherDocs = otherDocs;

        let r = test.r;
        doc.saveAll()
          .then(result => result.deleteAll({ otherDocs: true }))
          .then(() => {
            assert.equal(doc.isSaved(), false);
            for (let i = 0; i < otherDocs.length; i++) {
              assert.equal(otherDocs[i].isSaved(), false);
            }

            return test.Model.get(doc.id).run();
          })
          .error(error => {
            assert(error instanceof Errors.DocumentNotFound);
            return test.OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            return r.table(test.Model._joins.otherDocs.link).run();
          })
          .then(result => {
            assert.equal(result.length, 0);
            done();
          });
      });
    });

    describe('modelToDelete', function() {
      afterEach(() => test.cleanTables());
      after(() => {
        delete test.Model1;
        delete test.Model2;
        delete test.Model3;
        delete test.Model4;
        delete test.Model5;
        delete test.Model6;
      });

      before(() => {
        test.Model1 = test.thinkagain.createModel(test.table(0), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey31: { type: 'string' }
          }
        });

        test.Model2 = test.thinkagain.createModel(test.table(1), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey12: { type: 'string' }
          }
        });

        test.Model3 = test.thinkagain.createModel(test.table(2), {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        });

        test.Model4 = test.thinkagain.createModel(test.table(3), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey14: { type: 'string' }
          }
        });

        test.Model5 = test.thinkagain.createModel(test.table(4), {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        });

        test.Model6 = test.thinkagain.createModel(test.table(5), {
          type: 'object',
          properties: {
            id: { type: 'string' },
            foreignkey26: { type: 'string' }
          }
        });

        test.Model1.hasOne(test.Model2, 'doc2', 'id', 'foreignkey12');
        test.Model1.belongsTo(test.Model3, 'doc3', 'foreignkey31', 'id');
        test.Model1.hasMany(test.Model4, 'docs4', 'id', 'foreignkey14');
        test.Model1.hasAndBelongsToMany(test.Model5, 'docs5', 'id', 'id');
        test.Model2.hasOne(test.Model6, 'doc6', 'id', 'foreignkey26');
      });

      it('deleteAll should delete everything', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
            return doc1.deleteAll();
          })
          .then(() => {
            assert.equal(doc1.isSaved(), false);
            assert.equal(doc2.isSaved(), false);
            assert.equal(doc3.isSaved(), false);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), false);
            assert.equal(doc52.isSaved(), false);
            assert.equal(doc6.isSaved(), false);
          });
      });

      it('deleteAll should follow modelToDelete if provided - 1', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
            return doc1.deleteAll({ doc2: true });
          })
          .then(() => {
            assert.equal(doc1.isSaved(), false);
            assert.equal(doc2.isSaved(), false);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
          });
      });

      it('deleteAll should follow modelToDelete if provided - 2', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
            return doc1.deleteAll({ doc2: { doc6: true } });
          })
          .then(() => {
            assert.equal(doc1.isSaved(), false);
            assert.equal(doc2.isSaved(), false);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), false);
          });
      });

      it('deleteAll should follow modelToDelete if provided - 3', function() {
        let doc1 = new test.Model1({});
        let doc2 = new test.Model2({});
        let doc3 = new test.Model3({});
        let doc41 = new test.Model4({});
        let doc42 = new test.Model4({});
        let doc51 = new test.Model5({});
        let doc52 = new test.Model5({});
        let doc6 = new test.Model6({});
        doc1.doc2 = doc2;
        doc1.doc3 = doc3;
        doc1.docs4 = [doc41, doc42];
        doc1.docs5 = [doc51, doc52];
        doc2.doc6 = doc6;

        return doc1.saveAll()
          .then(() => {
            assert.equal(doc1.isSaved(), true);
            assert.equal(doc2.isSaved(), true);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), true);
            assert.equal(doc42.isSaved(), true);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
            return doc1.deleteAll({ doc2: true, docs4: true });
          })
          .then(() => {
            assert.equal(doc1.isSaved(), false);
            assert.equal(doc2.isSaved(), false);
            assert.equal(doc3.isSaved(), true);
            assert.equal(doc41.isSaved(), false);
            assert.equal(doc42.isSaved(), false);
            assert.equal(doc51.isSaved(), true);
            assert.equal(doc52.isSaved(), true);
            assert.equal(doc6.isSaved(), true);
          });
      });
    });
  });

  describe('purge', function() {
    afterEach(() => test.cleanTables());

    it('hasOne -- purge should remove itself + clean the other docs', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'has', 'id', 'foreignKey');
      let doc1 = new Model({});

      let otherDoc1 = new OtherModel({});
      let otherDoc2 = new OtherModel({});

      doc1.has = otherDoc1;

      return doc1.saveAll()
        .then(doc => {
          // Create an extra hasOne link -- which is invalid
          otherDoc2.foreignKey = otherDoc1.foreignKey;
          return otherDoc2.save();
        })
        .then(doc => doc1.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => {
          assert.equal(result.length, 2);
          assert.equal(result[0].foreignKey, undefined);
          assert.equal(result[1].foreignKey, undefined);
        });
    });

    it('should work with a callback', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'has', 'id', 'foreignKey');
      let doc1 = new Model({});

      let otherDoc1 = new OtherModel({});
      let otherDoc2 = new OtherModel({});

      doc1.has = otherDoc1;

      doc1.saveAll()
        .then(doc => {
          // Create an extra hasOne link -- which is invalid
          otherDoc2.foreignKey = otherDoc1.foreignKey;
          return otherDoc2.save();
        })
        .then(doc => {
          doc1.purge(() => {
            return Model.run()
              .then(result => {
                assert.equal(result.length, 0);
                return OtherModel.run();
              })
              .then(result => {
                assert.equal(result.length, 2);
                assert.equal(result[0].foreignKey, undefined);
                assert.equal(result[1].foreignKey, undefined);
                done();
              });
          });
        });
    });

    it('belongsTo -- purge should remove itself', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      Model.belongsTo(OtherModel, 'belongsTo', 'foreignKey', 'id');

      let doc1 = new Model({});
      let otherDoc1 = new OtherModel({});

      doc1.belongsTo = otherDoc1;

      return doc1.saveAll()
        .then(() => doc1.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => assert.equal(result.length, 1));
    });

    it('belongsTo not called on its own model -- purge should remove itself + clean the other docs', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      OtherModel.belongsTo(Model, 'belongsTo', 'foreignKey', 'id');

      let doc1 = new Model({});
      let otherDoc1 = new OtherModel({});

      otherDoc1.belongsTo = doc1;

      return otherDoc1.saveAll()
        .then(doc => doc1.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => {
          assert.equal(result.length, 1);
          assert.equal(result[0].foreignKey, undefined);
          assert.equal(otherDoc1.foreignKey, undefined);
        });
    });

    it('hasMany -- purge should remove itself', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasMany(OtherModel, 'otherDocs', 'id', 'foreignKey');

      let doc = new Model({});
      let otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
      doc.otherDocs = otherDocs;

      return doc.saveAll()
        .then(() => {
          let extraDoc = new OtherModel({foreignKey: otherDocs[0].foreignKey});
          return extraDoc.save();
        })
        .then(() => doc.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => {
          assert.equal(result.length, 4);
          for (let i = 0; i < result.length; i++) {
            assert.equal(result[i].foreignKey, undefined);
          }
        });
    });

    it('hasAndBelongsToMany -- pk -- purge should clean the database', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'id');

      let doc = new Model({});
      let otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
      doc.otherDocs = otherDocs;

      let r = test.r;
      return doc.saveAll()
        .then(result => Model.get(doc.id).run())
        .then(result => result.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => {
          assert(result.length, 3);
          let link = Model._getModel()._joins.otherDocs.link;
          return r.table(link).run();
        })
        .then(result => assert.equal(result.length, 0));
    });

    it('hasAndBelongsToMany not called on this model -- pk -- purge should clean the database', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'id', 'id');

      let doc = new Model({});
      let otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
      doc.otherDocs = otherDocs;

      let r = test.r;
      return doc.saveAll()
        .then(result => OtherModel.get(otherDocs[0].id).run())
        .then(result => result.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 1);
          return OtherModel.run();
        })
        .then(result => {
          assert(result.length, 2);
          let link = Model._getModel()._joins.otherDocs.link;
          return r.table(link).run();
        })
        .then(result => assert.equal(result.length, 2));
    });

    it('hasAndBelongsToMany -- not pk -- purge should clean the database', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'foo', 'foo');

      let doc = new Model({foo: 1});
      let otherDocs = [new OtherModel({foo: 2}), new OtherModel({foo: 2}), new OtherModel({foo: 3})];
      doc.otherDocs = otherDocs;

      let r = test.r;
      return doc.saveAll()
        .then(result => Model.get(doc.id).run())
        .then(result => result.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 0);
          return OtherModel.run();
        })
        .then(result => {
          assert(result.length, 3);
          let link = Model._getModel()._joins.otherDocs.link;
          return r.table(link).run();
        })
        .then(result => assert.equal(result.length, 2));
    });

    it('hasAndBelongsToMany not called on this model -- not pk -- purge should clean the database', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: { type: 'number' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: { type: 'number' }
        }
      });

      Model.hasAndBelongsToMany(OtherModel, 'otherDocs', 'foo', 'foo');

      let doc = new Model({foo: 1});
      let otherDocs = [new OtherModel({foo: 2}), new OtherModel({foo: 2}), new OtherModel({foo: 2})];
      doc.otherDocs = otherDocs;

      let r = test.r;
      return doc.saveAll()
        .then(result => OtherModel.get(otherDocs[0].id).run())
        .then(result => result.purge())
        .then(() => Model.run())
        .then(result => {
          assert.equal(result.length, 1);
          return OtherModel.run();
        })
        .then(result => {
          assert(result.length, 2);
          let link = Model._getModel()._joins.otherDocs.link;
          return r.table(link).run();
        })
        .then(result => assert.equal(result.length, 1));
    });
  });

/**** ISSUES
  describe('date', function() {
    afterEach(() => test.cleanTables());

    it('should work', function() {
      let r = test.r;
      let Model = test.thinkagain.createModel(test.table(0), {
        id: String,
        date: {_type: Date, default: r.now()}
      });

      let doc = new Model({});
      assert.equal(typeof doc.date, 'function');
      return doc.save()
        .then(result => {
          assert(result.date instanceof Date);
          return Model.get(doc.id).run();
        })
        .then(result => assert.deepEqual(result.date, doc.date));
    });
  });
*/

  describe('default should be saved', function() {
    afterEach(() => test.cleanTables());

    it('when generated on create', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          num: { type: 'number', default: 2 }
        },
        required: [ 'num' ]
      });

      let doc = new Model({});
      return doc.save()
        .then(result => {
          assert.strictEqual(doc, result);
          assert.equal(doc.num, 2);
          return Model.get(doc.id).execute();
        })
        .then(result => assert.equal(result.num, 2));
    });

    it('when generated on save', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          num: { type: 'number', default: 2 }
        },
        required: [ 'num' ]
      });

      let doc = new Model({});
      delete doc.num;

      return doc.save()
        .then(result => {
          assert.strictEqual(doc, result);
          assert.equal(doc.num, 2);
          return Model.get(doc.id).execute();
        })
        .then(result => assert.equal(result.num, 2));
    });
  });

  describe('_merge', function() {
    afterEach(() => test.cleanTables());

    it('should work', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: {
            type: 'object',
            properties: {
              buzz: { type: 'number' },
              bar: { type: 'string' }
            }
          }
        }
      });

      let doc = new Model({id: 'str', foo: {bar: 'hello'}});
      doc._merge({foo: {buzz: 2}});
      assert.deepEqual(doc, {foo: {buzz: 2}});
      doc._merge({foo: {bar: 'bar', buzz: 2}});
      assert.deepEqual(doc, {foo: {bar: 'bar', buzz: 2}});
    });

    it('should return the object', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: {
            type: 'object',
            properties: {
              buzz: { type: 'number' },
              bar: { type: 'string' }
            }
          }
        }
      });

      let doc = new Model({id: 'str', foo: {bar: 'hello'}});
      let doc2 = doc._merge({foo: {buzz: 2}});
      assert.strictEqual(doc2, doc);
    });
  });

  describe('merge', function() {
    afterEach(() => test.cleanTables());

    it('should work', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: {
            type: 'object',
            properties: {
              buzz: { type: 'number' },
              bar: { type: 'string' }
            }
          }
        }
      });

      let doc = new Model({id: 'str', foo: {bar: 'hello'}});
      doc.merge({id: 'world', foo: {buzz: 2}});
      assert.deepEqual(doc, {id: 'world', foo: {bar: 'hello', buzz: 2}});
    });

    it('should return the object', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foo: {
            type: 'object',
            properties: {
              buzz: { type: 'number' },
              bar: { type: 'string' }
            }
          }
        }
      });

      let doc = new Model({id: 'str', foo: {bar: 'hello'}});
      let doc2 = doc.merge({foo: {buzz: 2}});
      assert.strictEqual(doc2, doc);
    });
  });

  describe('hooks', function() {
    afterEach(() => test.cleanTables());

    it('init pre', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      assert.throws(() => {
        Model.pre('init', function() {
          this.title = this.id;
        });
      }, error => {
        return ((error instanceof Error) && (error.message === 'No pre-hook available for the event `init`.'));
      });
      return Model.tableReady();
    });

    it('init post sync', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('init', function() {
        this.title = this.id;
      });

      let doc = new Model({id: 'foobar'});
      assert.equal(doc.id, doc.title);
    });

    it('init post sync - error', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('init', function() {
        throw new Error('Error thrown by a hook');
      });
      Model.post('init', function() {
        this.title = this.id;
      });

      try {
        let doc = new Model({id: 'foobar'}); // eslint-disable-line
      } catch (err) {
        assert.equal(err.message, 'Error thrown by a hook');
      }
    });

    it('init post async', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('init', next => {
        let self = this;
        setTimeout(() => {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      return doc.then(() => assert.equal(doc.id, doc.title));
    });

    it('init post async - error', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('init', next => {
        let self = this;
        setTimeout(() => {
          self.title = self.id;
          next(new Error('Async error thrown by a hook'));
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      doc
        .catch(err => {
          assert.equal(err.message, 'Async error thrown by a hook');
          done();
        });
    });

    it('validate oncreate sync', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      }, { validate: 'oncreate' });

      Model.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foobar'});

      // because validation is explicitly promised based now we use process.nextTick
      process.nextTick(() => assert.equal(doc.id, doc.title));
    });

    it('validate oncreate + init async', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      }, { validate: 'oncreate' });

      Model.post('init', function(next) {
        let self = this;
        setTimeout(function() {
          self.title2 = self.id;
          next();
        }, 1);
      });
      Model.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      return doc.then(() => {
        assert.equal(doc.id, doc.title);
        assert.equal(doc.id, doc.title2);
      });
    });

    it('validate post sync', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('validate', function() {
        this.title = this.id;
      });

      let doc = new Model({id: 'foobar'});
      doc.validate()
        .then(() => assert.equal(doc.id, doc.title));
    });

    it('validate post sync - error', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('validate', function() {
        throw new Error('Error thrown by a hook');
      });

      let doc = new Model({id: 'foobar'});
      return expect(doc.validate())
        .to.be.rejectedWith(Error, 'Error thrown by a hook');
    });

    it('init validate async', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      return doc.validate()
        .then(() => assert.equal(doc.id, doc.title));
    });

    it('init post async - error', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next(new Error('Async error thrown by a hook'));
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      doc.validate()
        .catch(err => {
          assert.equal(err.message, 'Async error thrown by a hook');
          done();
        });
    });

    it('init validateAll async', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foobar'});
      return doc.validateAll()
        .then(() => assert.equal(doc.id, doc.title));
    });

    it('init validateAll async joins', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

      OtherModel.post('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      let otherDoc = new OtherModel({id: 'bar'});
      doc.other = otherDoc;

      return doc.validateAll()
        .then(() => assert.equal(otherDoc.id, otherDoc.title));
    });

    it('validate on save', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('save', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(result.id, result.title);
        });
    });

    it('validate on retrieve - error on validate', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let r = test.r;
      Model.once('ready', () => {
        return r.table(Model.getTableName()).insert({id: 1}).run()
          .then(result => Model.get(1).run())
          .error(err => {
            assert.equal(err.message, 'Validation failed');
            assert(err instanceof Errors.ValidationError);
            done();
          });
      });
    });

    it('validate on retrieve - error on hook', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('validate', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next(new Errors.ThinkAgainError("I'm Hook, and I'm a vilain"));
        }, 1);
      });

      let r = test.r;
      Model.once('ready', () => {
        return r.table(Model.getTableName()).insert({id: 1}).run()
          .then(result => Model.get(1).run())
          .error(err => {
            assert.equal(err.message, "I'm Hook, and I'm a vilain");
            done();
          });
      });
    });

    it('save pre', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('save', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let r = test.r;
      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(doc.id, doc.title);
          return r.table(Model.getTableName()).get(doc.id).run();
        })
        .then(result => assert.equal(result.id, result.title));
    });

    it('save pre - with error and callback', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('save', function(next) {
        setTimeout(function() {
          next(new Error('foo'));
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      doc.save(err => {
        assert(err instanceof Error);
        assert.equal(err.message, 'foo');
        done();
      });
    });

    it('save pre - sync', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('save', function() {
        this.title = this.id;
      });

      let r = test.r;
      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(doc.id, doc.title);
          return r.table(Model.getTableName()).get(doc.id).run();
        })
        .then(result => assert.equal(result.id, result.title));
    });

    it('save post', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('save', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let r = test.r;
      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(doc.id, doc.title);
          return r.table(Model.getTableName()).get(doc.id).run();
        })
        .then(result => assert.equal(result.title, undefined));
    });

    it('save pre join', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

      OtherModel.pre('save', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      let otherDoc = new OtherModel({id: 'bar'});
      doc.other = otherDoc;

      return doc.saveAll()
        .then(result => assert.equal(otherDoc.id, otherDoc.title));
    });

    it('save pre join', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      let OtherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          foreignKey: { type: 'string' }
        }
      });

      Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

      OtherModel.pre('save', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      let otherDoc = new OtherModel({id: 'bar'});
      doc.other = otherDoc;

      return doc.saveAll()
        .then(result => assert.equal(otherDoc.id, otherDoc.title));
    });

    it('delete pre', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.pre('delete', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          return doc.delete();
        })
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(doc.id, doc.title);
        });
    });

    it('delete post', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('delete', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let doc = new Model({id: 'foo'});
      return doc.save()
        .then(result => {
          assert.strictEqual(result, doc);
          return doc.delete();
        })
        .then(result => {
          assert.strictEqual(result, doc);
          assert.equal(doc.id, doc.title);
        });
    });

    it('hook for retrieve', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      });

      Model.post('retrieve', function(next) {
        let self = this;
        setTimeout(function() {
          self.title = self.id;
          next();
        }, 1);
      });

      let r = test.r;
      Model.once('ready', () => {
        let id = util.s8();
        return r.table(Model.getTableName()).insert({id: id}).run()
          .then(result => Model.get(id).run())
          .then(result => {
            assert.equal(result.title, result.id);
            done();
          });
      });
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

      let docValues = {str: util.s8(), num: util.random()};
      let otherDocValues = {str: util.s8(), num: util.random()};

      let doc = new Model(docValues);
      let otherDoc = new OtherModel(otherDocValues);
      doc.otherDoc = otherDoc;

      return doc.saveAll()
        .then(result => result.removeRelation('otherDoc'))
        .then(() => OtherModel.get(otherDoc.id).run())
        .then(result => assert.equal(result.foreignKey, undefined));
    });

    it('should work for hasMany', function() {
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
        .then(result => result.removeRelation('otherDocs'))
        .then(result => OtherModel.get(otherDoc.id).run())
        .then(result => assert.equal(result.foreignKey, undefined));
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
        .then(result => result.removeRelation('otherDoc'))
        .then(() => Model.get(doc.id).run())
        .then(result => assert.equal(result.foreignKey, undefined));
    });

    it('should work for hasAndBelongsTo', function() {
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

      return doc.saveAll()
        .then(result => result.removeRelation('otherDocs'))
        .then(() => Model.get(doc.id).getJoin({ otherDocs: true }).run())
        .then(result => assert.equal(result.otherDocs.length, 0));
    });
  });
});
