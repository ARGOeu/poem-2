# Changelog

## [3.5.1] - 2025-07-17

### Changed

* ARGO-4693 Prepare POEM testing environment for Rocky 9

### Added

* ARGO-2431 Remove file parameters & attributes fields from backend
* ARGO-3664 Rewrite metric / metric template page
* ARGO-4093 Notify user when they try to delete metric which is in metric profile
* ARGO-4192 Add import .csv button in metric profile addview
* ARGO-4266 Create default ports public page
* ARGO-4331 Import/export feature for metric overrides
* ARGO-4408 Improve the list of metrics to be imported to newly created tenant
* ARGO-4409 Import/export feature for metric tags

### Fixed

* ARGO-4407 Deletion of metrics in metric tags not working
* ARGO-4416 During bulk delete of metric templates data is not invalidated properly

## [3.5.0] - 2025-04-15

### Added

* ARGO-4542 Prepare POEM devel containers for Rocky 9 and Poetry dependency and virtenv handling
* ARGO-4918 poem-token CLI tool support for arbitrary schema and token name

### Fixed

* ARGO-4504 Form evaluation error if package is listed only in Rocky 9 repo
* ARGO-4816 Fix DB backup scripts to reflect virtenv changes

## [3.4.11] - 2024-06-07

### Added

* ARGO-4382 Placeholders instead of loading icon

### Fixed

* ARGO-4530 Minor code fixes and major tests fixes wrt react-router-dom bump

### Changed

* ARGO-4383 Bump react-router-dom-v6
* ARGO-4384 Upgrade React to version 18
* ARGO-4385 Upgrade Bootstrap to version 5.3.2
* ARGO-4543 Bump outdated python packages

## [3.4.10] - 2023-09-11

### Added

* ARGO-4356 Sending info emails
* ARGO-4357 Add option to submit script as probe candidate
* ARGO-4360 Add devel UI URL field to probe candidate model
* ARGO-4361 Add production UI URL field to probe candidate model
* ARGO-4368 Send an email when the probe candidate is rejected
* ARGO-4375 Implement internal DELETE method

### Fixed

* ARGO-4371 Script error in public metric profile changeview
* ARGO-4374 Fix parsing of email settings

### Changed

* ARGO-4369 Include flags to stop sending of duplicate emails
* ARGO-4370 Update POEM documentation

## [3.4.9] - 2023-08-03

### Added

* ARGO-4358 Add command validation to probe candidate API view
* ARGO-4359 Add service type field to probe candidate model
* ARGO-4360 Add devel UI URL field to probe candidate model
* ARGO-4361 Add production UI URL field to probe candidate model

### Fixed

* ARGO-4363 Configure setup.py to include new DB backup script into wheel package

### Changed

* ARGO-4362 Simplify db backup in POEM
* ARGO-4354 Remove internal metrics from token protected YUM repos API view

## [3.4.8] - 2023-07-06

### Added

* ARGO-3573 Introduce negation feature for topology entity filter
* ARGO-3574 Introduce wildcard specification for topology entity filter
* ARGO-4241 Mark that tenant is combined tenant
* ARGO-4242 Option to combine two existing profiles from different tenants
* ARGO-4276 API endpoints to integrate probes to the Monitoring service
* ARGO-4318 View in POEM for probe candidates

### Fixed

* ARGO-4230 Error not displayed on metric override page
* ARGO-4246 Fork and patch typing_extensions and place it as POEM dependency
* ARGO-4250 Bug fetching read-only WEB-API key
* ARGO-4321 Login page not redirecting

### Changed

* ARGO-3724 Skip import metrics step in tenant POEMs
* ARGO-4042 Switch threshold profile page to react-hook-form library
* ARGO-4239 Add tenants' keys to super POEM
* ARGO-4264 Switch login page to react-hook-form library
* ARGO-4265 Switch tenants page to react-hook-form library

## [3.4.7] - 2023-03-02

### Added

* ARGO-4213 Add title field for service types

### Changed

* ARGO-4214 Bump libs

## [3.4.6] - 2023-02-01

### Added

* ARGO-4103 POEM POST service types with tags=poem field set

### Fixed

* ARGO-4104 Reflect changing number of entries in pagination on rendering of tuples
* ARGO-4160 Form validation triggered wrong
* ARGO-4179 Fix duplicated tuple logic clear off on metric profiles

### Changed

