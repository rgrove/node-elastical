/*
These tests can run without an ElasticSearch server.
*/

var elastical = require('../index'),

    assert   = require('assert'),
    parseUrl = require('url').parse,
    vows     = require('vows');

vows.describe('Elastical').addBatch({
    'Client': {
        topic: new elastical.Client(),

        // -- Properties -------------------------------------------------------
        '`host` should default to "127.0.0.1"': function (client) {
            assert.equal(client.host, '127.0.0.1');
        },

        '`port` should default to 9200': function (client) {
            assert.strictEqual(client.port, 9200);
            assert.strictEqual(client.options.port, 9200);
        },

        '`timeout` should default to 10000': function (client) {
            assert.strictEqual(client.options.timeout, 10000);
        },

        '`baseURL` should reflect the current host and port': function (client) {
            assert.equal(client.baseURL, 'http://127.0.0.1:9200');

            client.host = 'example.com';
            client.options.port = 42;

            assert.equal(client.baseURL, 'http://example.com:42');
        },

        // -- Methods ----------------------------------------------------------
        '`createIndex()`': {
            'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.createIndex('new-index');
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/new-index');
                },

                'request should not have a body': function (err, options) {
                    assert.isUndefined(options.body);
                    assert.isUndefined(options.json);
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.createIndex('new-index', {
                        settings: {number_of_shards: 1}
                    });
                },

                'options should be passed in the request body': function (err, options) {
                    assert.deepEqual({settings: {number_of_shards: 1}}, options.json);
                }
            }
        },

        '`deleteIndex()`': {
            'with one index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.deleteIndex('foo');
                },

                'method should be DELETE': function (err, options) {
                    assert.equal(options.method, 'DELETE');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/foo');
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.deleteIndex(['foo', 'bar']);
                },

                'method should be DELETE': function (err, options) {
                    assert.equal(options.method, 'DELETE');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/foo%2Cbar');
                }
            }
        },

        '`get()`': {
            'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.get('blog', 1);
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/blog/_all/1');
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.get('blog', 1, {
                        fields    : ['one', 'two'],
                        preference: '_primary',
                        realtime  : false,
                        refresh   : true,
                        routing   : 'hashyhash',
                        type      : 'post'
                    });
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/blog/post/1');
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.url, true).query;

                    assert.deepEqual({
                        fields    : 'one,two',
                        preference: '_primary',
                        realtime  : '0',
                        refresh   : '1',
                        routing   : 'hashyhash'
                    }, query);
                }
            }
        },

        '`getIndex()` should get an Index instance': function (client) {
            var index = client.getIndex('foo');

            assert.instanceOf(index, elastical.Index);
            assert.strictEqual(client, index.client);
        },

        '`getIndex()` should cache Index instances': function (client) {
            assert.strictEqual(client.getIndex('foo'), client.getIndex('foo'));
        },

        '`index()`': {
            'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.index('blog', 'post', {
                        title  : 'Hello',
                        content: 'Moo.'
                    });
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/blog/post');
                },

                'request body should be set': function (err, options) {
                    assert.deepEqual({
                        title  : 'Hello',
                        content: 'Moo.'
                    }, options.json);
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.index('blog', 'post', {
                        title  : 'Hello',
                        content: 'Moo.'
                    }, {
                        consistency: 'all',
                        create     : true,
                        id         : '1',
                        parent     : '42',
                        percolate  : '*',
                        refresh    : true,
                        replication: 'async',
                        routing    : 'hashyhash',
                        timeout    : '5m',
                        version    : '42'
                    });
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/blog/post/1');
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.url, true).query;

                    assert.deepEqual({
                        consistency : 'all',
                        op_type     : 'create',
                        parent      : '42',
                        percolate   : '*',
                        refresh     : '1',
                        replication : 'async',
                        routing     : 'hashyhash',
                        timeout     : '5m',
                        version     : '42',
                        version_type: 'external' // set automatically
                    }, query);
                }
            }
        },

        '`indexExists()`': {
            'with one index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.indexExists('foo');
                },

                'method should be HEAD': function (err, options) {
                    assert.equal(options.method, 'HEAD');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/foo');
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.indexExists(['foo', 'bar']);
                },

                'method should be HEAD': function (err, options) {
                    assert.equal(options.method, 'HEAD');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.url).pathname, '/foo%2Cbar');
                }
            }
        },

        '`set()` should be an alias for `index()`': function (client) {
            assert.strictEqual(client.index, client.set);
        }
    },

    'Client with host': {
        topic: new elastical.Client('example.com'),

        '`host` should equal "example.com"': function (client) {
            assert.equal(client.host, 'example.com');
        }
    },

    'Client with host and options': {
        topic: new elastical.Client('example.com', {port: 42, timeout: 5000}),

        '`host` should equal "example.com"': function (client) {
            assert.equal(client.host, 'example.com');
        },

        '`port` should equal 42': function (client) {
            assert.strictEqual(client.port, 42);
            assert.strictEqual(client.options.port, 42);
        },

        '`timeout` should equal 5000': function (client) {
            assert.strictEqual(client.options.timeout, 5000);
        }
    },

    'Index': {
        topic: new elastical.Client().getIndex('foo'),

        '`name` should be the index name': function (index) {
            assert.equal(index.name, 'foo');
        },

        '`set()` should be an alias for `index()`': function (index) {
            assert.strictEqual(index.set, index.index);
        }
    }
}).export(module);
