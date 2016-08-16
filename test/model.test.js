'use strict';
const Errors = require('../lib/errors'),
      TestFixture = require('./test-fixture'),
      assert = require('assert'),
      expect = require('chai').expect,
      util = require('./util');

let test = new TestFixture();
describe('models', () => {
  before(() => test.setup());
  after(() => test.teardown());

  describe('createModel', function() {
    afterEach(() => test.cleanTables());

    it('Create a new model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      });

      assert(model);
      return model.tableReady();
    });

    it('should save a copy of the raw schema', function() {
      let schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };

      let model = test.thinkagain.createModel(test.table(0), schema);
      expect(model._schema).to.eql(Object.assign({}, { id: test.table(0) }, schema));
    });

    it('should save a copy of the raw schema with injected primary key', function() {
      let schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      let model = test.thinkagain.createModel(test.table(0), schema);
      expect(model._schema).to.eql({
        id: test.table(0),
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' }
        }
      });
    });

    it('should not inject a primary key if its defined', function() {
      let schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      let model = test.thinkagain.createModel(test.table(0), schema, { pk: 'name' });
      expect(model._schema).to.eql(Object.assign({}, { id: test.table(0) }, schema));
    });

    it('Check if the table was created', function(done) {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      });

      model.once('ready', () => {
        test.r.tableList().run()
          .then(result => {
            assert.notEqual(result.indexOf(test.table(0)), -1);
            done();
          });
      });
    });

    it('Create multiple models', function(done) {
      let model1 = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      });

      let model2 = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      });

      assert(model1 !== model2);

      // TODO: Remove when tableWait is implemented on the server
      // Make sure that modelNames[1] is ready for the next tests
      // (since we do not recreate the tables)
      model2.once('ready', () => done());
    });

    it('Check if the table was created', function(done) {
      let model = test.thinkagain.createModel('nonExistingTable', {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, { init: false });

      model.get(1).run()
        .then(() => done(new Error('Expecting error')))
        .error(e => {
          assert(e.message.match(/^Table `.*` does not exist in/));
          done();
        });
    });
  });

  describe('[_]getModel', function() {
    afterEach(() => test.cleanTables());

    it('_getModel', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, { init: false });

      assert(model._getModel().hasOwnProperty('_name'));
    });

    it('getTableName', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, { init: false });

      assert(model.__proto__.__proto__.hasOwnProperty('getTableName')); // eslint-disable-line
      assert.equal(model.getTableName(), test.table(0));
    });
  });

  describe('Model', function() {
    after(() => test.cleanTables()
      .then(() => { delete test.Model; delete test.ModelWithRequire; }));
    before(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          str: { type: 'string' }
        }
      });

      test.ModelWithRequire = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          str: { type: 'string' },
          num: { type: 'number' }
        },
        required: [ 'num' ]
      });
    });

    it('Create a new instance of the Model', function() {
      let str = util.s8();
      let doc = new test.Model({ str: str });

      assert(util.isPlainObject(doc));
      assert.equal(doc.str, str);
    });

    it('Create multiple instances from the same document', function() {
      let values = { str: util.s8(), num: util.random() };
      let doc = new test.Model(values);
      let otherDoc = new test.Model(values);

      assert.strictEqual(doc, values);
      assert.notStrictEqual(doc, otherDoc);
      doc.str = doc.str + util.s8();
      assert.notEqual(doc.str, otherDoc.str);

      let anotherDoc = new test.Model(values);
      assert.notStrictEqual(anotherDoc, otherDoc);
      assert.notStrictEqual(anotherDoc, doc);
    });

    it('Create two instances with the same argument of the Model', function() {
      let docValues = { str: util.s8() };
      let doc1 = new test.Model(docValues);
      let doc2 = new test.Model(docValues);

      assert.notStrictEqual(doc1, doc2);
    });

    it('Two instances should be different', function() {
      let str1 = util.s8();
      let str2 = util.s8();
      let doc1 = new test.Model({ str: str1 });
      assert.equal(doc1.str, str1);

      let doc2 = new test.Model({ str: str2 });
      assert.equal(doc2.str, str2);

      assert.equal(doc1.str, str1);
      assert.notEqual(doc1, doc2);
    });

    it('Two instances should have different prototypes', function() {
      let doc1 = new test.Model({ str: util.s8() });
      let doc2 = new test.Model({ str: util.s8() });

      assert.notEqual(doc1.__proto__, doc2.__proto__);  // eslint-disable-line
    });

    it('Two instances should have the same model', function() {
      let doc1 = new test.Model({ str: util.s8() });
      let doc2 = new test.Model({ str: util.s8() });

      assert.equal(doc1.getModel(), doc2.getModel());
    });

    it('Docs from different models should not interfere', function() {
      let str = util.s8();
      let doc = new test.Model({ str: str });
      let OtherModel = test.thinkagain.createModel(test.table(2), { str: String });

      let otherStr = util.s8();
      let otherDoc = new OtherModel({ str: otherStr });

      assert.equal(doc.str, str);
      assert.equal(otherDoc.str, otherStr);

      assert.notEqual(otherDoc.getModel(), doc.getModel());
      assert.equal(doc.getModel().getTableName(), test.table(0));
      assert.equal(otherDoc.getModel().getTableName(), test.table(2));
    });

    it('should return a validation error when isntances cannot be converted', function(done) {
      let r = test.r;
      r.table(test.table(1)).insert({ str: 'correct' })
        .then(() => test.ModelWithRequire.run())
        .error(err => {
          expect(err).to.be.instanceOf(Errors.ValidationError);
          expect(err.errors).to.not.be.empty;
          expect(err.errors[0].params.missingProperty).to.equal('num');
          done();
        });
    });
  });

  describe('Batch insert', function() {
    afterEach(() => test.cleanTables()
      .then(() => { delete test.Model; delete test.PointModel; }));
    beforeEach(() => {
      test.Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          num: { type: 'number' }
        }
      });
    });

    it('insert should work with a single doc', function() {
      return test.Model.save({ id: 'foo' })
        .then(result => assert.deepEqual(result, { id: 'foo' }));
    });

    it('Batch insert should work', function() {
      let docs = [];
      for (let i = 0; i < 10; i++) {
        docs.push({ num: i });
      }

      return test.Model.save(docs)
        .then(result => {
          assert.strictEqual(result, docs);
          for (let i = 0; i < 10; i++) {
            assert.equal(typeof docs[i].id, 'string');
            assert(docs[i].isSaved());
          }
        });
    });

    it('Batch insert should validate fields before saving', function() {
      expect(test.Model.save([ { id: 4 } ]))
        .to.be.rejectedWith(Errors.ValidationError, 'Validation failed');
    });

    it('Batch insert should properly error is __one__ insert fails', function(done) {
      test.Model.save([ { id: '4' } ])
        .then(result => {
          assert.equal(result[0].id, 4);
          let docs = [];
          for (let i = 0; i < 10; i++) {
            docs.push({num: i, id: '' + i});
          }

          return test.Model.save(docs);
        })
        .then(() => done(new Error('Was expecting an error')))
        .error(e => {
          assert(e.message.match(/An error occurred during the batch insert/));
          done();
        });
    });

    it('Should generate savable copies', function() {
      let Model = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          location: { $ref: 'point' }
        }
      });

      return Model.save({ id: 'foo', location: [1, 2] })
        .then(result => {
          assert.equal(result.id, 'foo');
          assert.equal(result.location.$reql_type$, 'GEOMETRY');
        });
    });

    it('Model.save should handle options - update', function() {
      return test.Model.save({ id: 'foo' })
        .then(result => {
          assert.equal(result.id, 'foo');
          return test.Model.save({ id: 'foo', bar: 'buzz' }, { conflict: 'update' });
        })
        .then(result => assert.deepEqual(result, { id: 'foo', bar: 'buzz' }));
    });

    it('Model.save should handle options - replace', function() {
      return test.Model.save({ id: 'foo', bar: 'buzz' })
        .then(result => {
          assert.equal(result.id, 'foo');
          return test.Model.save({ id: 'foo' }, { conflict: 'replace' });
        })
        .then(result => assert.deepEqual(result, { id: 'foo' }));
    });
  });

  describe('Joins', function() {
    afterEach(() => test.cleanTables());

    it('hasOne should save the join', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      });

      model.hasOne(otherModel, 'otherDoc', 'id', 'otherId');
      assert(model._getModel()._joins.otherDoc);
    });

    it('hasOne should throw if it uses a field already used by another relation', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      let anotherModel = test.thinkagain.createModel(test.table(2), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      model.hasOne(otherModel, 'otherDoc', 'id', 'otherId', {init: false});
      expect(() => model.hasOne(anotherModel, 'otherDoc', 'id', 'otherId'))
        .to.throw(Errors.ThinkAgainError, 'The field `otherDoc` is already used by another relation.');
    });

    it('belongsTo should throw if it uses a field already used by another relation', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      let anotherModel = test.thinkagain.createModel(test.table(2), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      model.belongsTo(otherModel, 'otherDoc', 'id', 'otherId', { init: false });
      expect(() => model.belongsTo(anotherModel, 'otherDoc', 'id', 'otherId'))
        .to.throw(Errors.ThinkAgainError, 'The field `otherDoc` is already used by another relation.');
    });

    it('hasMany should throw if it uses a field already used by another relation', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      let anotherModel = test.thinkagain.createModel(test.table(2), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      model.hasMany(otherModel, 'otherDoc', 'id', 'otherId', { init: false });
      expect(() => model.hasMany(anotherModel, 'otherDoc', 'id', 'otherId'))
        .to.throw(Errors.ThinkAgainError, 'The field `otherDoc` is already used by another relation.');
    });

    it('hasAndBelongsToMany should throw if it uses a field already used by another relation', function(done) {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      let anotherModel = test.thinkagain.createModel(test.table(2), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      model.hasAndBelongsToMany(otherModel, 'otherDoc', 'id', 'otherId', { init: false });
      try {
        model.hasAndBelongsToMany(anotherModel, 'otherDoc', 'id', 'otherId');
      } catch (err) {
        assert.equal(err.message, 'The field `otherDoc` is already used by another relation.');
        // Wait for the link table to be ready since we wont' drop/recreate the table
        test.thinkagain.models[model._getModel()._joins.otherDoc.link].once('ready', () => {
          // TODO Remove when tableWait is implemented on the server
          done();
        });
      }
    });

    it('hasOne should throw if the first argument is not a model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });


      expect(() => model.hasOne(() => {}, 'otherDoc', 'otherId', 'id'))
        .to.throw(Errors.ThinkAgainError, 'First argument of `hasOne` must be a Model');
    });

    it('belongsTo should throw if the first argument is not a model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      expect(() => model.belongsTo(() => {}, 'otherDoc', 'otherId', 'id'))
        .to.throw(Errors.ThinkAgainError, 'First argument of `belongsTo` must be a Model');
    });

    it('hasMany should throw if the first argument is not a model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      expect(() => model.hasMany(() => {}, 'otherDoc', 'otherId', 'id'))
        .to.throw(Errors.ThinkAgainError, 'First argument of `hasMany` must be a Model');
    });

    it('hasAndBelongsToMany should throw if the first argument is not a model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      expect(() => model.hasAndBelongsToMany(() => {}, 'otherDoc', 'otherId', 'id'))
        .to.throw(Errors.ThinkAgainError, 'First argument of `hasAndBelongsToMany` must be a Model');
    });

    it('hasOne should create an index on the other model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, foreignKeyName: { type: 'string' } }
      }, { init: false });

      let foreignKey = util.s8();
      let schema = { type: 'object', properties: { id: { type: 'string' } } };
      schema.properties[foreignKey] = { type: 'string' };
      let otherModel = test.thinkagain.createModel(test.table(1), schema);
      model.hasOne(otherModel, 'otherDoc', 'modelId', foreignKey);

      let r = test.r;
      return otherModel.ready()
        .then(() => r.table(otherModel.getTableName()).indexList().run())
        .then(result => r.table(otherModel.getTableName()).indexWait(foreignKey).run());
    });

    it('BelongsTo should create an index on the other model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, otherId: { type: 'string' } }
      }, { init: false });

      let foreignKey = util.s8();
      let schema = { type: 'object', properties: { id: { type: 'string' } } };
      schema.properties[foreignKey] = { type: 'string' };
      let otherModel = test.thinkagain.createModel(test.table(1), schema);
      model.belongsTo(otherModel, 'otherDoc', foreignKey, 'otherId');

      let r = test.r;
      return otherModel.ready()
        .then(() => r.table(otherModel.getTableName()).indexList().run())
        .then(result => r.table(otherModel.getTableName()).indexWait('otherId').run());
    });

    it('hasMany should create an index on the other model', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' } }
      }, { init: false });

      let foreignKey = util.s8();
      let schema = { type: 'object', properties: { id: { type: 'string' } } };
      schema.properties[foreignKey] = { type: 'string' };
      let otherModel = test.thinkagain.createModel(test.table(1), schema);
      model.hasMany(otherModel, 'otherDocs', 'modelId', foreignKey);

      let r = test.r;
      return otherModel.ready()
        .then(() => r.table(otherModel.getTableName()).indexList().run())
        .then(result => r.table(otherModel.getTableName()).indexWait(foreignKey).run());
    });

    it('hasAndBelongsToMany should create an index on this table', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, notid1: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, notid2: { type: 'string' } }
      }, { init: false });

      model.hasAndBelongsToMany(otherModel, 'otherDocs', 'notid1', 'notid2');

      let r = test.r;
      return model.ready()
        .then(() => r.table(model.getTableName()).indexList().run())
        .then(result => r.table(model.getTableName()).indexWait('notid1').run());
    });

    it('hasAndBelongsToMany should create an index on the joined table', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, notid1: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, notid2: { type: 'string' } }
      }, { init: false });

      model.hasAndBelongsToMany(otherModel, 'otherDocs', 'notid1', 'notid2');

      let r = test.r;
      return otherModel.ready()
        .then(() => r.table(otherModel.getTableName()).indexList().run())
        .then(result => r.table(otherModel.getTableName()).indexWait('notid2').run());
    });

    it('hasAndBelongsToMany should create a linked table with indexes', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, notid1: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, notid2: { type: 'string' } }
      }, { init: false });

      model.hasAndBelongsToMany(otherModel, 'otherDocs', 'notid1', 'notid2');

      let r = test.r;
      return model.ready()
        .then(() => r.table(util.linkTableName(model, otherModel)).indexList().run())
        .then(result => r.table(otherModel.getTableName()).indexWait('notid2').run());
    });

    it('_apply is reserved ', function() {
      let model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, notid1: { type: 'string' } }
      }, { init: false });

      let otherModel = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, notid2: { type: 'string' } }
      }, { init: false });

      expect(() => model.hasOne(otherModel, '_apply', 'notid1', 'notid2', { init: false }))
        .to.throw(Errors.ThinkAgainError, 'The field `_apply` is reserved by thinkagain. Please use another one.');

      expect(() => model.hasMany(otherModel, '_apply', 'notid1', 'notid2', { init: false }))
        .to.throw(Errors.ThinkAgainError, 'The field `_apply` is reserved by thinkagain. Please use another one.');

      expect(() => model.belongsTo(otherModel, '_apply', 'notid1', 'notid2', { init: false }))
        .to.throw(Errors.ThinkAgainError, 'The field `_apply` is reserved by thinkagain. Please use another one.');

      expect(() => model.hasAndBelongsToMany(otherModel, '_apply', 'notid1', 'notid2', { init: false }))
        .to.throw(Errors.ThinkAgainError, 'The field `_apply` is reserved by thinkagain. Please use another one.');
    });
  });

  describe('define', function() {
    afterEach(() => test.cleanTables());

    it('Should be added on the document', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object', properties: {
          id: { type: 'string' }, num: { type: 'number' }
        }
      }, { init: false });

      Model.define('foo', () => done());
      let doc = new Model({});
      doc.foo();
    });

    it('this should refer to the doc', function(done) {
      let str = util.s8();
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      }, { init: false });

      Model.define('foo', function() { assert.equal(this.id, str); done(); });
      let doc = new Model({id: str});
      doc.foo();
    });
  });

  describe('static', function() {
    afterEach(() => test.cleanTables());

    it('Should be added on the model', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      }, { init: false });

      Model.defineStatic('foo', () => done());
      Model.foo();
    });

    it('this should refer to the model', function(done) {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      }, { init: false });

      Model.defineStatic('foo', function() { this.bar(); });
      Model.defineStatic('bar', () => done());
      Model.foo();
    });

    it('Should be added on the model\'s queries', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      });

      let Other = test.thinkagain.createModel(test.table(1), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      });

      Model.hasOne(Other, 'other', 'id', 'modelId');
      Other.belongsTo(Model, 'model', 'modelId', 'id');

      Other.defineStatic('foo', function() {
        return this.merge({ bar: true });
      });

      let doc1 = new Model({});
      let doc2 = new Other({ model: doc1 });

      return doc2.saveAll()
        .then(() => Model.getJoin({ other: { _apply: query => query.foo() } }).run())
        .then(docs => assert.equal(docs[0].other.bar, true));
    });
  });

  describe('ensureIndex', function() {
    afterEach(() => test.cleanTables());

    it('should add an index', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, num: { type: 'number' } }
      });

      Model.ensureIndex('num');
      let doc = new Model({});
      return doc.save()
        .then(result => Model.orderBy({ index: 'num' }).run());
    });

    it('should add an index with multi', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: { id: { type: 'string' }, nums: { type: 'array', items: { type: 'number' } } }
      });

      Model.ensureIndex('nums', doc => doc('nums'), { multi: true });
      let doc = new Model({ nums: [1, 2, 3] });

      return doc.save()
        .then(result => Model.getAll(1, { index: 'nums' }).run())
        .then(result => {
          assert.equal(result.length, 1);
          return Model.getAll(2, { index: 'nums' }).run();
        })
        .then(result => assert.equal(result.length, 1));
    });

    it('should accept ensureIndex(name, opts)', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          location: { $ref: 'point' }
        }
      });

      Model.ensureIndex('location', { geo: true });
      let doc = new Model({ location: [ 1, 2 ] });

      let r = test.r;
      return doc.save()
        .then(result => Model.getIntersecting(r.circle([1, 2], 1), { index: 'location' }).run())
        .then(result => {
          assert.equal(result.length, 1);
          return Model.getIntersecting(r.circle([3, 2], 1), { index: 'location' }).run();
        })
        .then(result => assert.equal(result.length, 0));
    });
  });

  /*** ISSUES
  describe('virtual', function() {
    afterEach(() => test.cleanTables());

    it('pass schema validation', function() {
      test.thinkagain.createModel(test.table(0), {
        id: { type: 'string' },
        num: Number,
        numVirtual: {
          _type: 'virtual'
        }
      });
    });

    it('Generate fields', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: { type: 'string' },
        num: Number,
        numVirtual: {
          _type: 'virtual',
          default: function() {
            return this.num + 2;
          }
        }
      });

      let doc = new Model({ num: 1 });
      assert.equal(doc.numVirtual, 3);
    });

    it('Generate fields -- manually', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: { type: 'string' },
        num: Number,
        numVirtual: {
          _type: 'virtual',
          default: function() {
            return this.num + 2;
          }
        }
      });

      let doc = new Model({ num: 1 });
      assert.equal(doc.numVirtual, 3);
      doc.num = 2;
      assert.equal(doc.numVirtual, 3);
      doc.generateVirtualValues();
      assert.equal(doc.numVirtual, 4);
    });

    it('Validate fields', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: { type: 'string' },
        num: Number,
        numVirtual: {
          _type: 'virtual'
        }
      });

      let doc = new Model({ num: 1 });
      doc.validate();
    });

    it('Virtual fields should not be saved', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        num: Number,
        numVirtual: {
          _type: 'virtual'
        }
      });

      let doc = new Model({ id: 1, num: 1, numVirtual: 3 });
      return doc.save()
        .then(result => Model.get(1).execute())
        .then(result => assert.equal(result.numVirtual, undefined));
    });

    it('Virtual fields should not be saved but still regenerated once retrieved', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        num: Number,
        numVirtual: {
          _type: 'virtual',
          default: function() {
            return this.num + 2;
          }
        }
      });

      let doc = new Model({ id: 1, num: 1 });
      assert.equal(doc.numVirtual, 3);
      return doc.save()
        .then(result => {
          assert.equal(result.numVirtual, 3);
          return Model.get(1).execute();
        })
        .then(result => {
          assert.equal(result.numVirtual, undefined);
          return Model.get(1).run();
        })
        .then(result => assert.equal(result.numVirtual, 3));
    });

    it('Virtual fields should not be saved but should be put back later (if no default)', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        num: Number,
        numVirtual: {
          _type: 'virtual'
        }
      });

      let doc = new Model({ id: 1, num: 1, numVirtual: 10 });
      return doc.save()
        .then(result => {
          assert.equal(result.numVirtual, 10);
          return Model.get(1).execute();
        })
        .then(result => assert.equal(result.numVirtual, undefined));
    });

    it('Virtual fields should be genrated after other default values', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        anumVirtual: {
          _type: 'virtual',
          default: function() {
            return this.num + 1;
          }
        },
        num: {
          _type: Number,
          default: function() {
            return 2;
          }
        },
        numVirtual: {
          _type: 'virtual',
          default: function() {
            return this.num + 1;
          }
        }
      });

      let doc = new Model({ id: 1 });
      assert.equal(doc.numVirtual, 3);
      assert.equal(doc.anumVirtual, 3);
    });

    it('Virtual fields should be not be generated if a parent is undefined', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        nested: {
          field: {
            _type: 'virtual',
            default: function() {
              return 3;
            }
          }
        }
      });

      let doc = new Model({ id: 1 });
      doc.generateVirtualValues();
      assert.equal(doc.nested, undefined);
    });

    it('Virtual fields should not throw if a parent has the wrong type', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        id: Number,
        ar: type.array().schema({
          num: type.number().default(3)
        }).options({ enforce_type: 'none' })
      });

      let doc = new Model({ id: 1, ar: 3 });
      doc._generateDefault();
      assert.equal(doc.ar, 3);
    });

    it('Virtual fields should work in nested arrays', function() {
      let Model = test.thinkagain.createModel(test.table(0), {
        nested: [
          {
            foo: String,
            bar: type.virtual().default(function() {
              return 'buzz';
            })
          }
        ]
      });

      let doc = new Model({
        nested: [
          {
            foo: 'hello'
          }
        ]
      });

      assert.equal(doc.nested[0].bar, 'buzz');
    });
  });
  */
});