* ARGO-4030 Switch aggregation profile page to react-hook-form library
* ARGO-4033 Switch metric overrides page to react-hook-form library
* ARGO-4034 Switch metric profile page to react-hook-form library
* ARGO-4035 Switch metric and metric templates page to react-hook-form library
* ARGO-4036 Switch metric tags page to react-hook-form library
* ARGO-4038 Remove formik from operations profile page
* ARGO-4040 Switch probe page to react-hook-form library
* ARGO-4043 Switch users page to react-hook-form library
* ARGO-4044 Switch YUM repo page to react-hook-form library
* ARGO-4161 Bump libs

## [3.4.5] - 2022-11-03

### Added

* ARGO-3971 Store default ports in POEM
* ARGO-3980 Support bulk delete of service types
* ARGO-3981 Introduce bulk add service types view
* ARGO-3983 Add service types pagination
* ARGO-4009 Enable Hot Module Replacement and Django internal web server
* ARGO-4014 Define min and max width of name column in Service Types list

### Changed

* ARGO-3711 Reduce Metric model to what is strictly necessary
* ARGO-3982 Remove service types sync and related DB tables
* ARGO-4004 Ensure that only service type names without whitespace can created from the UI
* ARGO-4008 Have red border around changed description field
* ARGO-4012 One common Save button instead of one in every row
* ARGO-4031 Switch API key page to react-hook-form library
* ARGO-4032 Switch groups page to react-hook-form library
* ARGO-4039 Switch package page to react-hook-form library
* ARGO-4051 Ensure POEM wheel essential dependencies installed automatically

### Fixed

* ARGO-4005 Marking field tuple on filtered view ends with description fields populated from neighboring tuple
* ARGO-4006 Case insensitive search on bulk delete and placeholder missing
* ARGO-4028 Adding of new metric profile is broken
* ARGO-4094 Metric parameter overrides not handling space in parameter value
* ARGO-4095 Clean requirements.txt

## [3.4.4] - 2022-09-01

### Added

* ARGO-3663 Add info on profile in which metrics are used

### Changed

* ARGO-3612 Improve fetching and caching data in probe page
* ARGO-3613 Improve fetching and caching data in metrics page
* ARGO-3614 Improve fetching and caching data on metric profiles page
* ARGO-3615 Improve fetching and caching data on aggregations profile page
* ARGO-3616 Improve fetching and caching data on thresholds profile page
* ARGO-3617 Improve fetching and caching data in users page
* ARGO-3959 Bump Django version to 3.2.15

## [3.4.3] - 2022-08-04

### Changed

* ARGO-3950 Bump Django version
* ARGO-3951 Update webpack, loaders, eslint and babel stuff
* ARGO-3952 Refine loading of custom Bootstrap options

### Fixed

* ARGO-3909 Wrong error message during tag syncing when adding/cloning metric template
* ARGO-3954 Fields in metric page enabled due to a package upgrade when they should be disabled

## [3.4.2] - 2022-06-09

### Added

* ARGO-3734 Introduce topology endpoint report filters
* ARGO-3671 Introduce page for handling metric tags
* ARGO-3686 Introduce tool for local import of EOSC services

### Changed

* ARGO-3841 Bump libs
* ARGO-3733 Do not assume both types of topology exists for every tenant
* ARGO-3523 Clean webpack deprecations
* ARGO-3694 Limit number of tries of executing backend and frontend tests

### Fixed

* ARGO-3693 Fix false negative unit tests occuring occasionally
* ARGO-3730 Remove toggle of Reports WEB-API CRUD
* ARGO-3707 Bug when handling topology entities values with whitespaces

## [3.4.1] - 2022-04-07

### Added

* ARGO-3499 Poem: Warn user if service exists in metric profile but not in aggregation profile
* ARGO-3618 Token protected API view for metric templates on SuperPOEM

### Changed

* ARGO-3672 Color "eol" tag red
* ARGO-3565 Improve fetching and caching data in reports page

### Fixed

* ARGO-3670 Error saving tags for passive metrics
* ARGO-3667 Resolve security issues

## [3.4.0] - 2022-02-10

### Added

* ARGO-3131 Introduce public reports pages
* ARGO-3223 Introduce filters based on EXTENSIONS
* ARGO-3412 Filter group values
* ARGO-3413 Filter hostname value
* ARGO-3495 Add thresholds profile field
* ARGO-3542 Update documentation on users page

### Fixed

