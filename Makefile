VOWS_BIN=node_modules/.bin/vows

all: apidocs test

test: offline-tests online-tests

apidocs:
	yuidoc -n -o docs ./ ./lib

offline-tests:
	-$(VOWS_BIN) tests/offline-tests.js

online-tests:
	@tests/confirm.sh
	@tests/setup.sh > /dev/null
	-$(VOWS_BIN) tests/online-tests.js
	@tests/teardown.sh > /dev/null
