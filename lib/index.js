/**
Provides methods for creating, deleting, and interacting with ElasticSearch
indices.

@module elastical
@submodule index
@class Index
@param {Client} client Client instance.
@param {String} name Index name.
@constructor
**/

var util   = require('./util'),
    encode = encodeURIComponent;

function Index(client, name) {
    this.client = client;
    this.name   = name;
}

/**
Creates a new index.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-create-index.html)

@method create
@param {Client} client Client instance.
@param {String} name Name of the new index.
@param {Object} [options] Index options (see ElasticSearch docs for details).
@param {Function} [callback] Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Index} callback.index Index instance for the newly created index.
  @param {Object} callback.data ElasticSearch response data.
@static
@see Client.createIndex
**/
Index.create = function (client, name, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    client._request('/' + encode(name), {
        method: 'PUT',
        json  : options
    }, callback && function (err, data) {
        if (err) { return callback(err, data), undefined; }
        callback(null, client.getIndex(name), data);
    });
};

/**
Deletes the specified index or indices. If no indices are specified, **all**
indices on the server will be deleted.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-delete-index.html)

@method delete
@param {Client} client Client instance.
@param {String|String[]} [names] Name of the index to delete, or an array of
    names to delete multiple indices. If omitted, **all** indices will be
    deleted.
@param {Function} [callback] Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.data ElasticSearch response data.
@static
@see Client.deleteIndex
**/
Index.delete = function (client, names, callback) {
    if (typeof names === 'function') {
        callback = names;
        names    = undefined;
    }

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    client._request('/' + encode(names || ''), {method: 'DELETE'}, callback);
};

/**
Checks whether the specified index or indices exist.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-indices-exists.html)

@method exists
@param {Client} client Client instance.
@param {String|String[]} names Index name or array of names to check.
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Boolean} callback.exists `true` if all specified indices exist,
      `false` otherwise.
@static
@see Client.indexExists
**/
Index.exists = function (client, names, callback) {
    if (Array.isArray(names)) {
        names = names.join(',');
    }

    client._request('/' + encode(names), {method: 'HEAD'}, function (err) {
        callback(null, !err);
    });
};

/**
Refreshes the specified index or indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-refresh.html)

@method refresh
@param {Client} client Client instance.
@param {String|String[]} [names] Index name or array of names to refresh. If not
    specified, all indices will be refreshed.
@param {Function} [callback] Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
@see Client.refresh
**/
Index.refresh = function (client, names, callback) {
    if (typeof names === 'function') {
        callback = names;
        names    = undefined;
    }

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    names || (names = '_all');

    client._request('/' + encode(names) + '/_refresh', {method: 'POST'},
        callback);
};