* ARGO-3394 Public metrics view return 403
* ARGO-3544 Cannot select metric in thresholds profiles' addview
* ARGO-3546 Fix filter_tags settings for "name" field
* ARGO-3561 Fix shelljs security vulnerability
* ARGO-3562 Fix profiles select on report, write_perm on add/cloneview, closing of failed login alert
* ARGO-3566 Ensure that entity data with empty value is not POSTed on WEB-AP
* ARGO-3567 Fix entity formik initialization for different cases
* ARGO-3568 Public report page not rendering if no entities
* ARGO-3570 Ensure that no empty report tag is POSTed on WEB-API

### Changed

* ARGO-3244 Bump django to version 3.2
* ARGO-3397 Upgrade to Reactstrap 9
* ARGO-3411 Change label Endpoint group
* ARGO-3425 input value is not required
* ARGO-3485 Update documentation on thresholds profile page
* ARGO-3496 Update documentation on reports page
* ARGO-3497 Remove info_* and vo_* tags from group of endpoints tags options
* ARGO-3523 Bump webpack stuff
* ARGO-3543 Update frontend

## [3.3.11] - 2021-10-15

### Added

* ARGO-3296 Prefetch data to speed up the page loading
* ARGO-3357 Vary POEM terms and privacy policy links for different tenants

### Changed

* ARGO-3261 Refactor components just to work with react-query 3.*
* ARGO-3262 Improve query functions in all the components
* ARGO-3263 Refactor components to use 'useMutation' hook
* ARGO-3285 Handle binary tag value when second value is not presented in bucket

### Fixed

* ARGO-3260 Fix parallel run of React tests
* ARGO-3330 500 status issue when trying to delete a threshold profile
* ARGO-3358 Fix error that is sometimes returned in specific probe page

## [3.3.10] - 2021-09-02

### Added

* ARGO-2718 Create tests for reports
* ARGO-3096 Delete tenant feature
* ARGO-3171 Include tests for reports related API views
* ARGO-3177 Selective enablement of Reports WEB-API CRUD
* ARGO-3242 Use read-only token in repos internal API

### Changed

* ARGO-3094 Use django-tenants for PostgreSQL tenant schemas
* ARGO-3221 Tag multiple values as comma separated strings
* ARGO-3230 Update POEM documentation
* ARGO-3242 Use read-only token in repos internal API

### Fixed

* ARGO-3242 Use read-only token in repos internal API
* ARGO-3243 Bump outdated libs versions

## [3.3.9] - 2021-06-10

### Added

* ARGO-2712 Create tests for metric profiles
* ARGO-2563 Introduce topology tags/filters handling in Reports page
* ARGO-3066 Fetch sites and NGIs needed for reports filtering from /topology WEB-API methods
* ARGO-2711 Create tests for Login page
* ARGO-3137 Sorted topology entities
* ARGO-3147 Update documentation regarding reports
* ARGO-3130 Display group of reports permissions on userdetails

### Changed

* ARGO-3133 Use custom react-select component on Reports
* ARGO-3145 Reports internal POEM API methods tighten
* ARGO-3134 Do not reset tags form state to initials
* ARGO-3135 Ensure topology type and group selected
* ARGO-3068 Do not allow profile renaming
* ARGO-3097 Tighten up PUT and POST on the backend API
* ARGO-3162 Postprocess binary tags value in onChange handler

### Fixed

* ARGO-3174 Fix tuple remove for all tag tuples not just last
* ARGO-3143 Fix failing tests

## [3.3.8] - 2021-04-12

### Added

* ARGO-2709 Create tests for Agregation profiles
* ARGO-2715 Create tests for operation profiles
* ARGO-2716 Create tests for packages
* ARGO-2719 Create tests for service types
* ARGO-2720 Create tests for tenants
* ARGO-2721 Create tests for thresholds profiles
* ARGO-2722 Create tests for users
* ARGO-2723 Create tests for YUM repos

### Changed

* ARGO-2947 Package requirements.txt
* ARGO-2977 Show only metric templates which are not already imported in listview on tenant POEM

### Fixed

* ARGO-2946 Point default poem.conf Apache configuration to OS CA bundle
* ARGO-3067 djangosaml2 upgrade breaks POEM

## [3.3.7] - 2021-02-01

### Added

