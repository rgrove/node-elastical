/*
These tests require an ElasticSearch server on 127.0.0.1:9200.
*/

var elastical = require('../index'),

    assert = require('assert'),
    vows   = require('vows');

vows.describe('Elastical').addBatch({
    'Client': {
        topic: new elastical.Client(),

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
        },

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
        }
    }

}).export(module);
