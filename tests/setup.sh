#!/bin/bash

# Uses curl to set up test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XPUT "$BASE/elastical-test-bulk"
curl -s -XPUT "$BASE/elastical-test-deleteme"
curl -s -XPUT "$BASE/elastical-test-deleteme2"
curl -s -XPUT "$BASE/elastical-test-deleteme3"
curl -s -XPUT "$BASE/elastical-test-indexexists"
curl -s -XPUT "$BASE/elastical-test-indexexists2"
curl -s -XPUT "$BASE/elastical-test-refresh"
curl -s -XPUT "$BASE/elastical-test-refresh2"
curl -s -XPUT "$BASE/elastical-test-putmapping"
curl -s -XPUT "$BASE/elastical-test-putmapping2"
curl -s -XPUT "$BASE/elastical-test-mapping"

curl -s -XPUT "$BASE/elastical-test-bulk/post/deleteme" -d '{
  "title": "Delete me"
}'

curl -s -XPUT "$BASE/_percolator/elastical-test-bulk/perc" -d '{
    "query" : {
        "term" : {
            "e": "bulkpercolate"
        }
    }
}'

curl -s -XPUT "$BASE/elastical-test-get/post/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'

curl -s -XPUT "$BASE/elastical-test-delete/post/1" -d '{
  "title": "Delete me"
}'

curl -s -XPUT "$BASE/elastical-test-mapping/type/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'

curl -s -XPUT "$BASE/elastical-test-mapping2/type/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'

curl -s -XPUT "$BASE/elastical-test-mapping2/type/2" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "ho"]
}'

curl -s -XPUT "$BASE/elastical-test-mapping/type2/1" -d '{
  "other": 1,
  "field": "dummy"
}'

# mapping tests
curl -s -XPUT "$BASE/elastical-test-mapping/type/_mapping" -d '
{
    "rootField" : {
        "properties" : {
            "message" : {"type" : "string", "store" : "yes"}
        }
    }
}'

# percolator tests begin
curl -s -XPUT "$BASE/elastical-test-percolator-index"
curl -s -XPUT "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-get" -d '{                    
  "query" : {
    "text" : {
      "tags" : {
        "query" : "welcome",
        "operator" : "or"
      }
    }
  }                                  
}'
curl -s -XPUT "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-delete" -d '{                    
  "query" : {
    "text" : {
      "tags" : {
        "query" : "delete me",
        "operator" : "and"
      }
    }
  }
}'
# percolator tests end

# river tests begin
curl -s -XPUT "$BASE/_river/elastical-test-river-get/_meta" -d '{                    
  "type" : "dummy"                         
}'
curl -s -XPUT "$BASE/_river/elastical-test-river-delete/_meta" -d '{                    
  "type" : "dummy"                         
}'
# river tests end

curl -s -XPOST "$BASE/elastical-test-delete/_refresh"
curl -s -XPOST "$BASE/elastical-test-get/_refresh"

# In case a previous run failed to clean up after itself.
curl -s -XDELETE "$BASE/elastical-test"
