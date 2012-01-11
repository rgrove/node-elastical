#!/bin/bash

# Uses curl to tear down test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XDELETE "$BASE/_all"
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-set"
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-get"
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-delete"
curl -s -XDELETE "$BASE/_river/elastical-test-river-set"
curl -s -XDELETE "$BASE/_river/elastical-test-river-get"
