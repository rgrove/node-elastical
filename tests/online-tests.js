/*
These tests require an ElasticSearch server on 127.0.0.1:9200.
*/

var elastical = require('../index'),

    assert = require('assert'),
    vows   = require('vows');

vows.describe('Elastical')
.addBatch({
    'Client': {
        topic: new elastical.Client(),

        '`bulk()`': {
            'when the index exists': {
                topic: function (client) {
                    client.bulk([
                        {create: {index: 'elastical-test-bulk', type: 'post', id: 'foo', data: {
                            a: 'a',
                            b: 'b'
                        }}},

                        {index: {index: 'elastical-test-bulk', type: 'post', id: 'bar', data: {
                            c: 'c',
                            d: 'd'
                        }}},

                        {index: {index: 'elastical-test-bulk', type: 'post', id: 'baz', percolate: '*', data: {
                            e: 'bulkpercolate',
                            f: 'f'
                        }}},

                        {delete: {index: 'elastical-test-bulk', type: 'post', id: 'deleteme'}}
                    ], this.callback);
                },

                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isArray(res.items);
                    assert.isTrue(res.items[0].create.ok);
                    assert.isTrue(res.items[1].index.ok);
                    assert.isTrue(res.items[2].index.ok);
                    assert.equal(res.items[2].index.matches[0], 'perc');
                    assert.isTrue(res.items[3].delete.ok);
                }
            }
        },

        '`createIndex()`': {
            topic: function (client) {
                client.createIndex('elastical-test', this.callback);
            },

            teardown: function (index) {
                index.delete();
            },

            'should create an index': function (err, index, data) {
                assert.isNull(err);
                assert.instanceOf(index, elastical.Index);
                assert.equal(index.name, 'elastical-test');
                assert.isObject(data);
                assert.isTrue(data.ok);
            },

            'when the index already exists': {
                topic: function (index, data, client) {
                    client.createIndex('elastical-test', this.callback);
                },

                'should provide an error': function (err, index, data) {
                    assert.instanceOf(err, Error, 'should get an error');
                    assert.include(err.message, 'IndexAlreadyExists');
                }
            }
        },

        '`delete()`': {
            'when called with no options': {
                topic: function (client) {
                    client.delete('elastical-test-delete', 'post', '1', this.callback);
                },

                'should delete the given document': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.found);
                }
            },

            'when the document does not exist': {
                'and `options.ignoreMissing` is not true': {
                    topic: function (client) {
                        client.delete('elastical-test-delete', 'post', '42', this.callback);
                    },

                    'should respond with an error': function (err, res) {
                        assert.instanceOf(err, Error);
                        assert.isObject(res);
                        assert.isFalse(res.found);
                    }
                },

                'and `options.ignoreMissing` is true': {
                    topic: function (client) {
                        client.delete('elastical-test-delete', 'post', '42', {
                            ignoreMissing: true
                        }, this.callback);
                    },

                    'should ignore the error': function (err, res) {
                        assert.isNull(err);
                        assert.isObject(res);
                        assert.isFalse(res.found);
                    }
                }
            }
        },

        // deleteIndex() is tested below, after everything else, since
        // ElasticSearch seems to have some race condition bugs when index
        // deletions occur asynchronously with other index operations (in
        // particular putMapping).

        '`get()`': {
            'when called with no options': {
                topic: function (client) {
                    client.get('elastical-test-get', '1', this.callback);
                },

                'should get a document': function (err, doc, res) {
                    assert.isNull(err);
                    assert.isObject(doc);
                    assert.isObject(res);
                    assert.isTrue(res.exists);

                    assert.include(doc, 'title');
                    assert.include(doc, 'body');
                    assert.include(doc, 'tags');

                    assert.isArray(doc.tags);
                }
            },

            'when the document does not exist': {
                topic: function (client) {
                    client.get('elastical-test-get', '2', this.callback);
                },

                'should respond with an error': function (err, doc, res) {
                    assert.instanceOf(err, Error);
                    assert.isNull(doc);
                    assert.isObject(res);
                    assert.isFalse(res.exists);
                }
            },

            'when the index does not exist': {
                topic: function (client) {
                    client.get('elastical-test-bogus', '2', this.callback);
                },

                'should respond with an error': function (err, doc, res) {
                    assert.instanceOf(err, Error);
                    assert.isNull(doc);
                    assert.isObject(res);
                }
            },

            '`options.fields`': {
                'when set to a String': {
                    topic: function (client) {
                        client.get('elastical-test-get', '1', {
                            fields: 'title'
                        }, this.callback);
                    },

                    'should get only the specified field': function (err, doc, res) {
                        assert.isNull(err);
                        assert.isObject(doc);
                        assert.isObject(res);
                        assert.isTrue(res.exists);

                        assert.include(doc, 'title');
                        assert.isUndefined(doc.body);
                        assert.isUndefined(doc.tags);
                    }
                },

                'when set to an Array': {
                    topic: function (client) {
                        client.get('elastical-test-get', '1', {
                            fields: ['title', 'body']
                        }, this.callback);
                    },

                    'should get only the specified fields': function (err, doc, res) {
                        assert.isNull(err);
                        assert.isObject(doc);
                        assert.isObject(res);
                        assert.isTrue(res.exists);

                        assert.include(doc, 'title');
                        assert.include(doc, 'body');
                    }
                }
            },

            '`options.ignoreMissing`': {
                'when `true` and the document does not exist': {
                    topic: function (client) {
                        client.get('elastical-test-get', '2', {
                            ignoreMissing: true
                        }, this.callback);
                    },

                    'should not respond with an error': function (err, doc, res) {
                        assert.isNull(err);
                        assert.isNull(doc);
                        assert.isObject(res);
                        assert.isFalse(res.exists);
                    }
                },

                'when `true` and the index does not exist': {
                    topic: function (client) {
                        client.get('elastical-test-bogus', '2', {
                            ignoreMissing: true
                        }, this.callback);
                    },

                    'should not respond with an error': function (err, doc, res) {
                        assert.isNull(err);
                        assert.isNull(doc);
                        assert.isObject(res);
                    }
                }
            },

            '`options.type`': {
                'when a document with that type exists': {
                    topic: function (client) {
                        client.get('elastical-test-get', '1', {
                            type: 'post'
                        }, this.callback);
                    },

                    'should get the document': function (err, doc, res) {
                        assert.isNull(err);
                        assert.isObject(doc);
                        assert.isObject(res);
                        assert.isTrue(res.exists);
                    }
                },

                'when a document with that type does not exist': {
                    topic: function (client) {
                        client.get('elastical-test-get', '1', {
                            type: 'bogus'
                        }, this.callback);
                    },

                    'should get an error': function (err, doc, res) {
                        assert.instanceOf(err, Error);
                        assert.isNull(doc);
                        assert.isObject(res);
                        assert.isFalse(res.exists);
                    }
                }
            }
        },

        '`index()`': {
            'when called with no options': {
                topic: function (client) {
                    client.index('elastical-test-index', 'post', {
                        title  : "Welcome to my stupid blog",
                        content: "This is the first and last time I'll post anything.",
                        tags   : ['welcome', 'first post', 'last post'],
                        created: Date.now()
                    }, this.callback);
                },

                'should index the document': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                    assert.equal(res._index, 'elastical-test-index');
                    assert.equal(res._type, 'post');
                    assert.equal(res._version, 1);
                }
            },

            'when called with `options.id`': {
                topic: function (client) {
                    client.index('elastical-test-index', 'post', {foo: 'bar'},
                        {id: 'post-foo'}, this.callback);
                },

                'should add or update the document with that id': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                    assert.equal(res._index, 'elastical-test-index');
                    assert.equal(res._type, 'post');
                    assert.equal(res._id, 'post-foo');
                }
            },

            'when called with `options.version` set': {
                topic: function (client) {
                    client.index('elastical-test-index', 'post', {foo: 'bar'},
                        {version: 42}, this.callback);
                },

                'should automatically set `version_type` to "external"': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                    assert.equal(res._version, 42);
                }
            }
        },

        '`indexExists()`': {
            'when called with a single index name': {
                'which exists': {
                    topic: function (client) {
                        client.indexExists('elastical-test-indexexists', this.callback);
                    },

                    'should respond with `true`': function (err, exists) {
                        assert.isNull(err);
                        assert.isTrue(exists);
                    }
                },

                'which does not exist': {
                    topic: function (client) {
                        client.indexExists('elastical-bogus', this.callback);
                    },

                    'should respond with `false`': function (err, exists) {
                        assert.isNull(err);
                        assert.isFalse(exists);
                    }
                }
            },

            'when called with multiple index names': {
                'which all exist': {
                    topic: function (client) {
                        client.indexExists(['elastical-test-indexexists', 'elastical-test-indexexists2'],
                            this.callback);
                    },

                    'should respond with `true`': function (err, exists) {
                        assert.isNull(err);
                        assert.isTrue(exists);
                    }
                },

                'which do not all exist': {
                    topic: function (client) {
                        client.indexExists(['elastical-test-indexexists', 'elastical-bogus'],
                            this.callback);
                    },

                    'should respond with `false`': function (err, exists) {
                        assert.isNull(err);
                        assert.isFalse(exists);
                    }
                }
            }
        },

        '`putMapping()`': {
            'with no index': {
                topic: function (client) {
                    client.putMapping('tweet', { tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, this.callback);
                },

                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                }
            },

            'with one index': {
                'which exists': {
                    topic: function (client) {
                        client.putMapping('elastical-test-putmapping', 'tweet',
                            { tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, this.callback);
                    },

                    'should succeed': function (err, res) {
                        assert.isNull(err);
                        assert.isObject(res);
                        assert.isTrue(res.ok);
                    }
                },

                'which does not exist': {
                    topic: function (client) {
                        client.putMapping('elastical-test-bogus', 'tweet',
                            { tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, this.callback);
                    },

                    'should respond with an error': function (err, res) {
                        assert.instanceOf(err, Error);
                        assert.isObject(res);
                    }
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client.putMapping(['elastical-test-putmapping', 'elastical-test-putmapping2'], 'tweet',
                        { tweet: { properties: { message: { type: 'string', store: 'yes' }}}}, this.callback);
                },

                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                }
            }
        },

        '`getMapping()`': {
            'of a specific type within a specific index': {
                topic: function (client) {
                    client.getMapping('elastical-test-mapping', 'type', this.callback);
                },
                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isObject(res.type);
                    assert.isObject(res.type.properties.tags);
                    assert.isObject(res.type.properties.body);
                    assert.isObject(res.type.properties.title);
                    assert.equal(res.type.properties.body.type, 'string');
                    assert.equal(res.type.properties.tags.type, 'string');
                }
            },

            'of all types within a specific index': {
                topic: function (client) {
                    client.getMapping('elastical-test-mapping', this.callback);
                },
                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isObject(res['elastical-test-mapping'].type);
                    assert.isObject(res['elastical-test-mapping'].type.properties.tags);
                    assert.isObject(res['elastical-test-mapping'].type.properties.body);
                    assert.isObject(res['elastical-test-mapping'].type.properties.title);
                    assert.equal(res['elastical-test-mapping'].type.properties.body.type, 'string');
                    assert.equal(res['elastical-test-mapping'].type.properties.tags.type, 'string');
                    assert.isObject(res['elastical-test-mapping'].type2); // tweet has been set by putMapping tests
                    assert.isObject(res['elastical-test-mapping'].type2.properties.other);
                    assert.equal(res['elastical-test-mapping'].type2.properties.other.type, 'long');
                }
            },
            'within multiple indices': {
                topic: function (client) {
                    client.getMapping(['elastical-test-mapping', 'elastical-test-mapping2'], this.callback);
                },
                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isObject(res['elastical-test-mapping'].type);
                    assert.isObject(res['elastical-test-mapping2'].type);
                }
            },
            'of an unexisting index': {
                topic: function (client) {
                    client.getMapping('elastical-test-mapping-unexisting', 'type', this.callback);
                },
                'should return an IndexMissingException': function (err, res) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'IndexMissingException[[elastical-test-mapping-unexisting] missing]');
                    assert.equal(res.status, 404);
                    assert.equal(res.error, 'IndexMissingException[[elastical-test-mapping-unexisting] missing]');
                }
            },
            'of an unexisting type': {
                topic: function (client) {
                    client.getMapping('elastical-test-mapping', 'type-unexisting', this.callback);
                },
                'should return an TypeMissingException': function (err, res) {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'TypeMissingException[[elastical-test-mapping] type[type-unexisting] missing]');
                    assert.equal(res.status, 404);
                    assert.equal(res.error, 'TypeMissingException[[elastical-test-mapping] type[type-unexisting] missing]');
                }
            }
        },

        '`refresh()`': {
            'with no index': {
                topic: function (client) {
                    client.refresh(this.callback);
                },

                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                    assert.isObject(res._shards);
                }
            },

            'with one index': {
                'which exists': {
                    topic: function (client) {
                        client.refresh('elastical-test-refresh', this.callback);
                    },

                    'should succeed': function (err, res) {
                        assert.isNull(err);
                        assert.isObject(res);
                        assert.isTrue(res.ok);
                        assert.isObject(res._shards);
                    }
                },

                'which does not exist': {
                    topic: function (client) {
                        client.refresh('elastical-test-bogus', this.callback);
                    },

                    'should respond with an error': function (err, res) {
                        assert.instanceOf(err, Error);
                        assert.isObject(res);
                    }
                }
            },

            'with multiple indices': {
                topic: function (client) {
                    client.refresh(['elastical-test-refresh', 'elastical-test-refresh2'],
                        this.callback);
                },

                'should succeed': function (err, res) {
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.isTrue(res.ok);
                    assert.isObject(res._shards);
                }
            }
        },

        '`search()`': {
            'simple string query': {
                topic: function (client) {
                    client.search({
                        index: 'elastical-test-get',
                        query: 'hello'
                    }, this.callback);
                },

                'should return a hit': function (err, results, res) {
                    assert.isNull(err);
                    assert.isObject(results);
                    assert.isObject(res);
                    assert.equal(1, results.total);
                    assert.isArray(results.hits);
                    assert.strictEqual(res.hits, results);
                }
            },

            'simple object query': {
                topic: function (client) {
                    client.search({
                        index: 'elastical-test-get',
                        query: {query_string: {query: 'hello'}}
                    }, this.callback);
                },

                'should return a hit': function (err, results, res) {
                    assert.isNull(err);
                    assert.isObject(results);
                    assert.isObject(res);
                    assert.equal(1, results.total);
                    assert.isArray(results.hits);
                    assert.strictEqual(res.hits, results);
                }
            }
        },

        '`putRiver()`': {
            topic: function (client) {
                client.putRiver( 'elastical-test-river', 'elastical-test-river-put', { type:'dummy' }, this.callback );	
            },

            'should return ok': function (err, results, res) {
                assert.equal(results.ok,true);
                assert.equal(results._index,'_river');
                assert.equal(results._type,'elastical-test-river-put');
            }
        },

        '`getRiver()`': {
            topic: function (client) {
                client.getRiver( 'elastical-test-river', 'elastical-test-river-get', this.callback );	
            },

            'should return ok': function (err, results, res) {
                assert.equal(results._type,"elastical-test-river-get");
                assert.equal(results.exists,true);
                assert.equal(results._source.type,"dummy");
            }
        },

        '`deleteRiver()`': {
            topic: function (client) {
                client.deleteRiver( 'elastical-test-river', 'elastical-test-river-delete', this.callback );	
            },

            'should return ok': function (err, results, res) {
                assert.equal(results.ok,true);
            }
        }
    }
})
.addBatch({
    'Percolator Tests': {
        topic: new elastical.Client(),
        '`setPercolator()`':{
            topic: function(client){
                client.setPercolator('elastical-test-percolator-index',
                                  'elastical-test-percolator-set',
                                  {
                                    "query" : {
                                      "text" : {
                                        "tags" : {
                                          "query" : 'blah blah',
                                          "operator" : "and"
                                        }
                                      }
                                    }
                                }, this.callback);
            },
            'should return success': function(err, res){
                assert.isNull(err);
                assert.isObject(res);
                //{"ok":true,"_index":"_percolator","_type":"elastical-test-percolator-index","_id":"elastical-test-percolator-set","_version":13}
                assert.equal(res.ok, true);
                assert.equal(res._index, "_percolator");
                assert.equal(res._type, "elastical-test-percolator-index");
                assert.equal(res._id, "elastical-test-percolator-set");
            }
        },
        '`getPercolator()`': {
            topic: function (client) {
                client.getPercolator('elastical-test-percolator-index',
                                    'elastical-test-percolator-get',
                                    this.callback);
            },
            'should return a hit': function(err, results, res){
                assert.isNull(err);
                assert.isObject(results);
                assert.deepEqual( {
                                    "query" : {
                                      "text" : {
                                        "tags" : {
                                          "query" : 'welcome',
                                          "operator" : "or"
                                        }
                                      }
                                    }
                                }, results);
                assert.isObject(res);
                assert.equal('_percolator', res._index);
                assert.equal('elastical-test-percolator-index', res._type);
                assert.equal('elastical-test-percolator-get', res._id);
                assert.equal(true, res.exists);
            }
        },
        '`percolate()`': {
            'should return a match and the name of the percolator': {
                topic: function(client){
                    client.percolate('elastical-test-percolator-index', 'post', {
                        doc: {
                            title  : "Welcome to my stupid blog",
                            content: "This is the first and last time I'll post anything.",
                            tags   : ['welcome', 'first post', 'last post'],
                            created: Date.now()
                        }
                    }, this.callback);
                },
                'should return a hit': function(err, res){
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.deepEqual({
                        ok: true,
                        matches: [ 'elastical-test-percolator-get' ]
                    }, res);
                }
            },
            'should return a match and the name of the percolator even if doc is absent': {
                topic: function(client){
                    client.percolate('elastical-test-percolator-index', 'post', {
                        title  : "Welcome to my stupid blog",
                        content: "This is the first and last time I'll post anything.",
                        tags   : ['welcome', 'first post', 'last post'],
                        created: Date.now()
                    }, this.callback);
                },
                'should return a hit': function(err, res){
                    assert.isNull(err);
                    assert.isObject(res);
                    assert.deepEqual({
                        ok: true,
                        matches: [ 'elastical-test-percolator-get' ]
                    }, res);
                }
            }
        },
        '`deletePercolator()`': {
            topic: function (client) {
                client.deletePercolator('elastical-test-percolator-index',
                                    'elastical-test-percolator-delete',
                                    this.callback);
            },
            'should return true': function(err, res){
                assert.isNull(err);
                assert.isObject(res);
                assert.equal(res.ok , true);
                assert.equal(res.found, true);
                assert.equal(res._index, '_percolator');
                assert.equal(res._type, 'elastical-test-percolator-index');
                assert.equal(res._id, 'elastical-test-percolator-delete');
            }
        }
    }
})
.addBatch({
    'Client (part deux)': {
        topic: new elastical.Client(),

        // deleteIndex() is tested after everything else since
        // ElasticSearch seems to have some race condition bugs when index
        // deletions occur asynchronously with other index operations (in
        // particular putMapping).

        '`deleteIndex()`': {
            'when called with a single index name': {
                topic: function (client) {
                    client.deleteIndex('elastical-test-deleteme', this.callback);
                },

                'should delete the index': function (err, data) {
                    assert.isNull(err);
                    assert.isObject(data);
                    assert.isTrue(data.ok);
                }
            },

            'when called with multiple index names': {
                topic: function (client) {
                    client.deleteIndex(['elastical-test-deleteme2', 'elastical-test-deleteme3'],
                        this.callback);
                },

                'should delete all the named indices': function (err, data) {
                    assert.isNull(err);
                    assert.isObject(data);
                    assert.isTrue(data.ok);
                }
            }
        }
    }
})
.export(module);

