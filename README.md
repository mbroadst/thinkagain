# thinkagain
[![Build Status](https://travis-ci.org/mbroadst/thinkagain.svg?branch=master)](https://travis-ci.org/mbroadst/thinkagain)
[![Test Coverage](https://codeclimate.com/github/mbroadst/thinkagain/badges/coverage.svg)](https://codeclimate.com/github/mbroadst/thinkagain/coverage)

ThinkAgain is a fork of [thinky](http://thinky.io/) with first-class support for [json-schema](json-schema.org) using [ajv](https://github.com/epoberezkin/ajv) for validation.

## Install
```
npm install --save thinkagain
```

## Quick Start
```
const thinkagain = require('thinkagain')(/* rethinkdbdash options */);

// Create a model - the table is automatically created
let Post = thinkagain.createModel('Post', {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    idAuthor: { type: 'string' }
  },
  required: [ 'title' ]
});

let Author = thinkagain.createModel('Author', {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' }
  },
  required: [ 'name' ]
});

// Join the models
Post.belongsTo(Author, 'author', 'idAuthor', 'id');

// Create a new post
let post = new Post({
  title: 'Hello World!',
  content: 'This is an example.'
});

// Create a new author
var author = new Author({
  name: 'Llama'
});

// Join the documents
post.author = author;

// Save everything
post.saveAll()
  .then(result => console.log(result));

/*
output:
{
  id: '0e4a6f6f-cc0c-4aa5-951a-fcfc480dd05a',
  title: 'Hello World!',
  content: 'This is an example.',
  idAuthor: '3851d8b4-5358-43f2-ba23-f4d481358901',
  author: {
    id: '3851d8b4-5358-43f2-ba23-f4d481358901',
    name: 'Llama'
  }
}
*/
```

## Notes

Presently this is, for the most part, a drop-in replacement for [thinky](http://thinky.io/), with a few notable changes:
* Table schemas explicitly use [json-schema](http://json-schema.org/) instead of thinky's home brewed schemas
* Virtual fields are not (yet) implemented
* All validation is asynchronous
* All validation options (`enforce_missing`, `enforce_extra`, `enforce_type`) have been removed in favor of equivalents in either json-schema itself, or options in ajv.
* Node.js 4+ is required

## Credits

* Many thanks to [neumino](https://github.com/neumino) for his great work on [thinky](http://think.io), without which this module would not be possible.
* Additional thanks to [epoberezkin](https://github.com/epoberezkin) for his fantastic work on [ajv](https://github.com/epoberezkin/ajv).

