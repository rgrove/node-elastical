Elastical
=========

Elastical is a Node.js client library for the
[ElasticSearch](http://www.elasticsearch.org) REST API.

It's not quite finished, but what's done so far has doc comments and unit tests.
Keep an eye on this repo for updates.


Installing
----------

    npm install https://github.com/rgrove/elastical/tarball/master


Basic Usage
-----------

```js
var elastical = require('elastical'),
    client    = new elastical.Client();

// Index a document.
client.index('blog', 'post', {
    title: "Welcome to my stupid blog",
    body : "This is the only thing I'll ever post.",
    tags : ["welcome", "first post", "last post"]
}, function (err, res) {
    if (err) { throw err; }

    // Retrieve the document we just indexed.
    client.get('blog', res._id, function (err, doc) {
        console.log(doc);
        // => {
        //   title: "Welcome to my stupid blog",
        //   body : "This is the only thing I'll ever post.",
        //   tags : ["welcome", "first post", "last post"]
        // }
    });
});
```


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

Please make your changes in a topic branch and submit a pull request describing
what the changes do and why I should merge them. Save time by including good
tests for your changes (if you don't, I'll just ask you to add them).


Support
-------

Nope.


License
-------

Copyright (c) 2011 Ryan Grove (ryan@wonko.com)

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
