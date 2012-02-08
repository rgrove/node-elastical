Elastical
=========

Elastical is a Node.js client library for the
[ElasticSearch](http://www.elasticsearch.org) REST API.

It's not quite finished, but what's done so far has doc comments and unit tests.
Keep an eye on this repo for updates.


Installing
----------

Latest released version:

    npm install elastical

Latest dev code:

    npm install https://github.com/rgrove/node-elastical/tarball/master


Basic Usage
-----------

Require elastical:

```js
var elastical = require('elastical');
```

Instantiate an Elastical client that will connect to http://127.0.0.1:9200:

```js
var client = new elastical.Client();
```

Or specify a custom host and port:

```js
var client = new elastical.Client('example.com', {port: 1234});
```

Index a document:

```js
// Specify the index name, document type, and document to index.
client.index('blog', 'post', {
    title: "Welcome to my stupid blog",
    body : "This is the only thing I'll ever post.",
    tags : ["welcome", "first post", "last post"]
}, function (err, res) {
    // `err` is an Error, or `null` on success.
    // `res` is the parsed ElasticSearch response data.
});
```

Retrieve a previously-indexed document by id:

```js
// Specify the index and the document id.
client.get('blog', '42', function (err, doc, res) {
    // `err` is an Error, or `null` on success.
    // `doc` is the parsed document data.
    // `res` is the full parsed ElasticSearch response data.
});
```

Perform a search:

```js
// Simple string query (automatically turned into a query_string query).
client.search({query: 'welcome'}, function (err, results, res) {
    // `err` is an Error, or `null` on success.
    // `results` is an object containing search hits.
    // `res` is the full parsed ElasticSearch response data.
});

// Custom query options (this is equivalent to the previous example, just
// without the magic).
client.search({
    query: {query_string: {query: 'welcome'}}
}, function (err, results, res) {
    // ...
});
```

See the doc comments in the source for more details on available methods and
options.


Developing
----------

Fork the git repo, clone it, then install the dev dependencies.

    cd elastical
    npm install

Make your changes, add tests, then run the tests to make sure nothing broke.

    make test

This will run both offline and online tests. Online tests require an
ElasticSearch server running at http://127.0.0.1:9200/. If you only want to run
the offline tests (which don't require a server), run:

    make offline-tests


Pull Requests
-------------

Before embarking on any major changes, please drop me a note first just to make
sure I'm not already working on something similar. This could save us both some
trouble.

Please make your changes in a topic branch and submit a pull request describing
what the changes do and why I should merge them. Save time by including good
offline and online tests for your changes (if you don't, I'll just ask you to
add them). Thanks!


Support
-------

Nope.


License
-------

Copyright (c) 2012 Ryan Grove (ryan@wonko.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
