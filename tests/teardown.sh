#!/bin/bash

# Uses curl to tear down test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XDELETE "$BASE/elastical-test,elastical-test-delete,elastical-test-get,elastical-test-index,elastical-test-refresh,elastical-test-refresh2"
curl -s -XDELETE "$BASE/elastical-test-deleteme,elastical-test-deleteme2,elastical-test-deleteme3"
curl -s -XDELETE "$BASE/elastical-test-indexexists,elastical-test-indexexists2"
