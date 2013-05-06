#!/bin/bash

# Uses curl to set up test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

echo -e "Setting up the indicies"

curl -s -XPUT "$BASE/elastical-test-bulk"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-deleteme"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-deleteme2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-deleteme3"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-indexexists"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-indexexists2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-getsettings"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-getsettings2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-aliases"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-refresh"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-refresh2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-updatesettings"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-updatesettings2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-updatesettings3"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-putmapping"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-putmapping2"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-mapping"
echo -e ""

curl -s -XPUT "$BASE/elastical-test-analyze" -d '{
    "settings" : {
        "analysis" : {
        "analyzer" : {
            "stop_my" : {
                "type" : "standard",
                "stopwords" : [ "my" ]
            }
        }
        }
    }
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-bulk/post/deleteme" -d '{
  "title": "Delete me"
}'
echo -e ""

curl -s -XPUT "$BASE/_percolator/elastical-test-bulk/perc" -d '{
    "query" : {
        "term" : {
            "e": "bulkpercolate"
        }
    }
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-get/post/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-delete/post/1" -d '{
  "title": "Delete me"
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-mapping/type/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-mapping2/type/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-mapping2/type/2" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "ho"]
}'
echo -e ""

curl -s -XPUT "$BASE/elastical-test-mapping/type2/1" -d '{
  "other": 1,
  "field": "dummy"
}'
echo -e ""

echo -e "Mapping tests"
curl -s -XPUT "$BASE/elastical-test-mapping/type/_mapping" -d '
{
    "rootField" : {
        "properties" : {
            "message" : {"type" : "string", "store" : "yes"}
        }
    }
}'
echo -e ""

echo -e "percolator tests begin"
curl -s -XPUT "$BASE/elastical-test-percolator-index"
echo -e ""

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
echo -e ""

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
echo -e ""
# percolator tests end

echo -e "river tests begin"
curl -s -XPUT "$BASE/_river/elastical-test-river-get/_meta" -d '{
  "type" : "dummy"
}'
echo -e ""
curl -s -XPUT "$BASE/_river/elastical-test-river-delete/_meta" -d '{
  "type" : "dummy"
}'
echo -e ""
# river tests end

curl -s -XPOST "$BASE/elastical-test-delete/_refresh"
echo -e ""

curl -s -XPOST "$BASE/elastical-test-get/_refresh"
echo -e ""