* ARGO-2533 Import/export csv for metric profiles
* ARGO-2717 Create tests for probes
* ARGO-2714 Create tests for metric templates
* ARGO-2859 Expose internal metric info when fetching repos
* ARGO-2713 Create tests for metrics
* ARGO-2710 Create tests for group elements
* ARGO-2691 Create tests for API key components

### Fixed

* ARGO-2928 When changing repo in package changeview version is reset to previous value
* ARGO-2925 Bump pysaml to resolve security issue
* ARGO-2912 sync-servtype not returning properly if tenant service types should be synced

### Changed

* ARGO-2924 Update documentation regarding import/export csv for metric profiles

## [3.3.6] - 2020-12-22

### Added

* ARGO-2776 Individual pages should have meaningful document title
* ARGO-2775 Optional service type sync for tenants

### Fixed

* ARGO-2801 Prevent adding of new service type groups if metric profiles is not associated
* ARGO-2796 Bump ini js package
* ARGO-2779 Fix linting errors in Login.js
* ARGO-2777 React-POEM backend updates
* ARGO-2778 Public tenant resources not rendering
* ARGO-2774 Browser refresh or direct visit of resource changeview triggers queries with uninitialized variables

### Changed

* ARGO-2633 Switch aggregation profiles changeview to formik v2
* ARGO-2638 Switch metric profiles to formik v2
* ARGO-2680 Reorganize python unit tests in multiple files
* ARGO-2646 Switch thresholds profiles to formik v2
* ARGO-2648 Switch YUM repos page to formik v2
* ARGO-2647 Switch users page to formik v2
* ARGO-2645 Switch tenants page to formik v2
* ARGO-2644 Switch reports to formik v2

## [3.3.5] - 2020-11-05

### Added

* ARGO-2614 Use caching on tenant page

### Fixed

* ARGO-2679 Bug with metric template import

### Changed

* ARGO-2567 Refactor metric profile by using React Context
* ARGO-2606 Switch 'Login' component to React Hooks
* ARGO-2608 Switch 'Users' components to React Hooks
* ARGO-2613 Use 'state' variable in BaseArgoView
* ARGO-2653 Refactor metric profiles to React Hooks
* ARGO-2654 Refactor aggregation profiles to React Hooks
* ARGO-2655 Refactor aggregation profiles by using React Context
* ARGO-2658 Switch 'App' component to React Hooks

## [3.3.4] - 2020-10-08

### Added

* ARGO-2598 Privacy Policy sidebar reference to UI
* ARGO-2611 Public service types pages

### Fixed

* ARGO-2566 Remove dummy group on public_aggregationprofiles
* ARGO-2568 Update documentation for October release
* ARGO-2615 Public metric template changeview not rendering on tenant POEM
* ARGO-2650 Filtering metric templates by OS tag not working on POEM

### Changed

* ARGO-2589 Refactor profiles changelist view with react-table-v7
* ARGO-2597 Rename Privacy Policies to Cookie Policies

## [3.3.3] - 2020-09-14

### Added

* ARGO-2574 Cookie policy for ARGO POEM

## [3.3.2] - 2020-09-08

### Added

* ARGO-2404 Set tokens to predefined values from GUI
* ARGO-2554 Introduce operations profiles page
* ARGO-2552 Create home page for public pages
* ARGO-2457 Public tenant pages with list of all available metric templates
* ARGO-2525 Introduce metric template tagging
* ARGO-2511 Simple tenant page on SuperAdmin POEM
* ARGO-2512 Token handling in SuperAdmin POEM
* ARGO-2484 Add feature to bulk delete metric templates

### Fixed

* ARGO-2555 Public probe page on SuperAdmin POEM is not read-only
* ARGO-2551 Fetch internal metrics from POEM
* ARGO-2415 Public pages should have flat fields without actions
* ARGO-2550 Public metrics page not working
* ARGO-2540 Use public GOCDB API without explicit client authn
* ARGO-2539 Add missing packages for the given distro to YUM repo API response
* ARGO-2532 Bump lodash to resolve security issue
* ARGO-2531 Ensure synced indexes between filtered and full view of tuples
* ARGO-2528 When metric template is changed, metrics are updated only for one tenant

### Changed

* ARGO-2535 Use autosuggest in metric and aggregation profiles
* ARGO-2553 Clickable card on SuperPOEM tenant page
* ARGO-2536 Stop using react-filtered-multiselect
* ARGO-2534 Refactor AutocompleteField to use autosuggest instead of autocomplete
* ARGO-2131 Replace react-autocomplete with react-autosuggest
* ARGO-2526 Title of paragraphs on each page as separate component
* ARGO-2524 Update documentation regarding metric templates on SuperPOEM

