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
Performs multiple document create/index/delete operations in a single request.

The _operations_ parameter should be an array of objects. Each object must
adhere to one of the following formats.

#### Operation Objects

**Create a Document**

    {
        create: {
            index: 'index-name',
            type : 'type-name',
            id   : 'document-id',
            data  : { ... document data ... },

            // Optional properties.
            parent      : '...',
            percolate   : '...',
            routing     : '...',
            version     : '...',
            version_type: 'internal' | 'external'
        }
    }

**Index a Document**

    {
        index: {
            index: 'index-name',
            type : 'type-name',
            id   : 'document-id',
            data  : { ... document data ... },

            // Optional properties.
            parent      : '...',
            percolate   : '...',
            routing     : '...',
            version     : '...',
            version_type: 'internal' | 'external'
        }
    }

**Delete a Document**

    {
        delete: {
            index: 'index-name',
            type : 'type-name',
            id   : 'document-id',

            // Optional properties.
            parent : '...',
            routing: '...',
            version: '...'
        }
    }

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/bulk.html)

@example

    index.bulk(client, [
        {create: {index: 'blog', type: 'post', id: '1', data: {
            title: 'Hello',
            body : 'Welcome to my stupid blog.'
        }}},

        {index: {index: 'blog', type: 'post', id: '2', data: {
            title: 'Breaking news',
            body : 'Today I ate a sandwich.'
        }}},

        {index: {index: 'blog', type: 'post', id: '3', percolate: '*', data: {
            title: 'Percolate this',
            body : 'Run against all percolators.'
        }}},

        {delete: {index: 'blog', type: 'post', id: '42'}}
    ], function (err, res) {
        // ...
    });

@method bulk
@param {Client} client Client instance.
@param {Object[]} operations Array of operations to perform. See above for a
    description of the expected object format.
@param {Object} [options] Options.
    @param {String} [options.consistency="quorum"] Write consistency to use
        for these operations. Permitted values are "one", "quorum", and "all".
        See the ElasticSearch docs for details.
    @param {Boolean} [options.refresh=false] If `true`, the relevant shard
        will be refreshed after the delete operation. This may cause heavy
        server load, so use with caution.
    @param {String} [options.index="indexname"] If specified the url endpoint
        for the bulk operations will include this index.  This is useful for
        scenarios where the root -bulk endpoint is prevented on a shared
        cluster.
@param {Function} [callback] Callback function.
    @param {Error|null} callback.err Error, or `null` on success.
    @param {Object} callback.res ElasticSearch response data.
@static
@see Client.bulk
**/
Index.bulk = function (client, operations, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    callback || (callback = noop);
    options || (options = {});

    var body  = [],
        query = [],
        url   = '/_bulk';

    if (options.index) {
        url = '/' + encode(options.index) + '/_bulk';
        delete options.index;
    }

    operations.forEach(function (op) {
        var action = Object.keys(op)[0],
            input  = op[action],
            line   = {},
            name;

        line[action] = {};

        for (name in input) {
            if (name !== 'data' && input.hasOwnProperty(name)) {
                // Allow '_index', '_type', etc. in addition to 'index', 'type',
                // etc.
                if (name.charAt(0) === '_') {
                    line[action][name] = input[name];
                } else {
                    // ElasticSearch currently only supports 'percolate', not
                    // '_percolate'.
                    if (name === 'percolate') {
                        line[action][name] = input[name];
                    } else {
                        line[action]['_' + name] = input[name];
                    }
                }
            }
        }

        body.push(JSON.stringify(line));

        if (action === 'create' || action === 'index') {
            body.push(JSON.stringify(input.data || {}));
        }
    });

    util.each(options, function (value, name) {
        if (value === true || value === false) {
            value = value ? '1' : '0';
        }

        query.push(encode(name) + '=' + encode(value));
    });

    if (query.length) {
        url += '?' + query.join('&');
    }

    client._request(url, {
        method: 'PUT',
        body  : body.join('\n') + '\n'
    }, callback);
};

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
Retrieve the mappings for one or more indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-get-mapping.html)

