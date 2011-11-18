Elastical History
=================

0.0.4 (2011-11-17)
------------------

* Fixed a bug that prevented 'percolate' from being used in a bulk operation.
  [Keith Benedict]

* Added support for HTTP auth and HTTPS connections. [Keith Benedict]


0.0.3 (2011-10-23)
------------------

* Added support for percolators. [Ram Viswanadha]


0.0.2 (2011-09-26)
------------------

* Implemented `Index.bulk()`.

* Implemented `Index.putMapping()`. [Ryan Shaw]

* Added a `curlDebug` client option that prints a runnable curl command to
  stderr for each request, to make manual request debugging easier.

* Increased the default request timeout from 10 seconds to 60 seconds.


0.0.1 (2011-09-06)
------------------

* Initial release.