Index.prototype = {
    // http://www.elasticsearch.org/guide/reference/api/count.html
    count: function (query, callback) {

    },

    /**
    Deletes a document from this index.

    @method delete
    @param {String} type Type name.
    @param {String} id Document id to delete.
    @param {Object} [options] Delete options.
      @param {String} [options.consistency="quorum"] Write consistency to use
          for this indexing operation. Permitted values are "one", "quorum" and
          "all". See the ElasticSearch docs for details.
      @param {Boolean} [options.ignoreMissing=false] If `true`, an error will
          not be returned if the index, type, or document do not exist.
      @param {String} [options.parent] Parent document id.
      @param {Boolean} [options.refresh=false] If `true`, the relevant shard
          will be refreshed after the delete operation. This may cause heavy
          server load, so use with caution.
      @param {String} [options.replication="sync"] Replication mode for this
          indexing operation. Maybe be set to "sync" or "async".
      @param {String} [options.routing] Value that determines what shard this
          operation will be routed to. Note that an incorrectly routed operation
          will fail, so it's best to leave this alone unless you know your
          business.
      @param {Number} [options.version] Document version to delete. If
          the specified document's version differs from this, an error will be
          returned and the document will not be deleted.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response.
    @see Client.delete
    **/
    delete: function (type, id, options, callback) {
        var query = [],
            ignoreMissing, params;

        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        callback || (callback = noop);
        params = util.merge(options);

        if (typeof params.ignoreMissing !== 'undefined') {
            ignoreMissing = params.ignoreMissing;
            delete params.ignoreMissing;
        }

        util.each(params, function (value, name) {
            if (value === true || value === false) {
                value = value ? '1' : '0';
            }

            query.push(encode(name) + '=' + encode(value));
        });

        url = '/' + encode(this.name) + '/' + encode(type) + '/' + encode(id);

        if (query.length) {
            url += '?' + query.join('&');
        }

        this.client._request(url, {method: 'DELETE'}, function (err, res) {
            if (err) {
                if (ignoreMissing && res && res.found === false) {
                    return callback(null, res), undefined;
                } else {
                    return callback(err, res), undefined;
                }
            }

            callback(null, res);
        });
    },

    /**
    Deletes this index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-delete-index.html)

    @method deleteIndex
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.data ElasticSearch response data.
    **/
    deleteIndex: function (callback) {
        Index.delete(this.client, this.name, callback);
    },

    // http://www.elasticsearch.org/guide/reference/api/admin-indices-delete-mapping.html
    deleteMapping: function (type) {

    },

    /**
    Checks whether this index exists on the server.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-indices-exists.html)

    @method exists
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Boolean} callback.exists `true` if the index exists, `false`
        otherwise.
    **/
    exists: function (callback) {
        Index.exists(this.client, this.name, callback);
    },

    /**
    Gets a document from this index based on its id.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/get.html)

    @method get
    @param {String} id Document id.
    @param {Object} [options] Options.
      @param {String|String[]} [options.fields] Document field name or array of
          field names to retrieve. By default, all fields are retrieved.
      @param {Boolean} [options.ignoreMissing=false] If `true`, an error will
          not be returned if the index, type, or document do not exist. Instead,
          a `null` document will be returned.
      @param {String} [options.preference] Controls which shard replicas the
          request should be executed on. By default, the operation will be
          randomized between the shard replicas. See the ElasticSearch docs for
          possible values.
      @param {Boolean} [options.realtime=true] Whether or not to use realtime
          GET. See the ElasticSearch docs for details.
      @param {Boolean} [options.refresh=false] If `true`, the relevant shard
          will be refreshed before the get operation to ensure that it's
          searchable. This may cause heavy server load, so use with caution.
      @param {String} [options.routing] Value that determines what shard this
          document will be routed to. If not specified, a hash of the document's
          id will be used. Note that an incorrectly routed get operation will
          fail, so it's best to leave this alone unless you know your business.
      @param {String} [options.type="_all"] If specified, the get operation will
          be limited to documents of this type.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object|null} callback.doc Retrieved document or document fields,
          or `null` if the document was not found and `options.ignoreMissing` is
          `true`.
      @param {Object} callback.res Full ElasticSearch response data.
    @see Client.get
    **/
    get: function (id, options, callback) {
        var query = [],
            type  = '_all',
            ignoreMissing, params, url;

        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        params = util.merge(options);

        if (params.fields) {
            params.fields = Array.isArray(params.fields) ?
                params.fields.join(',') : params.fields;
        }

        if (typeof params.ignoreMissing !== 'undefined') {
            ignoreMissing = params.ignoreMissing;
            delete params.ignoreMissing;
        }

        if (params.type) {
            type = params.type;
            delete params.type;
        }

        util.each(params, function (value, name) {
            if (value === true || value === false) {
                value = value ? '1' : '0';
            }

            query.push(encode(name) + '=' + encode(value));
        });

        url = '/' + encode(this.name) + '/' + encode(type) + '/' + encode(id);

        if (query.length) {
            url += '?' + query.join('&');
        }

        this.client._request(url, {method: 'GET'}, function (err, res) {
            if (err) {
                if (ignoreMissing && res && (res.exists === false
                        || res.error.indexOf('IndexMissing') !== -1)) {
                    return callback(null, null, res), undefined;
                } else {
                    return callback(err, null, res), undefined;
                }
            }

            callback(null, res.fields || res._source, res);
        });
    },

    /**
    Adds a document to this index.

    If a document already exists in this index with the specified _type_ and
    _id_, it will be updated. Otherwise, a new document will be created.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/index_.html)

    @example

        var blog = client.getIndex('blog');

        blog.index('post', {
            title  : "Welcome to my stupid blog",
            content: "This is the first and last time I'll post anything.",
            tags   : ['welcome', 'first post', 'last post'],
            created: Date.now()
        }, function (err, res) {
            if (err) { throw err; }
            console.log('Indexed a blog post');
        });

    @method index
    @param {String} type Document type.
    @param {Object} doc Document data to index.
    @param {Object} [options] Options.
      @param {String} [options.consistency="quorum"] Write consistency to use
          for this indexing operation. Permitted values are "one", "quorum" and
          "all". See the ElasticSearch docs for details.
      @param {Boolean} [options.create=false] Only create the document if it
          doesn't already exist.
      @param {String} [options.id] Document id. One will be automatically
          generated if not specified.
      @param {String} [options.parent] Parent document id.
      @param {String} [options.percolate] Percolation query to check against
          this document. See the ElasticSearch docs for details.
      @param {Boolean} [options.refresh=false] If `true`, the document will be
          made searchable immediately after it is indexed.
      @param {String} [options.replication="sync"] Replication mode for this
          indexing operation. Maybe be set to "sync" or "async".
      @param {String} [options.routing] Value that determines what shard this
          document will be routed to. If not specified, a hash of the document's
          id will be used.
      @param {String} [options.timeout="1m"] How long to wait for the primary
          shard to become available to index this document before aborting. See
          the ElasticSearch docs for details. This should be a value like "5m"
          (5 minutes) or "15s" (15 seconds).
      @param {Number} [options.version] Document version to create/update. If
          this is set and `options.version_type` is not set,
          `options.version_type` will automatically be set to "external".
      @param {String} [options.version_type="internal"] Version type (either
          "internal" or "external"). See the ElasticSearch docs for details.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.index
    **/
    index: function (type, doc, options, callback) {
        var query = [],
            id, params, url;

        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        params = util.merge(options || {});

        if (params.create) {
            params.op_type = 'create';
            delete params.create;
        }

        if (params.id) {
            id = params.id;
            delete params.id;
        }

        if (params.version && !params.version_type) {
            params.version_type = 'external';
        }

        util.each(params, function (value, name) {
            if (value === true || value === false) {
                value = value ? '1' : '0';
            }

            query.push(encode(name) + '=' + encode(value));
        });

        url = '/' + encode(this.name) + '/' + encode(type);

        if (id) {
            url += '/' + encode(id);
        }

        if (query.length) {
            url += '?' + query.join('&');
        }

        this.client._request(url, {
            method: id ? 'PUT' : 'POST',
            json  : doc
        }, callback);
    },

    // http://www.elasticsearch.org/guide/reference/api/multi-get.html
    multiGet: function () {

    },

    // http://www.elasticsearch.org/guide/reference/api/admin-indices-optimize.html
    optimize: function (options) {

    },

    // http://www.elasticsearch.org/guide/reference/api/admin-indices-put-mapping.html
    putMapping: function (type, options) {

    },

    /**
    Refreshes this index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-refresh.html)

    @method refresh
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.refresh
    **/
    refresh: function (callback) {
        Index.refresh(this.client, this.name, callback);
    },

    /**
    Searches for documents in this index matching the given query. See
    `Client.search()` for the complete list of supported options.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/search/)

    @method search
    @param {Object} [options] Search options. Technically this argument is
        optional, but you'll almost always want to provide at least a query.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.results Search results.
      @param {Object} callback.res Full ElasticSearch response data.
    @see Client.search
    **/
    search: function (options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        this.client.search(util.merge(options, {index: this.name}), callback);
    }

    // TODO: analyze, close, open, get settings, get mapping, flush, snapshot,
    // update settings, templates, status, segments, clear cache
};

/**
Alias for index().

@method set
@see index
**/
Index.prototype.set = Index.prototype.index;

module.exports = Index;

// -- Private Functions --------------------------------------------------------
function noop() {}
