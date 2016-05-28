'use strict';
const TestFixture = require('./test-fixture'),
      Document = require('../lib/document'),
      assert = require('assert');

let test = new TestFixture();
describe('feed', function() {
  before(() => test.setup());
  after(() => test.teardown());

  describe('Feeds', function() {
    after(() => test.cleanTables());
    before(function(done) {
      test.Model = test.thinky.createModel(test.table(0), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      test.Model.on('ready', () => done());
    });

    it('should work after changes()', function() {
      return test.Model.changes().run()
        .then(feed => {
          assert(feed);
          assert.equal(feed.toString(), '[object Feed]');
          feed.close();
        });
    });

    it('should implement each', function(done) {
      let data = [{}, {}, {}];
      test.Model.changes().run()
        .then(feed => {
          let count = 0;
          feed.each((err, doc) => {
            if (err) return done(err);
            assert(doc instanceof Document);
            count++;
            if (count === data.length) {
              feed.close().then(() => done());
            }
          });

          //Model.insert(data).execute().error(done);
          return test.Model.save(data);
        });
    });

    it('should implement next', function(done) {
      let data = [{}, {}, {}];
      test.Model.changes().run()
        .then(feed => {
          feed.next()
            .then(doc => {
              assert(doc instanceof Document);
              return feed.next();
            })
            .then(doc => {
              assert(doc instanceof Document);
              return feed.next();
            })
            .then(doc => {
              assert(doc instanceof Document);
              return feed.close();
            })
            .then(() => done());

          return test.Model.save(data);
        });
    });

    it('should handle events', function(done) {
      let data = [{}, {}, {}];
      test.Model.changes().run()
        .then(feed => {
          let count = 0;
          feed.on('data', doc => {
            assert(doc instanceof Document);
            count++;
            if (count === data.length) {
              feed.removeAllListeners();
              feed.close().then(() => done());
            }
          });

          return test.Model.save(data);
        });
    });
  });

  describe('Atom feeds', function() {
    after(() => test.cleanTables());
    before(function(done) {
      test.Model = test.thinky.createModel(test.table(1), {
        type: 'object',
        properties: {
          id: { type: 'string' },
          str: { type: 'string' },
          num: { type: 'number' }
        }
      });

      test.Model.on('ready', () => done());
    });

    it('get().changes() should work - and remove default(r.error)', function() {
      return test.Model.get(1).changes({ includeInitial: true }).run()
        .then(doc => {
          assert(doc);
          assert.deepEqual(doc, {});
          return doc.closeFeed();
        });
    });

    it('change events should be emitted - insert', function(done) {
      let data = { id: 'foo', str: 'bar', num: 3 };
      return test.Model.get(data.id).changes({ includeInitial: true }).run()
        .then(doc => {
          assert(doc);
          assert.deepEqual(doc, {});
          doc.on('change', () => {
            assert.deepEqual(doc.getOldValue(), null);
            assert.deepEqual(doc, data);
            doc.closeFeed().then(() => done());
          });

          return test.Model.save(data);
        });
    });

    it('change events should be emitted - update', function(done) {
      let data = { id: 'buzz', str: 'bar', num: 3 };
      return test.Model.save(data)
        .then(() => test.Model.get(data.id).changes({ includeInitial: true }).run())
        .then(doc => {
          assert.deepEqual(doc, data);
          doc.on('change', () => {
            assert.deepEqual(doc.getOldValue(), data);
            assert.deepEqual(doc, { id: 'buzz', str: 'foo', num: 3 });
            doc.closeFeed().then(() => done());
          });

          return test.Model.get(data.id).update({ str: 'foo' }).run();
        });
    });

    it('change events should be emitted - delete', function(done) {
      let data = { id: 'bar', str: 'bar', num: 3 };
      return test.Model.save(data)
        .then(() => test.Model.get(data.id).changes({ includeInitial: true }).run())
        .then(doc => {
          assert.deepEqual(doc, data);
          doc.on('change', () => {
            assert.deepEqual(doc.getOldValue(), data);
            assert.deepEqual(doc, {});
            assert.equal(doc.isSaved(), false);
            doc.closeFeed().then(() => done());
          });

          return test.Model.get(data.id).delete().run();
        });
    });

    it('change events should be emitted - all', function(done) {
      let data = { id: 'last', str: 'bar', num: 3 };
      return test.Model.get(data.id).changes({ includeInitial: true }).run()
        .then(doc => {
          assert(doc);
          assert.deepEqual(doc, {});
          let count = 0;
          doc.on('change', () => {
            if (count === 0) {
              assert.deepEqual(doc.getOldValue(), null);
              assert.deepEqual(doc, data);
            } else if (count === 1) {
              assert.deepEqual(doc, { id: 'last', str: 'foo', num: 3 });
            } else if (count === 2) {
              assert.deepEqual(doc, {});
              assert.equal(doc.isSaved(), false);
              doc.closeFeed().then(() => done());
            }
            count++;
          });

          return test.Model.save(data);
        })
        .then(() => test.Model.get(data.id).update({ str: 'foo' }).run())
        .then(() => test.Model.get(data.id).delete().run());
    });
  });
});
