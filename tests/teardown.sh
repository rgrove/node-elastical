#!/bin/bash

# Uses curl to tear down test data on a local ElasticSearch instance.

BASE="http://localhost:9200"

curl -s -XDELETE "$BASE/_all"
