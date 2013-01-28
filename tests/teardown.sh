#!/bin/bash

# Uses curl to tear down test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XDELETE "$BASE/_all"
echo -e ""
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-set"
echo -e ""
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-get"
echo -e ""
curl -s -XDELETE "$BASE/_percolator/elastical-test-percolator-index/elastical-test-percolator-delete"
echo -e ""

