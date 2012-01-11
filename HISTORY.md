Elastical History
=================

0.0.7 (2012-01-11)
------------------

* Implemented `putRiver()`, `getRiver()`, and `deleteRiver()`. [Richard Marr]


0.0.6 (2011-12-07)
------------------

* Implemented `Index.getMapping()`. [VirgileD]

* Compatible with npm 1.1.x. [Patrik Votoček]


0.0.5 (2011-11-23)
------------------

* Increased the minimum version for the `request` module to 2.2.0 to fix an
  issue with sending DELETE requests over HTTPS.


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
