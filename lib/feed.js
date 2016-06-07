'use strict';
const EventEmitter = require('events'),
      util = require('./util');

class Feed {
  constructor(feed, model) {
    this.feed = feed;
    this.model = model;
    this._closed = false;
  }

  toString() {
    return '[object Feed]';
  }

  next() {
    return this.feed.next()
      .then(data => {
        if (data.new_val !== undefined && data.new_val !== null) {
          return this.model._parse(data.new_val)
            .then(doc => { doc._setOldValue(data.old_val); return doc; });
        } else if (data.old_val !== undefined && data.old_val !== null) { // new_val is null
          return this.model._parse(data.old_val)
            .then(doc => { doc._setUnSaved(); return doc; });
        }

        //else we just drop the change as it's a state/initializing object
      });
  }

  toArray() {
    throw new Error('The `toArray` method is not available on feeds.');
  }

  close(callback) {
    this._closed = true;
    return this.feed.close(callback);
  }

  each(callback, onFinish) {
    this.feed.each((err, data) => {
      if (!!err) {
        if (this._closed === true) {
          return;
        }
        return callback(err); // eslint-disable-line
      }

      if (data.new_val != null) { // eslint-disable-line
        this.model._parse(data.new_val)
          .then(doc => {
            doc._setOldValue(data.old_val);
            callback(null, doc);
          })
          .error(callback);
      } else if (data.old_val != null) { // eslint-disable-line
        // new_val is null
        this.model._parse(data.old_val)
          .then(doc => {
            doc._setUnSaved();
            callback(null, doc);
          })
          .error(callback);
      }
      //else we just drop the change as it's a state/initializing object
    }, onFinish);
  }

  _makeEmitter() {
    this.next = () => {
      throw new Error('You cannot call `next` once you have bound listeners to this feed');
    };

    this.each = () => {
      throw new Error('You cannot call `each` once you have bound listeners to this feed');
    };

    this._eventEmitter = new EventEmitter();
  }

  _eachCb(err, data) {
    if (!!err) {
      if ((this._closed !== false) || (err.message !== 'You cannot retrieve data from a cursor that is closed')) {
        this._eventEmitter.emit('error', err);
      }
      return;
    }

    if (data.new_val !== null) {
      this.model._parse(data.new_val)
        .then(doc => {
          doc._setOldValue(data.old_val);
          this._eventEmitter.emit('data', doc);
        })
        .error(e => this._eventEmitter.emit('error', e));
    } else if (data.old_val !== null) { // new_val is null
      this.model._parse(data.old_val)
        .then(doc => {
          doc._setUnSaved();
          this._eventEmitter.emit('data', doc);
        })
        .error(e => this._eventEmitter.emit('error', e));
    }
  }
}

const methods = [
  'addListener',
  'on',
  'once',
  'removeListener',
  'removeAllListeners',
  'setMaxListeners',
  'listeners',
  'emit'
];

for (let i = 0, ii = methods.length; i < ii; ++i) {
  let method = methods[i];
  Feed.prototype[method] = function() {
    if (this._eventEmitter === undefined || this._eventEmitter === null) {
      this._makeEmitter();
      setImmediate(() =>  {
        this.feed.each(this._eachCb.bind(this), () => this._eventEmitter.emit('end'));
      });
    }

    this._eventEmitter[method].apply(this._eventEmitter, util.toArray(arguments));
  };
}

module.exports = Feed;