@method count
@param {Client} client Client instance.
@param {String|String[]} names Index name or array of names.
@param {String} [type] Document type. If omitted, count for all types are returned.
@param {String} query query. If omitted, count for a match_all is returned.
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
@see Client.count
**/
Index.count = function (client, names, type, query, callback) {
    var url;
    if (typeof query === 'function') {
        callback = query;
        query     = null;
    }
    if (typeof type === 'function') {
        callback = type;
        query     = null;
        type     = null;
    }

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    names = names.trim();
    url   = '/' + encode(names);

    if (type) {
        url += '/' + encode(type);
    }

    url += '/_count';
    if (query) {
        url += '?q=' + encode(query);
    } else {
      // count in elastic Search require a query and returns an error if it does not find it:
      // {"error":"No query to execute, not in body, and not bounded to 'q' parameter"}%
      // perhaps there is better than that to do?
      url += '?q=*';
    }

    client._request(url, callback);
}

/**
Retrieve the mappings for one or more indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-get-mapping.html)

@method getMapping
@param {Client} client Client instance.
@param {String|String[]} names Index name or array of names.
@param {String} [type] Document type. If omitted, mappings for all types are returned.
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
@see Client.getMapping
**/
Index.getMapping = function (client, names, type, callback) {
    var url;

    if (typeof type === 'function') {
        callback = type;
        type     = null;
    }

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    names = names.trim();
    url   = '/' + encode(names);

    if (type) {
        url += '/' + encode(type);
    }

    url += '/_mapping';

    client._request(url, callback);
}

/**
Retrieve the settings for one or more indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-get-settings.html)

@method getSettings
@param {Client} client Client instance.
@param {String|String[]} names Index name or array of names.
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
@see Client.getSettings
**/
Index.getSettings = function (client, names, callback) {
    var url;

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    names = names.trim();
    url   = '/' + encode(names);

    url += '/_settings';

    client._request(url, callback);
}

/**
Update the settings for one or more indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-update-settings/)

@method updateSettings
@param {Client} client Client instance.
@param {String|String[]} index Index name or array of names. If not specified,
    it will be applied to all indices
@param {Object} settings Settings. See ElasticSearch docs for details.
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
@see Client.updateSettings
**/
Index.updateSettings = function (client, index, settings, callback) {
    var params, url = '';

    if (typeof index === 'object' && !Array.isArray(index)) {
        callback = settings;
        settings = index;
        index = null;
    }

    callback || (callback = noop);

    if (index) {
        if (Array.isArray(index)) {
            index = index.join(',');
        }

        index = index.trim();
        url   = '/' + encode(index);
    }

    url += '/_settings';

    client._request(url, {
        method: 'PUT',
        json: settings
    }, callback);
}

/**
 Apply aliases actions.

 [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-aliases.html)

 @method addAlias
 @param {Client} client Client instance.
 @param {Object[]} actions Aliases actions.
 @param {Function} callback Callback function.
 @param {Error|null} callback.err Error, or `null` on success.
 @param {Object} callback.res ElasticSearch response data.
 @static
 @see Client.applyAliasesActions
 **/
Index.applyAliasesActions = function (client, actions, callback) {
    client._request('/_aliases', {
        method: 'POST',
        json: {actions:actions}
    }, callback);
}

/**
 Get aliases.

 [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-aliases.html)

 @method getAliases
 @param {Client} client Client instance.
 @param {String|String[]|null} names Index name or array of names.
 @param {Function} callback Callback function.
 @param {Error|null} callback.err Error, or `null` on success.
 @param {Object} callback.res ElasticSearch response data.
 @static
 @see Client.getAliases
 **/
Index.getAliases = function (client, names, callback) {
    var url = '';

    if(names){
        if (Array.isArray(names)) {
            names = names.join(',');
        }

        names = names.trim();
        url = '/' + encode(names);
    }

    url += '/_aliases';

    client._request(url, callback);
}