## [3.3.1] - 2020-07-08

### Added
* ARGO-2464 Add clone functionality to Package page
* ARGO-2469 List of probes at the end of package page should show list of probes for the given package version
* ARGO-2488 Build of development container environment part of repository

### Fixed
* ARGO-2500 Succesive delete of metric profile tuples starting from first one is stopped
* ARGO-2481 Metric profile side effect value changes
* ARGO-2480 Metric profile ends with empty tuples
* ARGO-2465 Fix 'Select all' button on 'Import metric template' page
* ARGO-2478 Error if probe has no associated metrics

### Changed
* ARGO-2275 Simplify package version management on tenant level
* ARGO-2477 Remove OS version from name in YUM repo page
* ARGO-2483 Remove SPMT/AGORA
* ARGO-2487 Remove hard coded WEB-API devel from /repos call

## [3.3.0] - 2020-06-09

### Added
* ARGO-2398 Create set of group of resources when creating new tenant
* ARGO-2413 Probes could present the related metrics
* ARGO-2412 Metric Template and package name
* ARGO-2405 Clone feature for YUM repos
* ARGO-2408 Add information on FLAGS and ATTRIBUTES to POEM documentation
* ARGO-2349 POEM step by step guides
* ARGO-2426 Import minimum set of internal metrics when creating tenant
* ARGO-2428 Expose user details and groups permissions on NavBar hover/info
* ARGO-2436 Add description of user details to POEM documentation
* ARGO-2362 Ability to set/change password for user
* ARGO-2420 Introduce modal/popup for connection related problems with WEB-API
* ARGO-2435 Delete tenant feature
* ARGO-1697 Form validation of Service Type entries in Aggregations

### Fixed
* ARGO-2403 Metric not renamed in metric profile when metric template is renamed
* ARGO-2281 Prevent add view if user does not control any corresponding resource group
* ARGO-2082 Prevent duplicated tuples on Metric profiles
* ARGO-2451 Warning message when importing metric templates
* ARGO-2452 Set no timeout on warning messages
* ARGO-2458 Fix regression with not able to add new Threshold profile
* ARGO-2459 Sync profile name changes
* ARGO-2460 Clicking on probe's number of versions does not redirect to history page
* ARGO-2470 Profile name in Metric profile clone view keeps changing

### Changed
* ARGO-2419 Order side bar on SuperAdmin POEM logically
* ARGO-2411 Probe details page: URL is huge
* ARGO-2421 User with no UI permission given should be served with RO WEB-API token
* ARGO-2429 Remove file parameters & attributes fields from frontend

## [3.2.0] - 2020-04-24

### Added
* ARGO-2278 Create user manual for POEM
* ARGO-1935 Add description to metrics
* ARGO-2361 Expose last_login on user detail view
* ARGO-2400 Public pages in React POEM

### Fixed
* ARGO-2359 Fix tenant_command parsing introduced in newer django-tenant-schemas
* ARGO-2348 Clearance of staled sessions does not work
* ARGO-2366 Correctly handle empty metric profiles
* ARGO-2368 Fix parsing of DEBUG option
* ARGO-2397 [packages] - add a new package

### Changed
* ARGO-2347 Resolve security issues
* ARGO-2282 Get rid of Promises spaghetti code and use async/await

## [3.1.0] - 2020-03-30

### Added

* ARGO-1805 History of changes for Aggregation profiles
* ARGO-1811 Add validation logic for services missing in metric but presented in aggregation profile
* ARGO-1855 Clone feature for Metric profiles
* ARGO-1856 History of changes for Metric profiles
* ARGO-1993 Clone functionality for probes
* ARGO-1994 Expand metrics so that tenants can pick a version of the probe
* ARGO-2029 Introduce packages
* ARGO-2052 Introduce thresholds profiles
* ARGO-2077 border-success for newly created tuples in metric templates
* ARGO-2171 Metric template page on tenant POEM should show metric template history
* ARGO-2172 Filter metric templates by OS on tenant POEM
* ARGO-2208 Update version_comment if history entry is updated on super POEM
* ARGO-2232 History of changes for thresholds profiles
* ARGO-2249 Add description field to metric profiles
* ARGO-2265 Tag for packages to use it's present version from repo
* ARGO-2273 Introduce webpack watch mode
* ARGO-2286 React routes should be defined according to type of user
* ARGO-2289 Add link to thresholds profiles to administration page
* ARGO-2323 Add column with package name to probe list

