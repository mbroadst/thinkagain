'use strict';
const config = require('./config'),
      thinky = require('../lib/thinky')(config),
      r = thinky.r,
      Document = require('../lib/document'),

      util = require('./util'),
      assert = require('assert'),
      Promise = require('bluebird');

let modelNameSet = {};
modelNameSet[util.s8()] = true;
modelNameSet[util.s8()] = true;
let modelNames = Object.keys(modelNameSet);

let cleanTables = function(done) {
  let promises = [];
  for (let name in modelNameSet) {
    promises.push(r.table(name).delete().run());
  }
  Promise.settle(promises).finally(function() {
    // Add the links table
    for (let model in thinky.models) {
      modelNameSet[model] = true;
    }
    modelNames = Object.keys(modelNameSet);
    thinky._clean();
    done();
  });
};

describe('Feeds', function() {
  let Model;
  after(cleanTables);
  before(function(done) {
    Model = thinky.createModel(modelNames[0], {
      id: String,
      str: String,
      num: Number
    });

    Model.on('ready', () => done());
  });

  it('should work after changes()', function() {
    return Model.changes().run()
      .then(feed => {
        assert(feed);
        assert.equal(feed.toString(), '[object Feed]');
        feed.close();
      });
  });

  it('should implement each', function(done) {
    let data = [{}, {}, {}];
    Model.changes().run()
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
        return Model.save(data);
      });
  });

  it('should implement next', function(done) {
    let data = [{}, {}, {}];
    Model.changes().run()
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

        return Model.save(data);
      });
  });

  it('should handle events', function(done) {
    let data = [{}, {}, {}];
    Model.changes().run()
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

        return Model.save(data);
      });
  });
});

describe('Atom feeds', function() {
  let Model;
  //after(cleanTables);
  before(function(done) {
    Model = thinky.createModel(modelNames[1], {
      id: String,
      str: String,
      num: Number
    });

    Model.on('ready', () => done());
  });

  it('get().changes() should work - and remove default(r.error)', function() {
    return Model.get(1).changes({ includeInitial: true }).run()
      .then(doc => {
        assert(doc);
        assert.deepEqual(doc, {});
        return doc.closeFeed();
      });
  });

  it('change events should be emitted - insert', function(done) {
    let data = { id: 'foo', str: 'bar', num: 3 };
    return Model.get(data.id).changes({ includeInitial: true }).run()
      .then(doc => {
        assert(doc);
        assert.deepEqual(doc, {});
        doc.on('change', () => {
          assert.deepEqual(doc.getOldValue(), null);
          assert.deepEqual(doc, data);
          doc.closeFeed().then(() => done());
        });

        return Model.save(data);
      });
  });

  it('change events should be emitted - update', function(done) {
    let data = { id: 'buzz', str: 'bar', num: 3 };
    return Model.save(data)
      .then(() => Model.get(data.id).changes({ includeInitial: true }).run())
      .then(doc => {
        assert.deepEqual(doc, data);
        doc.on('change', () => {
          assert.deepEqual(doc.getOldValue(), data);
          assert.deepEqual(doc, { id: 'buzz', str: 'foo', num: 3 });
          doc.closeFeed().then(() => done());
        });

        return Model.get(data.id).update({ str: 'foo' }).run();
      });
  });

  it('change events should be emitted - delete', function(done) {
    let data = { id: 'bar', str: 'bar', num: 3 };
    return Model.save(data)
      .then(() => Model.get(data.id).changes({ includeInitial: true }).run())
      .then(doc => {
        assert.deepEqual(doc, data);
        doc.on('change', () => {
          assert.deepEqual(doc.getOldValue(), data);
          assert.deepEqual(doc, {});
          assert.equal(doc.isSaved(), false);
          doc.closeFeed().then(() => done());
        });

        return Model.get(data.id).delete().run();
      });
  });

  it('change events should be emitted - all', function(done) {
    let data = { id: 'last', str: 'bar', num: 3 };
    return Model.get(data.id).changes({ includeInitial: true }).run()
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

        return Model.save(data);
      })
      .then(() => Model.get(data.id).update({ str: 'foo' }).run())
      .then(() => Model.get(data.id).delete().run());
  });
});