/**
Registers a mapping definition for the specified type within the specified
index or indices.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-put-mapping.html)

@method putMapping
@param {Client} client Client instance.
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
Index.putMapping = function (client, names, type, mapping, callback) {
    if (typeof type === 'object') {
        callback = mapping;
        mapping  = type;
        type     = names;
        names    = undefined;
    }

    if (Array.isArray(names)) {
        names = names.join(',');
    }

    names || (names = '_all');

    client._request('/' + encode(names) + '/' + encode(type) + '/_mapping', {
        method: 'PUT',
        json: mapping
    }, callback);
}

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

/**
 Analyze

 [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-analyze.html)

 @method analyze
 @param {Client} client Client instance.
 @param {String} text Text to analyze
 @param {Object} [options] Options. See ElasticSearch docs for details.
     @param {String} [options.index="indexname"] Index name whose analyzer must be used. If not
         specified, use built-in analyzers.
     @param {String} [options.analyzer="standard"] Analyzer to use for analysis
     @param {String} [options.tokenizer="keyword"] Tokenizer to use for analysis when
         using a custom transient analyzer
     @param {String} [options.field="obj1.field1"] Use the analyzer configured in
         the mapping for this field
 @param {Function} [callback] Callback function.
    @param {Error|null} callback.err Error, or `null` on success.
    @param {Object} callback.res ElasticSearch response data.
 @static
 @see Client.analyze
**/
Index.analyze = function (client, text, options, callback) {
    var params, url = '/_analyze';
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    callback || (callback = noop);
    params = util.merge(options);

    if (params.index) {
        url = '/' + encode(params.index) + '/_analyze';
        delete params.index;
    }

    var query = [ 'text=' + encode(text) ];
    util.each(params, function (value, name) {
        query.push(encode(name) + '=' + encode(value));
    });

    if (query.length) {
        url += '?' + query.join('&');
    }

    client._request(url, { method: 'GET' }, callback);
};

/**
Registers a river with the cluster.

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/river/)

@method putRiver
@param {Client} client Client instance.
@param {String} name A name for this river.
@param {Object} config The river configuration.
@param {Function} [callback] Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@static
**/
Index.putRiver = function( client, name, config, callback ){
    client._request('/_river/' + name + '/_meta', {
        method: 'PUT',
        json: config
    }, callback);
};

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
Index.getRiver = function( client, name, callback ){
    client._request('/_river/' + name + '/_meta', { method: 'GET' }, callback);
};

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
Index.deleteRiver = function( client, name, callback ){
    client._request('/_river/' + name, { method: 'DELETE' }, callback);
};

/**
Multi GET API allows to get multiple documents

[ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/multi-get.html)

@method multiGet
@param {Client} client Client instance.
@param {String|null} index optional Index name.
@param {String|null} type optional document type.
@param {Object} data either docs or ids
  @param {Object[]} [data.docs] docs to query (can include _index, _type, _id, fields)
  @param {String[]} [data.ids] ids to query
@param {Function} callback Callback function.
  @param {Error|null} callback.err Error, or `null` on success.
  @param {Object} callback.res ElasticSearch response data.
@see Client.multiGet
 **/
