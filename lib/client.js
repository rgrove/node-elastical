/**
ElasticSearch client implementation.

@module elastical
@submodule client
**/

var request = require('request').defaults({encoding: 'utf8'}),
    util    = require('./util'),

    Index = require('./index'),

    encode = encodeURIComponent;

/**
Creates a new Elastical client associated with the specified _host_. The client
uses ElasticSearch's REST API to interact with the host, so connections are
established as needed and are not persistent.

@example

    // Create a client that connects to http://127.0.0.1:9200
    var client = new require('elastical').Client();

@class Client
@param {String} [host="127.0.0.1"] Hostname to connect to.
@param {Object} [options] Client options.
  @param {Number} [options.port=9200] Port to connect to.
  @param {Number} [options.timeout=10000] Number of milliseconds to wait before
    aborting a request.
@constructor
**/
function Client(host, options) {
    // Allow options without host.
    if (typeof host === 'object') {
        options = host;
        host    = undefined;
    }

    this.host    = host || '127.0.0.1';
    this.options = options || {};

    this.options.port || (this.options.port = 9200);
    this.options.timeout || (this.options.timeout = 10000);

    this._indexCache = {};
}

Client.prototype = {
    // -- Protected Properties -------------------------------------------------

    /**
    Search options that must be passed as query parameters instead of in the
    request body.

    @property _SEARCH_PARAMS
    @type {String[]}
    @protected
    @final
    **/
    _SEARCH_PARAMS: [
        'preference', 'routing', 'scroll', 'scroll_id', 'search_type', 'timeout'
    ],

    // -- Public Properties ----------------------------------------------------

    /**
    Base URL for this client, of the form "http://host:port".

    @property baseUrl
    @type {String}
    **/
    get baseUrl() {
        return 'http://' + this.host + ':' + this.options.port;
    },

    /**
    Port number for this client.

    @property port
    @type {Number}
    **/
    get port() {
        return this.options.port;
    },

    // -- Public Methods -------------------------------------------------------
    // http://www.elasticsearch.org/guide/reference/api/bulk.html
    bulk: function () {

    },

    // http://www.elasticsearch.org/guide/reference/api/count.html
    count: function (query, indices, callback) {

    },

    /**
    Creates a new index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-create-index.html)

    @method createIndex
    @param {String} name Name of the new index.
    @param {Object} options Index options (see ElasticSearch docs for details).
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Index} callback.index Index instance for the newly created index.
      @param {Object} callback.data ElasticSearch response data.
    @see Index.create
    **/
    createIndex: wrapStaticIndexMethod('create'),

    /**
    Deletes a document from the specified index. See `Index.delete()` for the
    complete list of supported options.

    @method delete
    @param {String} index Index name.
    @param {String} type Type name.
    @param {String} id Document id to delete.
    @param {Object} [options] Delete options.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response.
    @see Index.delete
    **/
    delete: wrapIndexMethod('delete'),

    /**
    Deletes the specified index or indices. If no indices are specified, **all**
    indices on the server will be deleted.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-delete-index.html)

    @method deleteIndex
    @param {String|String[]} [names] Name of the index to delete, or an array of
        names to delete multiple indices. If omitted, **all** indices will be
        deleted.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.data ElasticSearch response data.
    @see Index.deleteIndex
    **/
    deleteIndex: wrapStaticIndexMethod('delete'),

    /**
    Gets a document from the specified index based on its id.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/get.html)

    @method get
    @param {String} name Index name.
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
    @see Index.get
    **/
    get: wrapIndexMethod('get'),

    /**
    Gets an Index instance for interacting with the specified ElasticSearch
    index.

    @example

        var client = new require('elastical').Client(),
            tweets = client.getIndex('tweets');

    @method getIndex
    @param {String} name Index name.
    @return {Index} Index instance.
    @see Index
    **/
    getIndex: function (name) {
        return this._indexCache[name] ||
            (this._indexCache[name] = new Index(this, name));
    },

    /**
    Adds a document to the specified index.

    If the specified index doesn't exist, it will be created.

    If a document already exists in that index with the specified _type_ and
    _id_, it will be updated. Otherwise, a new document will be created.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/index_.html)

    @example

        client.index('blog', 'post', {
            title  : "Welcome to my stupid blog",
            content: "This is the first and last time I'll post anything.",
            tags   : ['welcome', 'first post', 'last post'],
            created: Date.now()
        }, function (err, res) {
            if (err) { throw err; }
            console.log('Indexed a blog post');
        });

    @method index
    @param {String} index Index name.
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
    @see Index.index
    **/
    index: wrapIndexMethod('index'),

    /**
    Checks whether the specified index or indices exist.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-indices-exists.html)

    @method indexExists
    @param {String|String[]} names Index name or array of names to check.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Boolean} callback.exists `true` if all specified indices exist,
        `false` otherwise.
    @see Index.exists
    **/
    indexExists: wrapStaticIndexMethod('exists'),

    // http://www.elasticsearch.org/guide/reference/api/multi-get.html
    multiGet: function () {

    },

    /**
    Refreshes the specified index or indices.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-refresh.html)

    @method refresh
    @param {String|String[]} [names] Index name or array of names to refresh. If
        not specified, all indices will be refreshed.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Index.refresh
    **/
    refresh: wrapStaticIndexMethod('refresh'),

    /**
    Searches for documents matching the given query.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/search/)

    @example

        var client = new require('elastical').Client();

        client.search({query: 'pie'}, function (err, results) {
            if (err) { throw err; }
            console.log(results);
        });

    @method search
    @param {Object} [options] Search options. Technically this argument is
        optional, but you'll almost always want to provide at least a query.

      @param {Object|String} [options.query] Search query. This can be a simple
          string (in which case a "query_string" search will be performed) or a
          full query object. See the [ElasticSearch Query DSL docs](http://www.elasticsearch.org/guide/reference/query-dsl/)
          for details.
      @param {Boolean} [options.explain=false] If `true`, results will include
          an explanation of how the score was computed for each hit.
      @param {Object} [options.facets] Facets to aggregate by. See the
          [ElasticSearch facets docs](http://www.elasticsearch.org/guide/reference/api/search/facets/)
          for details.
      @param {String|String[]} [options.fields] Document field name or array of
          field names to retrieve. By default, all fields are retrieved.
      @param {Object} [options.filter] Result filter. See the [ElasticSearch
          filtering docs](http://www.elasticsearch.org/guide/reference/api/search/filter.html)
          for details.
      @param {Number} [options.from=0] Return results starting at this offset.
      @param {Object} [options.highlight] Result highlighting options. See the
          [ElasticSearch highlighting docs](http://www.elasticsearch.org/guide/reference/api/search/highlighting.html)
          for details.
      @param {String|String[]} [options.index] Index name or array of index
          names to search. By default all indices will be searched.
      @param {Object} [options.indices_boost] Index boost options. See the
          [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/search/index-boost.html)
          for details.
      @param {Number} [options.min_score] If specified, documents with a score
          lower than this will be filtered out.
      @param {String} [options.preference] Controls which shard replicas the
          request should be executed on. By default, the operation will be
          randomized between the shard replicas. See the [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/search/preference.html)
          for possible values.
      @param {String} [options.routing] Value that determines what shard this
          search will be routed to.
      @param {Object} [options.script_fields] Script expressions to evaluate for
          specific fields. See the [ElasticSearch script fields docs](http://www.elasticsearch.org/guide/reference/api/search/script-fields.html)
          for details.
      @param {String} [options.scroll] Scroll timeout. If specified, nodes that
          participate in this search will maintain resources for this query
          until the timeout expires. See the [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/search/scroll.html)
          for details.
      @param {String} [options.scroll_id] Scroll id to use for this request.
      @param {String} [options.search_type] Search operation type to use. May be
          one of "query_and_fetch", "query_then_fetch", "dfs_query_and_fetch",
          "dfs_query_then_fetch", "count", or "scan". See the [ElasticSearch
          docs](http://www.elasticsearch.org/guide/reference/api/search/search-type.html)
          for details.
      @param {Number} [options.size=10] Return this many results.
      @param {Object} [options.sort] Sort options. See the [ElasticSearch sort
          docs](http://www.elasticsearch.org/guide/reference/api/search/sort.html)
          for details.
      @param {String} [options.timeout] Timeout after which the search will be
          aborted. Any hits that have been gathered before the timeout is
          reached will be returned. Default is no timeout.
      @param {Boolean} [options.track_scores=false] Whether or not to compute
          scores when sorting by a field.
      @param {String|String[]} [options.type] Type name or array of type names
          to search. By default all types will be searched.
      @param {Boolean} [options.version=false] If `true`, a version number will
          be returned for each hit.

    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.results Search results.
      @param {Object} callback.res Full ElasticSearch response data.
    **/
    search: function (options, callback) {
        var query = [],
            url   = '',
            hasOptions;

        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        // Create a copy of options so we can modify it.
        options = util.merge(options || {});

        // Some options must be passed as query parameters. Find those options
        // and move them into the query param array.
        this._SEARCH_PARAMS.forEach(function (name) {
            var value = options[name];

            if (typeof value !== 'undefined') {
                if (value === true || value === false) {
                    query.push(encode(name) + '=' + (value ? '1' : '0'));
                } else {
                    query.push(encode(name) + '=' + encode(value));
                }

                delete options[name];
            }
        });

        if (options.fields) {
            options.fields = Array.isArray(options.fields) ? options.fields :
                [options.fields];
        }

        if (options.index) {
            url = '/' + encode(Array.isArray(options.index) ?
                options.index.join(',') : options.index);

            delete options.index;
        }

        // If a query is provided and it's a string, automatically turn it into
        // a query_string query.
        if (typeof options.query === 'string') {
            options.query = {query_string: {query: options.query}};
        }

        if (options.type) {
            if (!url) {
                url = '/_all';
            }

            url += '/' + encode(Array.isArray(options.type) ?
                options.type.join(',') : options.type);

            delete options.type;
        }

        hasOptions = !!Object.keys(options).length;

        url += '/_search';

        if (query.length) {
            url += '?' + query.join('&');
        }

        this._request(url, {
            method: hasOptions ? 'POST' : 'GET',
            json  : hasOptions ? options : undefined
        }, function (err, res) {
            if (err) { return callback(err, null, res), undefined; }
            callback(null, res.hits, res);
        });
    },

    // TODO: percolate, delete by query, more like this

    // -- Protected Methods ----------------------------------------------------

    /**
    Makes an HTTP request using the `request` module.

    @method _request
    @param {String} path Request path.
    @param {Object} [options] Request options.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object|Buffer|String} callback.body Response body (parsed as JSON
          if possible).
    @protected
    **/
    _request: function (path, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        // Callback is optional.
        callback || (callback = noop);

        options = util.merge(options);
        options.url = this.baseUrl + path;
        options.timeout || (options.timeout = this.options.timeout);

        // Provide a testing hook to allow inspection of the request options
        // without actually sending a request.
        if (this._testHook) {
            return this._testHook(null, options), undefined;
        }

        request(options, function (err, res, body) {
            if (err) { return callback(err), undefined; }

            // The request module will automatically try to parse the
            // response as JSON if `options.json` is truthy and the response
            // has an application/json content-type, but it currently fails
            // on content-types with charset suffixes, so it can't be relied
            // upon.
            //
            // See https://github.com/mikeal/request/commit/68c17f6c9a3d7217368b3b8bc61203e6a14eb4f0
            if (typeof body === 'string' || body instanceof Buffer) {
                body = body.toString('utf8');

                try {
                    body = JSON.parse(body);
                } catch (ex) {}
            }

            if (res.statusCode < 200 || res.statusCode > 299) {
                callback(Error((body && body.error) || 'HTTP ' + res.statusCode),
                    body || {});
                return;
            }

            callback(null, body || {});
            return;
        });
    }
};

/**
Alias for index().

@method set
@see index
**/
Client.prototype.set = Client.prototype.index;

module.exports = Client;

// -- Private Functions --------------------------------------------------------
function noop() {}

function wrapIndexMethod(methodName) {
    return function (indexName) {
        var args  = Array.prototype.slice.call(arguments, 1),
            index = this.getIndex(indexName);

        return index[methodName].apply(index, args);
    };
}

function wrapStaticIndexMethod(methodName) {
    return function () {
        var args = Array.prototype.slice.call(arguments);

        args.unshift(this);
        return Index[methodName].apply(Index, args);
    }
}
