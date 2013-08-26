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
    var elastical = require('elastical'),
        client    = new elastical.client();

@class Client
@param {String} [host="127.0.0.1"] Hostname to connect to.
@param {Object} [options] Client options.
    @param {String} [options.auth] Username and password (delimited by a ":") to
        pass to ElasticSearch using basic HTTP auth. If not specified, no
        authentication will be used. Be sure to set `options.protocol` to
        'https' unless you're comfortable sending passwords in plaintext.
    @param {Boolean} [options.curlDebug=false] If `true`, runnable curl commands
        will be written to stderr for every request the client makes. This is
        useful for debugging requests by hand.
    @param {Number} [options.port=9200] Port to connect to.
    @param {String} [options.protocol='http'] Protocol to use. May be "http" or
        "https".
    @param {String} [options.basePath=''] Optional base path to prepend to all 
        query paths. This can be useful if acessing a cluster on a host that 
        uses paths to namespace customer indexes.
    @param {Number} [options.timeout=60000] Number of milliseconds to wait
        before aborting a request. Be sure to increase this if you do large bulk
        operations.
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

    if(typeof this.options.port === 'undefined') {
      this.options.port = 9200;
    }
    else if(this.options.port === null) {
      this.options.port = null;
    }
    this.options.protocol || (this.options.protocol = 'http');
    this.options.timeout || (this.options.timeout = 60000);
    this.options.basePath || (this.options.basePath = null);

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
        'preference', 'routing', 'scroll', 'scroll_id', 'search_type', 'timeout', 'ignore_indices'
    ],

    // -- Public Properties ----------------------------------------------------

    /**
    Base URL for this client, of the form "http://host:port".

    @property baseUrl
    @type {String}
    **/
    get baseUrl() {
        var baseUrl = this.options.protocol + '://' +
            (this.options.auth ? this.options.auth + '@' : '') +
            this.host;

        if(this.options.port !== null) {
          baseUrl = baseUrl + ':' + this.options.port;
        }

        if(this.options.basePath !== null) {
          baseUrl = baseUrl + this.options.basePath;
        }
        
        return baseUrl;
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

    /**
    Performs multiple document create/index/delete operations in a single request.

    See `Index.bulk()` for detailed usage instructions.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/bulk.html)

    @example

        client.bulk([
            {create: {index: 'blog', type: 'post', id: '1', data: {
                title: 'Hello',
                body : 'Welcome to my stupid blog.'
            }}},

            {index: {index: 'blog', type: 'post', id: '2', data: {
                title: 'Breaking news',
                body : 'Today I ate a sandwich.'
            }}},

            {delete: {index: 'blog', type: 'post', id: '42'}}
        ], function (err, res) {
            // ...
        });

    @method bulk
    @param {Object[]} operations Array of operations to perform. See
        `Index.bulk()` for a description of the expected object format.
    @param {Object} [options] Options. See `Index.bulk()` for details.
    @param {Function} [callback] Callback function.
        @param {Error|null} callback.err Error, or `null` on success.
        @param {Object} callback.res ElasticSearch response data.
    @see Index.bulk
    **/
    bulk: wrapStaticIndexMethod('bulk'),

    /**
    Get the number of matches for a query

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/count.html)

    @method count
    @param {Object} options the options object
      @param {String} [options.index] Index name.
      @param {String} [options.type] type Type name.
      @param {String} [otions.query] Query to get the number of match for.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    @see Index.count
    **/
    count: function (options, callback) {
        var url   = '',
            hasOptions;
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }
        if(typeof callback !== 'function'){
          var err =  new Error("callback is not a function");
          var stack = err.stack;
          throw err;
        }

        // Create a copy of options so we can modify it.
        options = util.merge(options || {});


        if (options.index) {
            url = '/' + encode(Array.isArray(options.index) ?
                options.index.join(',') : options.index);

            delete options.index;
        }

        // If a query is provided and it's a string, automatically turn it into
        // a query_string query.
        if (typeof options.query === 'string') {
            options = {query_string: {query: options.query}};
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
        url += '/_count';
        options.curlDebug = true;
        var myOptions = { method: hasOptions ? 'POST' : 'GET'};
        if(hasOptions){
          myOptions.json = options;
        }
        this._request(url, myOptions, function (err, res) {
            if (err) { 
              return callback(err, null, res), undefined; 
            }
            if(res._shards.failed > 0){
              return callback(new Error(res._shards.failures.reason), null, res), undefined;
            }
            return callback(null, res.count, res);
        });
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
    Gets mapping definitions for the specified type within the specified index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-put-mapping.html)

    @method getMapping
    @param {String|String[]} names Index name or array of names.
    @param {String} type Document type. If omitted, mappings for all type are returned.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    @see Client.getMapping
    **/
    getMapping: wrapStaticIndexMethod('getMapping'),

    /**
    Gets settings for the specified index/indices.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-get-settings.html)

    @method getSettings
    @param {String|String[]} names Index name or array of names.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Index.getSettings
    **/
    getSettings: wrapStaticIndexMethod('getSettings'),

    /**
    Update settings for the specified index/indices.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-update-settings/)

    @method updateSettings
    @param {String|String[]} index Index name or array of names. If not specified,
        it will be applied to all indices
    @param {Object} settings Settings. See ElasticSearch docs for details.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Index.updateSettings
    **/
    updateSettings: wrapStaticIndexMethod('updateSettings'),

    /**
     Apply aliases actions.

     [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-aliases.html)

     @method applyAliasesActions
     @param {Object[]} actions Aliases actions.
     @param {Function} callback Callback function.
     @param {Error|null} callback.err Error, or `null` on success.
     @param {Object} callback.res ElasticSearch response data.
     @see Index.applyAliasesActions
     **/
    applyAliasesActions: wrapStaticIndexMethod('applyAliasesActions'),

    /**
     Get aliases.

     [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-aliases.html)

     @method getAliases
     @param {String|String[]|null} names Index name or array of names.
     @param {Function} callback Callback function.
     @param {Error|null} callback.err Error, or `null` on success.
     @param {Object} callback.res ElasticSearch response data.
     @see Index.getAliases
     **/
    getAliases: wrapStaticIndexMethod('getAliases'),

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

    /**
    Multi GET API allows to get multiple documents

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/multi-get.html)

    @method multiGet
    @param {String|null} index optional Index name.
    @param {String|null} type optional document type.
    @param {Object} data either docs or ids
      @param {Object[]} [data.docs] docs to query (can include _index, _type, _id, fields)
      @param {String[]} [data.ids] ids to query
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Index.multiGet
    **/
    multiGet: wrapStaticIndexMethod('multiGet'),

    /**
    Registers a mapping definition for the specified type within the specified
    index or indices.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-put-mapping.html)

    @method putMapping
    @param {String|String[]} [names] Index name or array of names to define the
        mapping within. If not specified, it will be defined in all indices.
    @param {String} type Document type.
    @param {Object} [mapping] Mapping definition. See the [ElasticSearch
        docs](http://www.elasticsearch.org/guide/reference/mapping/) for
        an overview.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    @see Client.putMapping
    **/
    putMapping: wrapStaticIndexMethod('putMapping'),

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
    Analyze

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-analyze.html)

    @method analyze
    @param {String} text Text to analyze
    @param {Object} [options] Options. See ElasticSearch docs for details.
        @param {String} [options.index="indexname"] Specify indexname to use a specific
            index analyzer
        @param {String} [options.analyzer="standard"] Analyzer to use for analysis
        @param {String} [options.tokenizer="keyword"] Tokenizer to use for anaysis when
            using a custom transient anayzer
        @param {String} [options.field="obj1.field1"] Use the analyzer configured in
            the mapping for this field
    @param {Function} [callback] Callback function.
        @param {Error|null} callback.err Error, or `null` on success.
        @param {Object} callback.res ElasticSearch response data.
    @static
    @see Index.analyze
    **/

    analyze: wrapStaticIndexMethod('analyze'),

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
        var useScrollingEndpoint = (options.scroll_id != null);
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

        if(useScrollingEndpoint){
          url += '/scroll';
        }

        if (query.length) {
            url += '?' + query.join('&');
        }

        this._request(url, {
            method: hasOptions ? 'POST' : 'GET',
            json  : hasOptions ? options : {}
        }, function (err, res) {
            if (err) { return callback(err, null, res), undefined; }
            callback(null, res.hits, res);
        });
    },
    
    /**
    Provide statistics on different operations happening on an index.
    By default, docs, store, and indexing, get, and search stats are returned.
    
    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-stats.html)

    @example

        var client = new require('elastical').Client();

        client.stat({index: 'blog'}, function (err, results) {
            if (err) { throw err; }
            console.log(results);
        });

    @method stats
    @param {Object} [options] Stats options. Technically this argument is
        optional, but you'll almost always want to provide at least an index.
      @param {String|String[]} [options.index] Index name or array of index
          names to display stats on. By default global stats will be displayed.
      @param (String|String[]) [options.types] Comma separated list of types to provide document type level stats.
      @param {Boolean} [options.docs=true] The number of docs / deleted docs.
      @param {Boolean} [options.store=true] The size of the index.
      @param {Boolean} [options.indexing=true] Indexing statistics.
      @param {Boolean} [options.get=true] Get statistics, including missing stats.
      @param {Boolean} [options.search=true] Search statistics.
      @param {Boolean} [options.warmer=false] Warmer statistics.
      @param {Boolean} [options.merge=false] merge stats.
      @param {Boolean} [options.flush=false] flush stats.
      @param {Boolean} [options.refresh=false] refresh stats.
      @param {Boolean} [options.clear=false] Clears all the flags (first).
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    **/
    stats: function (options, callback) {
      var query = [],
          url = '',
          hasOptions;

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      //Create a copy of options so we can modify it.
      options = util.merge(options || {});

      if (options.index) {
        url = '/' + encode(Array.isArray(options.index) ?
          options.index.join(',') : options.index);

        delete options.index;
        //Look for types only if there is an index
        if (options.types) {
          query.push(encode('types') + '=' + encode(Array.isArray(options.types) ?
            options.types.join(',') : options.types));
        }
        delete options.types;
      }

      url += '/_stats';  

      util.each(options, function (value, name) {
          if (value === true || value === false) {
              value = value ? '1' : '0';
          }

          query.push(encode(name) + '=' + encode(value));
      });
      
      if (query.length) {
        url += '?' + query.join('&');
      }
      
      this._request(url, {
          method: 'GET'
      }, function (err, res) {
        if(err) { return callback(err, null, res), undefined; }
        callback(null, res);
      });
    },
    
    // TODO: percolate, delete by query, more like this
    /**
    Registers a percolator for the given index or modifies the existing percolator
    if one with the name already exists

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/pecolator/)

    @example
        var put =   {
                        "query" : {
                            "text" : {
                                "hashtags" : {
                                    "query" : 'blah blah blah ',
                                    "operator" : "or"
                                }
                            }
                        }
                    };
        client.percolator('tweets', 'mypercolator', query, function (err, res) {
            if (err) { throw err; }
            console.log(results);
        });
    @method setPercolator
    @param {String|String[]} index Index name or array of index
          names to register the percolator.
    @param {String} percolator The identifier string of the percolator.
            This identifier is returned when a document matches
            the query in the percolator, either through percolate operation or
            through index opertation.
    @param {Object|String} query Search query. Afull query object.
        See the [ElasticSearch Query DSL docs](http://www.elasticsearch.org/guide/reference/query-dsl/)
        for details.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res Full ElasticSearch response data.
    */
    setPercolator: wrapIndexMethod('setPercolator'),

    /**
     * Retrieve the percolator doc
     *
     * @example
     *
     *  client.getPercolator('tweets', 'mypercolator', function (err, results) {
     *      if (err) { throw err; }
     *      console.log(results);
     *  });
     *
     *  @param {String} index  The index name to which the percolator is registered
     *  @param {String} percolator The name of the percolator
     *  @param {Function} callback Callback function.
     *      @param {Error|null} callback.err Error, or `null` on success.
     *      @param {Object} callback.doc  Percolator document.
     *      @param {Object} callback.res Full ElasticSearch response data.
     */
    getPercolator: wrapIndexMethod('getPercolator'),

    /**
     * Test if a given doc matches a percolator for
     * the given index and document type
     * @example
     *      client.perolate('tweets', 'tweet', {}, function(err, res){
     *          if(err){ throw err; }
     *          console.log(res);
     *      });
     *  @param {String} index The index name to which the document should be
     *      checked for matching percolators
     *  @param {String} type The type name of the document
     *  @param {Object} doc The document object which the registered percolators
     *      are matched against
     *  @param {Function} callback Callback function.
     *      @param {Error|null} callback.err Error, or `null` on success.
     *      @param {Object} callback.res Full ElasticSearch response data.
     */
    percolate: wrapIndexMethod('percolate'),

    /**
     * Delete a registered percolator for the given index or indicies
     * @example
     *      client.deletePercolator('tweets', 'mypercolator', function(err, res){
     *          if(err){ throw err;}
     *          console.log(res);
     *      });
     * @param {String|String[]} index Index name or array of index names
     * @param {String} percolator Name of the percolator to delete
     * @param {Function} callback Callback function.
     *      @param {Error|null} callback.err Error, or `null` on success.
     *      @param {Object} callback.res Full ElasticSearch response data.
     */
    deletePercolator: wrapIndexMethod('deletePercolator'),


    /**
    Registers a river with the cluster.
    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/river/)

    @method putRiver
    @param {String} name A name for this river.
    @param {Object} config The river configuration.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    **/
    putRiver: wrapIndexMethod('putRiver'),

    /**
    Gets river config from the cluster.
    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/river/)

    @method getRiver
    @param {Client} client Client instance.
    @param {String} name A name for this river.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    **/
    getRiver: wrapIndexMethod('getRiver'),

    /**
    Deletes a river config from the cluster.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/river/)

    @method deleteRiver
    @param {Client} client Client instance.
    @param {String} name A name for this river.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @static
    **/
    deleteRiver: wrapIndexMethod('deleteRiver'),

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
        var url = this.baseUrl + path;

        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        // Callback is optional.
        callback || (callback = noop);

        options = util.merge(options);
        options.uri = url;

        [ 'timeout',
          'pool',
          'agent',
          'headers',
          'followRedirect',
          'followAllRedirects',
          'proxy',
          'oauth',
          'strictSSL',
          'jar'].forEach(function(key){
          if(this.options[key] == null) return
          options[key] || (options[key] = this.options[key]);
        }, this);

        // Write executable curl commands to stderr for easier debugging when
        // this client's curlDebug option is true.
        if (this.options.curlDebug) {
            curlDebug(options);
        }

        // Provide a testing hook to allow inspection of the request options
        // without actually sending a request.
        if (this._testHook) {
            return this._testHook(null, options), undefined;
        }
        request(url, options, function (err, res, body) {
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

function curlDebug(options) {
    var command = 'curl -X' + (options.method || 'GET');

    command += " '" + options.uri + "'";

    if (options.body) {
        command += " --data-binary '" + options.body + "'";
    } else if (options.json) {
        command += " -d '" + JSON.stringify(options.json, null, 2) + "'";
    }

    process.stdout.write(command + '\n');
}

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