Index.multiGet= function (client, index, type, data, callback) {
    var url = '';
    if(index)
        url +='/'+encode(index)   ;
    if(type)
        url +=  '/'+encode(type) ;
    url += '/_mget';
    client._request(url, {
        method: 'POST',
        json  : data
    }, callback);
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
      @param {object} [options.query] To perform removal using a query. Warning:
          id and all other options except ignoreMissing will be ignored.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response.
    @see Client.delete
    **/
    delete: function (type, id, options, callback) {
        var query = [],
            ignoreMissing, params, url;

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

        if(params.query) {
          url = '/' + encode(this.name) + '/' + encode(type) + '/_query';

          this.client._request(url, {method: 'DELETE', json: params.query}, function (err, res) {
              if (err) {
                  if (ignoreMissing && res && res.found === false) {
                      return callback(null, res), undefined;
                  } else {
                      return callback(err, res), undefined;
                  }
              }
              callback(null, res);
          });
        } else {
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
        }
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
    Gets the mapping definition for this index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-get-mapping.html)

    @method getMapping
    @param {String} [type] Document type. If omitted, mappings for all types are returned.
    @param {Function} callback Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.getMapping
    **/
    getMapping: function (type, callback) {
        Index.getMapping.apply(null, [this.client, this.name].concat(
            Array.prototype.slice.call(arguments)));
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

    // http://www.elasticsearch.org/guide/reference/api/admin-indices-optimize.html
    optimize: function (options) {

    },

    /**
    Registers a mapping definition for the specified type within this index.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-put-mapping.html)

    @method putMapping
    @param {String} type Document type.
    @param {Object} [mapping] Mapping definition. See the [ElasticSearch
        docs](http://www.elasticsearch.org/guide/reference/mapping/) for
        an overview.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.putMapping
    **/
    putMapping: function (type, mapping, callback) {
        Index.putMapping(this.client, this.name, type, mapping, callback);
    },

    /**
    Analyze using analyzer from this index

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-analyze.html)

    @method analyze
    @param {String} text Text to analyze
    @param {Object} [options] Options. See ElasticSearch docs for details.
      @param {String} [options.analyzer="standard"] Analyzer to use for analysis
      @param {String} [options.tokenizer="keyword"] Tokenizer to use for analysis when
        using a custom transient analyzer
      @param {String} [options.field="obj1.field1"] Use the analyzer configured in
        the mapping for this field
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.analyze
    **/
    analyze: function (text, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }
        options.index = this.name;
        Index.analyze(this.client, options, callback);
    },

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
    putRiver: function( name, config, callback ){
        Index.putRiver( this.client, name, config, callback );
    },

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
    getRiver: function( name, callback ){
        Index.getRiver( this.client, name, callback );
    },

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
    deleteRiver: function( name, callback ){
        Index.deleteRiver( this.client, name, callback );
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
    },

    /**
    Provide statistics on different operations happening on an index.
    See `Client.stats()` for the complete list of supported options.

    [ElasticSearch docs](http://www.elasticsearch.org/guide/reference/api/admin-indices-stats.html)

    @method stats
    @param {Object} [options] Stats options. This argument is optional.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.err Error, or `null` on success.
      @param {Object} callback.res ElasticSearch response data.
    @see Client.stats
    **/
    stats: function (options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      this.client.stats(util.merge(options, {index: this.name}), callback);
    },

    // TODO: close, open, get settings, get mapping, flush, snapshot,
    // update settings, templates, status, segments, clear cache
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
    setPercolator: function(percolator, query, callback){
        var url = '/_percolator/';
        url += this.name;
        url += '/'+encode(percolator);
        this.client._request(url, {
            method: 'POST',
            json  : query
        }, callback);
    },
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
     *  @param {String} percolator The name of the percolator
     *  @param {Function} callback Callback function.
     *      @param {Error|null} callback.err Error, or `null` on success.
     *      @param {Object} callback.doc  Percolator document.
     *      @param {Object} callback.res Full ElasticSearch response data.
     */
    getPercolator: function(percolator, callback){
        var url = '/_percolator/'+this.name+'/'+encode(percolator);
        this.client._request(url, {
            method: 'GET'
        }, function (err, res) {
            if (err) { return callback(err, null, res), undefined; }
            return callback(null, res._source, res);
        });
    },

    /**
     * Test if a given doc matches a percolator for
     * the given index and document type
     * @example
     *      client.perolate('tweets', 'tweet', {
     *          doc: {
     *
     *              title  : "Welcome to my stupid blog",
     *              content: "This is the first and last time I'll post anything.",
     *              tags   : ['welcome', 'first post', 'last post'],
     *              created: Date.now()
     *          }
     *      }, function(err, res){
     *          if(err){ throw err; }
     *          console.log(res);
     *      });
     *  _NOTE_: You must wrap your document in 'doc' param
     *  @param {String} type The type name of the document
     *  @param {Object} doc The document object which the registered percolators
     *      are matched against
     *  @param {Function} callback Callback function.
     *      @param {Error|null} callback.err Error, or `null` on success.
     *      @param {Object} callback.res Full ElasticSearch response data.
     */
    percolate: function(type, doc, callback){
        // this check is required because elasticsearch does not return an error
        // but times out if the'doc' element is not present in the body of the
        // request
        if(doc['doc'] === undefined){
            doc = {'doc': doc};
        }
        var url = '/'+ this.name+'/'+type+'/_percolate';
        this.client._request(url, {
            method: 'GET',
            json  : doc
        }, callback);
    },

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
    deletePercolator: function(percolator, callback){
        var url = '/_percolator/'+ this.name +'/'+encode(percolator);
        this.client._request(url, {
            method: 'DELETE'
        }, callback);
    }
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
