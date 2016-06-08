'use strict';
const Promise = require('bluebird'),
      config = require('./config'),
      thinkagain = require('..'),
      util = require('./util'),
      chai = require('chai');

chai.config.includeStack = true;
chai.use(require('chai-as-promised'));

class TestFixture {
  constructor() {
    this.models = new Map();
  }

  setup(options) {
    this.dbName = util.s8();
    let thinkagainOptions = Object.assign({}, options, {
      db: this.dbName,
      host: config.host,
      port: config.port,
      silent: true
    });

    this.thinkagain = thinkagain(thinkagainOptions);
    this.r = this.thinkagain.r;
    return this.thinkagain.dbReady();
  }

  teardown() {
    return this.r.dbDrop(this.dbName)
      .then(() => {
        this.dbName = undefined;
        this.thinkagain = undefined;
        this.models = new Map();
      });
  }

  cleanTables() {
    let r = this.r;
    return Promise.map(Object.keys(this.thinkagain.models), model => {
      if (!this.thinkagain.models[model]._initModel) return;

      let Model = this.thinkagain.models[model],
          joinLinks = Object.keys(Model._joins).reduce((links, joinModel) => {
            let join = Model._joins[joinModel];
            if (!!join.link) links.push(join.link);
            return links;
          }, []),
          reverseJoinLinks = Object.keys(Model._reverseJoins).reduce((links, joinModel) => {
            let join = Model._reverseJoins[joinModel];
            if (!!join.link) links.push(join.link);
            return links;
          }, []);

      let tables = [ model ].concat(joinLinks).concat(reverseJoinLinks);
      return Promise.map(tables, table => {
        return r.db(this.dbName).table(table).wait()
          .then(() => r.db(this.dbName).table(table).delete().run());
      });
    })
    .error(err => { /* console.log('clean error: ', err); */ })
    .finally(() => this.thinkagain._clean());
  }

  table(id) {
    if (id === null || id === undefined) id = util.s8();
    if (!this.models.has(id)) this.models.set(id, util.s8());
    return this.models.get(id);
  }

  dropTables() {
    return Promise.map(Object.keys(this.thinkagain.models), model => {
      if (this.thinkagain.models[model]._initModel) return this.r.tableDrop(model).run();
    }).then(() => this.thinkagain._clean());
  }
}

module.exports = TestFixture;
