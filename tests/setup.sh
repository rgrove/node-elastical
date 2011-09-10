#!/bin/bash

# Uses curl to set up test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XPUT "$BASE/elastical-test-deleteme"
curl -s -XPUT "$BASE/elastical-test-deleteme2"
curl -s -XPUT "$BASE/elastical-test-deleteme3"
curl -s -XPUT "$BASE/elastical-test-indexexists"
curl -s -XPUT "$BASE/elastical-test-indexexists2"
curl -s -XPUT "$BASE/elastical-test-refresh"
curl -s -XPUT "$BASE/elastical-test-refresh2"
curl -s -XPUT "$BASE/elastical-test-putmapping"
curl -s -XPUT "$BASE/elastical-test-putmapping2"

curl -s -XPUT "$BASE/elastical-test-get/post/1" -d '{
  "title": "Hello world",
  "body": "Welcome to my stupid blog.",
  "tags": ["stupid", "blog", "hi"]
}'

curl -s -XPUT "$BASE/elastical-test-delete/post/1" -d '{
  "title": "Delete me"
}'

curl -s -XPOST "$BASE/elastical-test-delete/_refresh"
curl -s -XPOST "$BASE/elastical-test-get/_refresh"

# In case a previous run failed to clean up after itself.
curl -s -XDELETE "$BASE/elastical-test"
