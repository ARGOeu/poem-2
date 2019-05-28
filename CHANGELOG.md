# Changelog

## [2.3.0] - 2019-04-04
### Added
- ARGO-1573 Back reference fields on metrics and probes pages
- ARGO-1693 Hover dropdown info about selected probe on metric page
- ARGO-1695 Support for deletion of Aggregation profile
- ARGO-1696 Style and arrange Aggregations page
- ARGO-1698 Aggregation profile permissions based on Aggregation group
- ARGO-1700 Introduce config option for specifying WEB-API endpoint
- ARGO-548 Introduce Aggregation profiles CRUD on WEB API
- ARGO-771 POEM multi tenancy support

### Fixed
- ARGO-1719 Fix breadcrumbs for API key templates
- ARGO-1720 Fix Probe change form "Update metric" button
- ARGO-1724 Fix breadcrumb for Delete group pages
- ARGO-1688 Migrations are not registered as applied

### Changed
- ARGO-1653 Refine log entries view
- ARGO-1681 Refactor service type sync to use Django ORM
- ARGO-1694 Refine comments in log entry details page


## [2.2.0] - 2019-02-05
### Added 
- ARGO-1580 Minimal container for tests
- ARGO-1572 Public profiles, probes and metric pages
- ARGO-1524 Introduce services and probes view
- ARGO-1501 Tests for API methods
- ARGO-1449 Add ability to browse all recent actions
- ARGO-1442 Token and session authenticated REST API
- ARGO-1442 Tests for authenticated REST API
- ARGO-1371 Make use of full-blown DBMS

### Fixed
- ARGO-1628 Refine log entries view
- ARGO-1612 Fix tests by creating all needed tables in in-memory-DB
- ARGO-1568 History comments not rendered properly


## [2.1.0] - 2018-11-30
### Added
- ARGO-1497 Publicly available Probes pages
- ARGO-1448 Active/Passive metric designation in metric configuration UI page
- ARGO-1309 Static Metric Config attribute with predefined keys
- ARGO-1370 Optimize connectors queries to POEM
- ARGO-1327 Update probe data without creating new version

### Changed 
- ARGO-1500 Reformat None/NULL field values fetched from DB to empty string in API views
- ARGO-1499 Do not allow probe name changes to existing probe
- ARGO-1485 Sorted autocompletion Metric entries
- ARGO-1482 Allow empty values for keys in metric configuration
- ARGO-1372 Use Apache and mod-wsgi from Software Collections
- ARGO-565 Move to Django 2.0 version

### Fixed
- ARGO-1462 Plaintext LogEntry comments
- ARGO-950 Metric history browse always show most recent changes
