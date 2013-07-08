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

        '`timeout` should default to 60000': function (client) {
            assert.strictEqual(client.options.timeout, 60000);
        },

        '`baseUrl` should reflect the current host and port': function (client) {
            assert.equal(client.baseUrl, 'http://127.0.0.1:9200');

            client.host = 'example.com';
            client.options.port = 42;

            assert.equal(client.baseUrl, 'http://example.com:42');
        },

        // -- Methods ----------------------------------------------------------
        '`bulk()`': {
            'without options': {
                'basic operations': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.bulk([
                            {create: {index: 'blog', type: 'post', id: 'foo', data: {
                                a: 'a',
                                b: 'b'
                            }}},

                            {index: {index: 'blog', type: 'post', id: 'bar', percolate: '*', data: {
                                c: 'c',
                                d: 'd'
                            }}},

                            {delete: {index: 'blog', type: 'post', id: 'deleteme'}}
                        ]);
                    },

                    'method should be PUT': function (err, options) {
                        assert.equal(options.method, 'PUT');
                    },

                    'URL should have the correct path': function (err, options) {
                        assert.equal(parseUrl(options.uri).pathname, '/_bulk');
                    },

                    'URL should not have a query string': function (err, options) {
                        assert.isUndefined(parseUrl(options.uri).search);
                    },

                    'body should be formatted correctly': function (err, options) {
                        assert.equal(options.body,
                            '{"create":{"_index":"blog","_type":"post","_id":"foo"}}\n' +
                            '{"a":"a","b":"b"}\n' +
                            '{"index":{"_index":"blog","_type":"post","_id":"bar","percolate":"*"}}\n' +
                            '{"c":"c","d":"d"}\n' +
                            '{"delete":{"_index":"blog","_type":"post","_id":"deleteme"}}\n'
                        );
                    }
                },

                'operations containing underscore-prefixed properties': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.bulk([
                            {create: {_index: 'blog', _type: 'post', _id: 'foo', data: {
                                a: 'a',
                                b: 'b'
                            }}},

                            {index: {_index: 'blog', _type: 'post', _id: 'bar', data: {
                                c: 'c',
                                d: 'd'
                            }}},

                            {delete: {_index: 'blog', _type: 'post', _id: 'deleteme'}}
                        ]);
                    },

                    'body should be formatted correctly': function (err, options) {
                        assert.equal(options.body,
                            '{"create":{"_index":"blog","_type":"post","_id":"foo"}}\n' +
                            '{"a":"a","b":"b"}\n' +
                            '{"index":{"_index":"blog","_type":"post","_id":"bar"}}\n' +
                            '{"c":"c","d":"d"}\n' +
                            '{"delete":{"_index":"blog","_type":"post","_id":"deleteme"}}\n'
                        );
                    }
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.bulk([
                        {create: {index: 'blog', type: 'post', id: 'foo', data: {
                            a: 'a',
                            b: 'b'
                        }}},

                        {index: {index: 'blog', type: 'post', id: 'bar', data: {
                            c: 'c',
                            d: 'd'
                        }}},

                        {delete: {index: 'blog', type: 'post', id: 'deleteme'}}
                    ], {
                        consistency: 'one',
                        refresh    : true,
                        index      : 'blog'
                    });
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        consistency: 'one',
                        refresh    : '1'
                    }, query);
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_bulk');
                }
            }
        },

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
                    assert.equal(parseUrl(options.uri).pathname, '/new-index');
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

        '`delete()`': {
            'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.delete('posts', 'post', '1');
                },

                'method should be DELETE': function (err, options) {
                    assert.equal(options.method, 'DELETE');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/posts/post/1');
                },

                'URL should not have a query string': function (err, options) {
                    assert.isUndefined(parseUrl(options.uri).search);
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.delete('posts', 'post', '1', {
                        consistency  : 'all',
                        ignoreMissing: true,
                        parent       : '42',
                        refresh      : true,
                        replication  : 'async',
                        routing      : 'hashyhash',
                        version      : 18
                    });
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        consistency: 'all',
                        parent     : '42',
                        refresh    : '1',
                        replication: 'async',
                        routing    : 'hashyhash',
                        version    : '18'
                    }, query);
                }
            },

            'with query option': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.delete('posts', 'post', '', {
                        query: {"term" : { "user" : "kimchy" }}
                    });
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.uri, true).query;
                    assert.deepEqual('http://example.com:42/posts/post/_query', options.uri);
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
                    assert.equal(parseUrl(options.uri).pathname, '/foo');
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
                    assert.equal(parseUrl(options.uri).pathname, '/foo%2Cbar');
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
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_all/1');
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
                    assert.equal(parseUrl(options.uri).pathname, '/blog/post/1');
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

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
                        content: 'Moo.',
                        option: null,
                        option2: undefined
                    });
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/post');
                },

                'request body should be set': function (err, options) {
                    delete options.json.option2;
                    assert.deepEqual({
                        title  : 'Hello',
                        content: 'Moo.',
                        option: null
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
                    assert.equal(parseUrl(options.uri).pathname, '/blog/post/1');
                },

                'URL query string should contain the options': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

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
                    assert.equal(parseUrl(options.uri).pathname, '/foo');
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
                    assert.equal(parseUrl(options.uri).pathname, '/foo%2Cbar');
                }
            }
        },

        '`updateSettings()`': {
            'with no index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.updateSettings({ index: { refresh_interval: '5s' }});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_settings');
                },

                'settings should be passed in the request body': function (err, options) {
                    assert.deepEqual({ index: { refresh_interval: '5s' }}, options.json);
                }
            },

            'with one index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.updateSettings('foo', { index: { refresh_interval: '5s' }});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo/_settings');
                },

                'settings should be passed in the request body': function (err, options) {
                    assert.deepEqual({ index: { refresh_interval: '5s' }}, options.json);
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.updateSettings(['foo', 'bar'], { index: { refresh_interval: '5s' }});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo%2Cbar/_settings');
                },

                'settings should be passed in the request body': function (err, options) {
                    assert.deepEqual({ index: { refresh_interval: '5s' }}, options.json);
                }
            }
        },

        '`putMapping()`': {
            'with no index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.putMapping('tweet', { tweet: { properties: { message: { type: 'string', store: 'yes' }}}});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_all/tweet/_mapping');
                },

                'mapping definition should be passed in the request body': function (err, options) {
                    assert.deepEqual({ tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, options.json);
                }
            },

            'with one index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.putMapping('foo', 'tweet', { tweet: { properties: { message: { type: 'string', store: 'yes' }}}});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo/tweet/_mapping');
                },

                'mapping definition should be passed in the request body': function (err, options) {
                    assert.deepEqual({ tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, options.json);
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.putMapping(['foo', 'bar'], 'tweet', { tweet: { properties: { message: { type: 'string', store: 'yes' }}}});
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo%2Cbar/tweet/_mapping');
                },

                'mapping definition should be passed in the request body': function (err, options) {
                    assert.deepEqual({ tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, options.json);
                }
            }
        },

        '`analyze()`': {
            'without index': {
                'without options': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.analyze('my message');
                    },

                    'method should be GET': function (err, options) {
                        assert.equal(options.method, 'GET');
                    },

                    'URL should have the correct path': function (err, options) {
                        assert.equal(parseUrl(options.uri).pathname, '/_analyze');
                        assert.equal(parseUrl(options.uri).query, 'text=my%20message');
                    }
                },

                'with options': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.analyze('my message', { tokenizer: 'keyword', filters: 'lowercase' });
                    },

                    'method should be GET': function (err, options) {
                        assert.equal(options.method, 'GET');
                    },

                    'URL should have the correct path': function (err, options) {
                        assert.equal(parseUrl(options.uri).pathname, '/_analyze');
                        assert.equal(parseUrl(options.uri).query, 'text=my%20message&tokenizer=keyword&filters=lowercase');
                    }
                }
            },

            'with one index': {
                'without options': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.analyze('my message', { index: 'posts' });
                    },

                    'method should be GET': function (err, options) {
                        assert.equal(options.method, 'GET');
                    },

                    'URL should have the correct path': function (err, options) {
                        assert.equal(parseUrl(options.uri).pathname, '/posts/_analyze');
                        assert.equal(parseUrl(options.uri).query, 'text=my%20message');
                    }
                },

                'with options': {
                    topic: function (client) {
                        client._testHook = this.callback;
                        client.analyze('my message', { index: 'posts', tokenizer: 'keyword', filters: 'lowercase' });
                    },

                    'method should be GET': function (err, options) {
                        assert.equal(options.method, 'GET');
                    },

                    'URL should have the correct path': function (err, options) {
                        assert.equal(parseUrl(options.uri).pathname, '/posts/_analyze');
                        assert.equal(parseUrl(options.uri).query, 'text=my%20message&tokenizer=keyword&filters=lowercase');
                    }
                }
            }
        },

        '`putRiver()`':{
            'no filters': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.putRiver('_river','my_river_name', { type : 'couchdb', couchdb : { host : 'localhost' }, index : {} } );
                },

                'method should be PUT': function (err, options) {
                    assert.equal(options.method, 'PUT');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_river/my_river_name/_meta');
                },

                'mapping definition should be passed in the request body': function (err, options) {
                    assert.deepEqual( { type : 'couchdb', couchdb : { host : 'localhost' }, index : {} }, options.json);
                }
            }
        },

        '`getRiver()`':{
            'basic': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.getRiver('_river','my_river_name' );
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_river/my_river_name/_meta');
                }
            }
        },

        '`deleteRiver()`':{
            'basic': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.deleteRiver('_river','my_river_name' );
                },

                'method should be DELETE': function (err, options) {
                    assert.equal(options.method, 'DELETE');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_river/my_river_name');
                }
            }
        },

        '`refresh()`': {
            'with no index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.refresh();
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_all/_refresh');
                }
            },

            'with one index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.refresh('foo');
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo/_refresh');
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.refresh(['foo', 'bar']);
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo%2Cbar/_refresh');
                }
            }
        },

        '`search()`': {
            'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search(function () {});
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'request should not have a body': function (err, options) {
                    assert.isUndefined(options.body);
                    assert.deepEqual(options.json, {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_search');
                }
            },

            'with options but no scroll_id': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({
                        query         : {query_string: {query: 'foo'}},
                        explain       : true,
                        facets        : {},
                        fields        : ['one', 'two'],
                        filter        : {},
                        from          : 3,
                        highlight     : {},
                        ignore_indices: 'missing',
                        index         : 'blog',
                        indices_boost : {},
                        min_score     : 0.5,
                        preference    : '_primary',
                        routing       : 'hashyhash',
                        script_fields : {},
                        scroll        : '1m',
                        search_type   : 'query_and_fetch',
                        size          : 42,
                        sort          : {},
                        timeout       : '15s',
                        track_scores  : true,
                        type          : 'post',
                        version       : true
                    }, function () {});
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/post/_search');
                },

                'URL query string should contain the correct parameters': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        ignore_indices: 'missing',
                        preference    : '_primary',
                        routing       : 'hashyhash',
                        scroll        : '1m',
                        search_type   : 'query_and_fetch',
                        timeout       : '15s'
                    }, query);
                },

                'request body should contain the correct options': function (err, options) {
                    assert.deepEqual({
                        query        : {query_string: {query: 'foo'}},
                        explain      : true,
                        facets       : {},
                        fields       : ['one', 'two'],
                        filter       : {},
                        from         : 3,
                        highlight    : {},
                        indices_boost: {},
                        min_score    : 0.5,
                        script_fields: {},
                        size         : 42,
                        sort         : {},
                        track_scores : true,
                        version      : true
                    }, options.json);
                },
            },

            'with options and scroll_id': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({
                        query        : {query_string: {query: 'foo'}},
                        explain      : true,
                        facets       : {},
                        fields       : ['one', 'two'],
                        filter       : {},
                        from         : 3,
                        highlight    : {},
                        index        : 'blog',
                        indices_boost: {},
                        min_score    : 0.5,
                        preference   : '_primary',
                        routing      : 'hashyhash',
                        script_fields: {},
                        scroll       : '1m',
                        scroll_id    : 'foo',
                        search_type  : 'query_and_fetch',
                        size         : 42,
                        sort         : {},
                        timeout      : '15s',
                        track_scores : true,
                        type         : 'post',
                        version      : true
                    }, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/post/_search/scroll');
                },

                'URL query string should contain the correct parameters': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        preference : '_primary',
                        routing    : 'hashyhash',
                        scroll     : '1m',
                        scroll_id  : 'foo',
                        search_type: 'query_and_fetch',
                        timeout    : '15s'
                    }, query);
                }
            },

            'with index but no type': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({index: 'blog'}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_search');
                }
            },

            'with type but no index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({type: 'post'}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_all/post/_search');
                }
            },

            'with multiple indices and types': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({
                        index: ['blog', 'twitter'],
                        type : ['post', 'tweet']
                    }, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog%2Ctwitter/post%2Ctweet/_search');
                }
            },

            'with `options.query` set to a string': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({query: 'foo'}, function () {});
                },

                'should convert the query into a query_string query object': function (err, options) {
                    assert.deepEqual({
                        query: {query_string: {query: 'foo'}}
                    }, options.json);
                }
            },

            'with `options.fields` set to a string': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.search({fields: 'title'}, function () {});
                },

                'request body should contain an array with a single field name': function (err, options) {
                    assert.deepEqual({fields: ['title']}, options.json);
                }
            }
        },

        '`stats()`': {
          'without options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.stats(function () {});
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_stats');
                }
            },

            'with index': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.stats({index: 'blog'}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_stats');
                }
            },

            'with index and types': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.stats({index: 'blog', types: 'post'}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_stats');
                    assert.equal(parseUrl(options.uri).query, 'types=post');
                }
            },

            'with index and types array': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.stats({index: 'blog', types: ['post1', 'post2']}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    var encode = encodeURIComponent;
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_stats');
                    assert.equal(parseUrl(options.uri).query, 'types=' + encode('post1,post2'));
                }
            },

            'with options': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.stats({
                        index  : 'blog',
                        types  : 'post',
                        warmer : true,
                        merge  : true,
                        flush  : true,
                        refresh: true,
                        clear  : true
                    }, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/_stats');
                },

                'URL query string should contain the correct parameters': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        types: 'post',
                        warmer : true,
                        merge  : true,
                        flush  : true,
                        refresh: true,
                        clear  : true
                    }, query);
                }
            }
        },

        '`set()` should be an alias for `index()`': function (client) {
            assert.strictEqual(client.index, client.set);
        },
        '`setPercolator()`': {
            'with query': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.setPercolator('blog', 'bar', {
                        "query" : {
                          "text" : {
                            "tags" : {
                              "query" : 'socialmedia blah blah ',
                              "operator" : "or"
                            }
                          }
                        }
                    }, function () {});
                },

                'method should be POST': function (err, options) {
                    assert.equal(options.method, 'POST');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_percolator/blog/bar');
                },
                'request body should contain the correct options': function (err, options) {
                    assert.deepEqual(options.json, {
                        "query" : {
                            "text" : {
                              "tags" : {
                                "query" : 'socialmedia blah blah ',
                                "operator" : "or"
                              }
                            }
                        }
                    });
                }
            }

        },
        '`getPercolator()`': {
            'should return a percolator document': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.getPercolator('blog', 'bar', function () {});
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_percolator/blog/bar');
                }
            }
        },
        '`percolate()`': {
            'should return a match and the name of the percolator': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.percolate('blog', 'bar', {
                        title  : 'Hello',
                        content: 'Moo.',
                        tags: ['socialmedia', 'startup', 'saas']
                    }, function () {});
                },

                'method should be GET': function (err, options) {
                    assert.equal(options.method, 'GET');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/blog/bar/_percolate');
                }
            }
        },
        '`deletePercolator()`': {
            'should return a success': {
                topic: function (client) {
                    client._testHook = this.callback;
                    client.deletePercolator('blog', 'bar', function () {});
                },

                'method should be DELETE': function (err, options) {
                    assert.equal(options.method, 'DELETE');
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/_percolator/blog/bar');
                }
            }
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

    'Client with authentication': {
        topic: new elastical.Client({auth: 'username:password'}),

        '`baseUrl` should reflect the auth settings': function (client) {
            assert.equal(client.baseUrl, 'http://username:password@127.0.0.1:9200');
        }
    },

    'Client with authentication and https protocol': {
        topic: new elastical.Client({auth: 'username:password', protocol: 'https'}),

        '`baseUrl` should reflect the protocol and auth settings': function (client) {
            assert.equal(client.baseUrl, 'https://username:password@127.0.0.1:9200');
        }
    },

    'Client with custom request options': {
        topic: function(){
          var client = new elastical.Client({pool: { maxSockets: 10 }})
          client._testHook = this.callback;
          client.get('blog', '1');
        },

        'the option should be passed to request': function (err, options) {
            assert.equal(options.pool.maxSockets, 10);
        }
    },

    'Index': {
        topic: new elastical.Client().getIndex('foo'),

        '`name` should be the index name': function (index) {
            assert.equal(index.name, 'foo');
        },

        '`search()`': {
            topic: function (index) {
                index.client._testHook = this.callback;
                index.search({query: 'test'}, function () {});
            },

            'URL should have the correct path': function (err, options) {
                assert.equal(parseUrl(options.uri).pathname, '/foo/_search');
            },

            'options should be passed through': function (err, options) {
                assert.deepEqual({
                    query: {query_string: {query: 'test'}}
                }, options.json);
            }
        },

        '`set()` should be an alias for `index()`': function (index) {
            assert.strictEqual(index.set, index.index);
        },

        '`stats()`': {
            'with index and types': {
                topic: function (index) {
                    index.client._testHook = this.callback;
                    index.stats({types: 'bar'}, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo/_stats');
                    assert.equal(parseUrl(options.uri).query, 'types=bar');
                }
            },

            'with options': {
                topic: function (index) {
                    index.client._testHook = this.callback;
                    index.stats({
                        types  : 'bar',
                        warmer : true,
                        merge  : true,
                        flush  : true,
                        refresh: true,
                        clear  : true
                    }, function () {});
                },

                'URL should have the correct path': function (err, options) {
                    assert.equal(parseUrl(options.uri).pathname, '/foo/_stats');
                },

                'URL query string should contain the correct parameters': function (err, options) {
                    var query = parseUrl(options.uri, true).query;

                    assert.deepEqual({
                        types: 'bar',
                        warmer : true,
                        merge  : true,
                        flush  : true,
                        refresh: true,
                        clear  : true
                    }, query);
                }
            }
        }
    }
}).export(module);