### Fixed

* ARGO-2041 Use natural keys for serialization instead of primary keys
* ARGO-2044 Refactor history_helpers to properly handle missing fields in serialized_data
* ARGO-2073 Refactor tenant POEM internal code check
* ARGO-2074 Probe/metric template history breaks if the name is changed
* ARGO-2075 Load data from jsons not working when using natural keys for some models
* ARGO-2081 Multiple tuples delete does not work on Metric profiles
* ARGO-2083 Remove history button from groups of resources
* ARGO-2089 Tenant users should be able to add resources to groups associated to them
* ARGO-2091 Fix SAML2 login with Django 2.2
* ARGO-2231 Wrong probe version for certain metrics in repo API view
* ARGO-2252 Fix potential security issue as user can easily promote himself
* ARGO-2310 Super POEM session inspect should be properly called
* ARGO-2313 Metric templates states must be all set when render is triggered
* ARGO-2315 Fix syncers
* ARGO-2327 Metric configuration parameters should be clickable

### Changed

* ARGO-1960 Additional active session check next to isLogged localStorage key
* ARGO-2028 Refine Fontawesome icons
* ARGO-2072 Slimmer sidebar and footer
* ARGO-2078 Change title and remove unnecessary buttons from metric template clone view
* ARGO-2087 User without superuser permissions should not be able to add resources
* ARGO-2128 Refactor and simplify WEB-API and Backend API class and methods
* ARGO-2138 Change how probe and metric template history is handled in backend
* ARGO-2173 Remove button on metric templates not appearing properly
* ARGO-2174 Remove delete button from user addview
* ARGO-2175 Remove delete button from probe addview
* ARGO-2176 Remove delete button from group of resources addview
* ARGO-2218 Refactor token protected repo API view
* ARGO-2246 Harmonize profile change pages
* ARGO-2255 Refine version compare page for profiles
* ARGO-2284 API walk-through should filter and match content only for logged in user
* ARGO-2288 Remove "Staff status" checkbox from User UI
* ARGO-2290 Consistent table look across all pages
* ARGO-2324 Refactor sync_webapi function to create initial history entries

## [3.0.0] - 2019-11-08
### Added
* ARGO-1797 User/Pass and SAML2 Login and base UI structure
* ARGO-1798 Services page
* ARGO-1799 Aggregation page
* ARGO-1807 Investigate and possibly fix additional re-render from changelist to change view
* ARGO-1804 Add breadcrumb navigation
* ARGO-1808 Introduce CRUD for Metric profiles on WEB-API
* ARGO-1806 Add Fontawesome icons
* ARGO-1929 Handle users and groups ACLs
* ARGO-1933 Introduce probe read-only tenant page
* ARGO-1937 Introduce Metric page
* ARGO-1936 History of changes for Probes
* ARGO-1934 Introduce page for API keys handling
* ARGO-1979 Introduce Super Admin POEM
* ARGO-1980 Introduce Probe page on Super Admin POEM
* ARGO-1981 Introduce Metric template page on Super Admin POEM
* ARGO-1991 Create custom Version model to use instead of django-reversion plugin
* ARGO-2012 Limit access to Administration page only to super users
* ARGO-1930 Handle password validation
* ARGO-1992 Clone functionality for Metric templates
* ARGO-2020 History of changes for Metric templates
* ARGO-1940 History of changes for Metrics
* ARGO-1995 Add yum repositories
* ARGO-2030 Metric template change not working properly

### Fixed

* ARGO-1807 Investigate and possibly fix additional re-render from changelist to change view
* ARGO-1836 Session not activated for superuser login
* ARGO-1818 Select flavor in aggregation form
* ARGO-1923 Create UserProfile when creating Superuser using poem-db tool
* ARGO-2023 Internal group of resources API should be filtered by correct field
* ARGO-2026 Make API key clickable
* ARGO-2031 Fix handling of multiple parameters
* ARGO-2033 Parent field in metric templates shouldn't be required in case of passive metrics

### Changed

* ARGO-1819 Refactor with general HOC and API query components
* ARGO-1884 Merge old poem backend with new poem-2
* ARGO-1939 Refactor internal api views
* ARGO-1959 Update backend Python packages
* ARGO-2011 Refactor GroupOfMetrics model

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
