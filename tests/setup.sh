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

curl -s -XPOST "$BASE/elastical-test-delete/_refresh"
curl -s -XPOST "$BASE/elastical-test-get/_refresh"

# In case a previous run failed to clean up after itself.
curl -s -XDELETE "$BASE/elastical-test"
