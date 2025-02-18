# ARGO POEM service for ARGO monitoring framework

## Description

ARGO POEM service is multi-tenant aware web application used for management of tenants and corresponding resources needed to bootstrap their monitoring. It's register of services, repositories, packages and related probes, metric configurations and metric profiles that instruct ARGO monitoring instances what kind of probes/tests to execute for given tenant. Additionally it manages grouping of results and defines configuration of reports that ARGO compute engine will generate for each tenant. All of that in multi-tenant manner where single instance of web application can cater for multiple tenants and their monitoring needs. Users of EGI tenant are allowed to login via SAML2 based EGI CheckIN service.

### Features

Here is a complete list of features:
* handling of RPM repositories with Nagios probes
* versioning of packages and Nagios probes
* mapping of probes and metrics with predefined metric configuration templates
* mapping of metrics and service types and grouping of them into metric profiles
* handling of aggregation profiles; definition of service type groups and logical operators within and between them so to define the status result deduction rules
* definition of availability and reliability reports and its parameters; topology sources, filters and applying of different profiles to fully accommodate generation of reports
* flexible session and token protected REST API
* use of ARGO WEB-API as a centralized store for various resources
* PostgreSQL with schemas for enabling of multi-tenancy
* integration with SAML identity providers

### Design

ARGO POEM is SPA (single page) web application using Django framework as backend and ReactJS UI library as a frontend component. Client's browser loads in bundle code that jointly represents whole frontend component that packs together Javascript, CSS, fonts, icons and everything else needed to properly render the UI. Frontend component is glued with backend Django framework as its staticfile that loads bundle in a single Django template presented to client. Keeping frontend close to backend allows exploiting of some nice Django packages that primarily deal with API methods, user authentication and tenant database handling. Frontend talks to backend over session protected REST API methods for resources that should be stored in local database. For the other part of the resources that should be kept on token protected ARGO WEB-API, HTTP requests are triggered directly from frontend.

Web application is served with Apache web server and uses PostgreSQL as database storage.

#### List of packages used

Backend: `Django`, `dj-rest-auth`, `django-tenants`, `django-webpack-loader`, `djangorestframework`, `djangorestframework-api-key`, `djangosaml2`, `psycopg2-binary`

Frontend: `ReactJS`, `formik`, `react-hook-form`, `react-autosuggest`, `react-diff-viewer`, `react-dom`, `react-fontawesome`, `react-helmet`, `react-notifications`, `react-popup`, `react-router`, `react-select`, `react-table`, `reactstrap`, `webpack`, `yup`

## User documentation and instances

User documentation: http://argoeu.github.io/poem/v1/

EGI instances:
* production - https://poem.egi.eu
* devel - https://poem-devel.egi.eu
* SuperPOEM - https://poem.argo.grnet.gr

Public pages:
* https://poem.egi.eu/ui/public_home
* https://poem-devel.egi.eu/ui/public_home
* https://poem.argo.grnet.gr/ui/public_home

## Installation

POEM web service is meant to be running with Django 3.x driven by Python 3.x on CentOS 7 and served by installation of Apache from Software Collections. Setting up Python virtual environment based on Python 3.x is prerequisite. Once the virtual environment is set up, installation of the service simply narrows down to creating and installing wheel package that will also pull and install all needed dependencies. Beside wheel dependencies, service also needs some packages to be installed from CentOS 7 repositories:

```sh
% yum -y install ca-certificates \
		git which \
		xmlsec1 xmlsec1-openssl
```

Layout of POEM web service files on the filesystem depends on the location of virtual environment. By the default, service assumes it is:

```sh
VENV = /home/pyvenv/poem/
```

| File Types                      | Destination                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Configuration - General         | `VENV/etc/poem/poem.conf`                                                     |
| Configuration - Logging         | `VENV/etc/poem/poem_logging.conf`                                             |
| Configuration - Apache          | `/opt/rh/httpd24/root/etc/httpd/conf.d/`                                      |
| Cron jobs                       | `/etc/cron.d/poem-clearsessions, poem-sync, poem-db_backup`                   |
| Logrotate                       | `/etc/logrotate.d/poem-db_backup`                                             |
| Database handler                | `VENV/bin/poem-db`                                                            |
| Sync (Service types)            | `VENV/bin/poem-syncservtype`                                                  |
| Security key generator          | `VENV/bin/poem-genseckey`                                                     |
| Token set/create                | `VENV/bin/poem-token`                                                         |
| Tenant management               | `VENV/bin/poem-tenant`                                                        |
| Import services from json file  | `VENV/bin/poem-importservices`                                                |
| Django `manage.py` wrapper      | `VENV/bin/poem-manage`                                                        |
| Static data served by Apache    | `VENV/usr/share/poem/`                                                        |
| Main application code           | `VENV/lib/python3.6/site-packages/Poem/`                                      |
| Log file                        | `VENV/var/log/poem`                                                           |
| DB backups                      | `VENV/var/db_backups/`                                                        |


If the default location of virtual environment is inappropriate and needs to be changed, change of it should be reflected by adapting `VENV` configuration variable in `etc/poem/poem.conf`, `etc/poem/poem_logging.conf`, `/etc/httpd/conf.d/poem.conf` and `site-packages/Poem/settings.py`.

### Setting up virtual environment based on Python 3.6

CentOS 7 operating system delivers [Python 3.6 through Software Collections service](https://www.softwarecollections.org/en/scls/rhscl/rh-python36/) that is installed with the following instructions:

```sh
% yum -y install centos-release-scl
% yum -y install scl-utils
% yum -y install rh-python36 rh-python36-python-pip
```

Prebuilt `mod-wsgi` that is linked against Python 3.6 and [Apache from Software Collections service](https://wwws.oftwarecollections.org/en/scls/rhscl/httpd24/) can be installed:

```sh
% yum -y install rh-python36-mod_wsgi httpd24-httpd httpd24-mod_ssl
```

Once the Python 3.6 is installed, it needs to be used to create a new virtual environment named _poem_:

```sh
% scl enable rh-python36 'pip install -U pip'
% scl enable rh-python36 'pip3 install virtualenv virtualenvwrapper'
% scl enable rh-python36 'export VIRTUALENVWRAPPER_PYTHON=/opt/rh/rh-python36/root/bin/python3.6; source /opt/rh/rh-python36/root/usr/bin/virtualenvwrapper.sh; export WORKON_HOME=/home/pyvenv; mkdir -p $WORKON_HOME; mkvirtualenv poem'
```

> **Notice** how the location of virtual environment is controlled with `WORKON_HOME` variable. Created virtual environment directory will be `$WORKON_HOME/poem`. It needs to be aligned with `VENV` variable in service configuration.

Afterward, the context of virtual environment can be started:

```sh
% workon poem
```

As virtual environment is tied to Python 3.6 versions, it's *advisable* to put `helpers/venv_poem.sh` into `/etc/profile.d` as it will configure login shell automatically.

### Installing the POEM service

Creation and installation of wheel package is done in the context of virtual environment which needs to be loaded prior.

```sh
% workon poem
% (poem) python setup.py sdist bdist_wheel
% (poem) pip3 install dist/*
% (poem) pip3 install -r requirements_ext.txt
```
wheel package ships cron jobs and Apache configuration and as it is installed in virtual environment, it can **not** actually layout files outside of it meaning that system-wide files should be placed manually or by configuration management system:

```sh
% (poem) cp $VIRTUAL_ENV/etc/cron.d/poem-clearsessions /etc/cron.d/
% (poem) cp $VIRTUAL_ENV/etc/cron.d/poem-syncvosf /etc/cron.d/
% (poem) ln -f -s $VIRTUAL_ENV/etc/httpd/conf.d/poem.conf /opt/rh/httpd24/root/etc/httpd/conf.d/
```

Next, the correct permission needs to be set on virtual environment directory:

```sh
% (poem) chown -R apache:apache $VIRTUAL_ENV
```

### PostgreSQL server setup

POEM is tested and meant to be running on PostgreSQL 10 DBMS. CentOS 7 operating system delivers [PostgreSQL 10 through Software Collections service](https://www.softwarecollections.org/en/scls/rhscl/rh-postgresql10/) that is installed with the following instructions:

```sh
% yum -y install centos-release-scl
% yum -y install scl-utils
% yum -y install rh-postgresql10
```

Initalization of database:
```sh
% scl enable rh-postgresql10 'postgresql-setup --initdb'
```

In `/var/opt/rh/rh-postgresql10/lib/pgsql/data/pg_hba.conf`, change default client authentication to password authentication:
```sh
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
```
Default `ident` should be replaced by `md5`.

Start the service:
```sh
% systemctl start rh-postgresql10-postgresql
```

Set password for default DB user `postgres`:
```sh
% su - postgres -c 'scl enable rh-postgresql10 -- psql'
postgres=# \password postgres
```

## Configuration

Configuration is centered around one file `VENV/etc/poem/poem.conf` that is split into several sections: `[DEFAULT]`, `[GENERAL]`, `[DATABASE]` and `[SECURITY]`, which are common to all tenants, and tenant-specific sections which have tenant name in the title: `[GENERAL_<tenant_name>]`, `[SUPERUSER_<tenant_name>]`, and `[SYNC_<tenant_name>]` (`<tenant_name>` marks the name of the tenant - those section should exist for every tenant).

### DEFAULT

	[DEFAULT]
	VENV = /home/pyvenv/poem/

* `VENV` defines the location of virtual environment directory. Value will be interpolated into the other options.

### GENERAL

	[GENERAL]
	Debug = False
	TimeZone = Europe/Zagreb

* `Debug` serves for the debugging purposes and tells Django to be verbosive and list the stack calls in case of errors
* `Timezone` timezone

### DATABASE

	[DATABASE]
	Name = postgres
	User = postgres
	Password = postgres
	Host = localhost
	Port = 5432

* `Name` is the name of database to use for tables
* `User`, `Password` are credentials that will be used to authenticate to PostgreSQL server
* `Host` is hostname of the PostgreSQL server
* `Port` where PostgreSQL server is listening for connections

### SECURITY

	[SECURITY]
	AllowedHosts = FQDN1, FQDN2
	CAFile = /etc/pki/tls/certs/DigiCertCA.crt
	CAPath = /etc/grid-security/certificates/
	HostCert = /etc/grid-security/hostcert.pem
	HostKey = /etc/grid-security/hostkey.pem
	SecretKeyPath = %(VENV)s/etc/poem/secret_key

* `AllowedHosts` should have FQDN name of hosts that will be running POEM service. It can be provided as comma separated list of valid FQDNs and it is used as prevention of HTTP Host Header attacks. FQDNs listed here will be matched against request's Host header exactly.
* `CAFile`, `CAPath` are used by sync scripts to authenticate the server certificate
* `HostCert`, `HostKey` are public and private part of client certificate
* `SecretKeyPath` is the location of file containing Django SECRET_KEY that is used for cryptographic signing
	* `poem-genseckey` provided tool can generate unique and unpredictable value and write it into the file
```sh
% workon poem
% poem-genseckey -f $VIRTUAL_ENV/etc/poem/secret_key
```

Part of the REST API is protected by token so for tenants that consume those API methods, token needs to be generated and distributed. Tokens can be generated by the superuser from the Admin UI page or with the provided `poem-token` tool. Example is creation a token for the client/tenant EGI:
```sh
% workon poem
% poem-token -t EGI -s egi
```

### WEBAPI

    [WEBAPI]
    MetricProfile = https://api.devel.argo.grnet.gr/api/v2/metric_profiles
    AggregationProfile = https://api.devel.argo.grnet.gr/api/v2/aggregation_profiles
    ThresholdsProfile = https://api.devel.argo.grnet.gr/api/v2/thresholds_profiles
    OperationsProfile = https://api.devel.argo.grnet.gr/api/v2/operations_profiles
    Reports = https://api.devel.argo.grnet.gr/api/v2/reports
    ReportsTopologyTags = https://api.devel.argo.grnet.gr/api/v2/topology/tags
    ReportsTopologyGroups = https://api.devel.argo.grnet.gr/api/v2/topology/groups
    ReportsTopologyEndpoints = https://api.devel.argo.grnet.gr/api/v2/topology/endpoints
    ServiceTypes = https://api.devel.argo.grnet.gr/api/v2/topology/service-types
    Metrics = https://api.devel.argo.grnet.gr/api/v4/admin/metrics


This section lists WEB-API methods for the resources that are not stored in
POEM's PostgreSQL DB, but instead are consumed from ARGO WEB-API services. POEM
actively polls the PI methods and is doing the full round of CRUD operations on
them.

### GENERAL_<tenant_name>

    [GENERAL_EGI]
    Namespace = hr.cro-ngi.TEST
    SamlLoginString = Log in using EGI CHECK-IN
    SamlServiceName = ARGO POEM EGI-CheckIN
    TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse/ALL
    PrivacyPolicies = https://argo.egi.eu/egi/policies/ALL


* `Namespace` defines the identifier that will be prepended to every Profile
* `SamlLoginString` defines the text presented on the SAML2 button of login page
* `SamlServiceName` defines service name in SAML2 configuration
* `TermsOfUse` represents tenant URL reference to Terms of Use on ARGO UI service
* `PrivacyPolicies` represents tenant URL reference to Privacy policies on ARGO UI service

### SUPERUSER_<tenant_name>

Initial superuser credentials that can be used to sign in to POEM with username and password.

    [SUPERUSER_EGI]
    Name = test
    Password = test
    Email = test@foo.baar

> It is **important** to note that these options should be specified with correct values **before** trying to create a superuser in database for the given tenant.

### SYNC_<tenant_name>

> Section is _optional_ and is of particular interest for tenants that comes with GOCDB-like service whose service types are defined there and should be periodically pulled and presented in the ARGO POEM.

These control options are used by sync scripts that fetch all available services types from GOCDB-like service. Additionally, if GOCDB-like service supports only Basic HTTP Authentication, it should be enabled by setting `UsePlainHttpAuth` and specifying credentials in `HttpUser` and `HttpPass`.

    [SYNC_EGI]
    UsePlainHttpAuth = False
    HttpUser = xxxx
    HttpPass = xxxx
    ServiceType = https://goc.egi.eu/gocdbpi/private/?method=get_service_types

### Creating database and starting the service

Prerequisites for creating the empty database are:
1) PostgreSQL DB server running on `Host`, listening on `Port` and accepting `User` and `Password`
2) `[SUPERUSER_<tenant_name>]` section is set with desired credentials
3) `SECRET_KEY` is generated and placed in `$VIRTUAL_ENV/etc/poem/secret_key`
4) `$VIRTUAL_ENV` has permissions set to `apache:apache`
5) `poem.conf` Apache configuration is presented in `/opt/rh/httpd24/root/etc/httpd/conf.d/`

Once all is set, database can be created with provided tool `poem-db`.

```sh
% workon poem
% poem-db -c
[standard:public] === Running migrate for schema public
[standard:public] Operations to perform:
[standard:public]   Apply all migrations: admin, auth, contenttypes, poem, rest_framework_api_key, reversion, sessions, tenants
[standard:public] Running migrations:
....
```

## Tenant handling

### SuperPOEM

TODO: Tenant handling will be done within SuperPOEM that will spawn TenantPOEM and will have a register all of them with needed tenant metadata. Until then, TenantPOEM is created with a set of Django backend tools that set and create needed tenant metadata.

Prerequisite for spawning of new TenantPOEM is to have SuperPOEM operational with its data (metric templates, probes, packages and repo) loaded in `public` database schema. SuperPOEM is residing on its own FQDN, supporting only username/password login that should be defined in `poem.conf`:
```
[SECURITY]
AllowedHosts = poem.devel.argo.grnet.gr

[GENERAL_ALL]
PublicPage = poem.devel.argo.grnet.gr
TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse/ALL
PrivacyPolicies = https://argo.egi.eu/egi/policies/ALL


[SUPERUSER_ALL]
Name = <username>
Password = <password>
Email = <email>
```

`public` schema is automatically created once the database is created. It just needs to be populated with SuperPOEM data:
```
poem-db -d -n public -f public.json
```

### TenantPOEM

Tenant metadata is:
* tenant FQDN
* superuser TenantPOEM credentials
* topology sources for GOCDB-like feed
* WEB-API read-only and CRUD tokens

#### Metadata configuration

Tenant metadata should be listed in `poem.conf` with corresponding sections:
```
[SECURITY]
AllowedHosts = poem.devel.argo.grnet.gr, egi.poem.devel.argo.grnet.gr

[GENERAL_EGI]
SamlLoginString = Login using EGI CHECK-IN
SamlServiceName = ARGO POEM EGI-CheckIN

[SUPERUSER_EGI]
Name = <username>
Password = <password>
Email = <email>

[SYNC_EGI]
UsePlainHttpAuth = False
HttpUser = xxxx
HttpPass = xxxx
ServiceType = https://goc.egi.eu/gocdbpi/private/?method=get_service_types
```

#### DB schema creation

For DB schema handling, `poem-tenant` tool is introduced. It takes two mandatory arguments, tenant name and FQDN. Tool will create DB schema for the given tenant and the Django migrations will be run effectively recreating all needed database tables needed for storing tenant data.Superuser is created by tool `poem-db`:
```sh
% poem-tenant -t EGI -d egi.poem.devel.argo.grnet.gr
[standard:egi] === Running migrate for schema egi
[standard:egi] Operations to perform:
[standard:egi]   Apply all migrations: admin, auth, contenttypes, poem, rest_framework_api_key, reversion, sessions, tenants
[standard:egi] Running migrations:
...
% poem-db -u -n egi
Superuser created successfully.
```

> DB schema name internally is always lower-cased name given to `poem-tenant` tool and in such form is provided to `poem-db` tool.

Afterward, Apache server needs to be started:
```sh
% systemctl start httpd24-httpd.service
```

Tenant POEM web application should be now served at `https://<tenant_domain_url>/`

#### Tokens

For seamless interaction with ARGO WEB-API, tokens with predefined names and values should be set. Therefore, `poem-token` tool is introduced. Naming of tokens follow this schema:
* `WEB-API-<TENANT_NAME>-RO` - read-only ARGO-WEB-API token
* `WEB-API-<TENANT_NAME>` - CRUD ARGO-WEB-API token
* `<TENANT-NAME>` - REST API queried by monitoring boxes

Usage arguments:
```
Create or set tokens for POEM REST API and store WEB-API tokens for specified tenant

positional arguments:
  {restapi,webapi}      Token management subcommands
    restapi             REST-API token management
    webapi              WEB-API token management

optional arguments:
  -h, --help            show this help message and exit
  -s SCHEMANAME         PostgreSQL schema name

```
Tokens either for WEB-API or POEM's own REST API can be created. If explicit schema name (`-s`) is not provided, WEB-API tokens always end in `public` schema while REST API tokens are stored in corresponding tenant's DB schema.

Example:
```
poem-token webapi -t egi -kw RWTOKVAL -ko ROTOKVAL
poem-token restapi -t egi -k TOKVAL
```
This will set REST API and WEB-API token for tenant `egi` to their respective values. REST API token will be named `EGI` and will be created in `egi` schema. WEB-API token will be named `WEB-API-EGI` and `WEB-API-EGI-RO` and will be created in `public` schema.

Additionally, token with arbitrary name in specified schema can be created as follows:
```
poem-token -s public restapi -n SUPER -k SUPERVALUE
```

## Development

### Container environment

Development environment is based on Docker containers and container building instructions and helper scripts are provided in `docker/` folder. Environment is implemented as multi-container Docker application that can be spawned with `docker-compose`. Prior starting application, container that will be running Django/React code needs to be built. Container that will be running PostgreSQL is pulled from Docker registry.

Building of Django/React container requires certificate to be placed as `hostcert.pem` and `hostkey.pem` in `docker/` folder. Self-signed certificate will be sufficient but be aware that syncing from GOCDB-like services will not work until you have [IGTF](https://www.igtf.net/) signed certificate.

Building of container:
```
docker/ $ docker build . -t poem-react-c7

```

> Arbitrary image name can be specified after `-t` but that should be also reflected in `docker/.env`.

Starting of multi-container application:
```
docker/ $ docker-compose up
```

### Web server

In development enviroment, application can be served via Apache web server or internal Django web server coupled with Webpack's dev server for the Hot Module Reload functionality (HMR). Helper make target rules are provided in [poem/Poem/Makefile](poem/Poem/Makefile).

#### Apache

For the Apache web serving, bundle created by the Webpack need to be manually planted as Django's staticfile everytime bundle is recreated. Webpack can monitor the changes in the React's code and recreate the bundle on the fly.

Start Webpack's watch mode:
```
make devel-watch
```

After changes are done and developer wants to see how they are reflected, he needs to place newly created bundle as Django staticfile and restart the Apache within container enviroment. For that purpose, make target rule is prepared:
```
make place-new-bundle
```

#### Django web server

Advantage of using Django's web server is that backend code can be easily debugged as developer can use debugger and breakpoints and trace the execution of code. Django web server is automatically reloaded for every change of the backend code. Webpack's bundles are automatically placed as they are picked up from `webpack-dev-server` running at `localhost:3000`. Moreover, developer can use HMR functionality as `webpack-dev-server` is able to trigger browser reload for every change in the frontend code.

Start Django web server at `0.0.0.0:8000`:
```
make devel-django-server
```

Start `webpack-dev-server` as `localhost:3000`:
```
make devel-webpack-server
```
Or use HMR:
```
make devel-webpack-server-hmr
```

### Packaging

Deployment of new versions is done with wheel packages that contain both backend Python and frontend Javascript code. Packages are build using setuptools and helper make target rules are provided in [Makefile](Makefile) and in [poem/Poem/Makefile](poem/Poem/Makefile). Latter is used to create a devel or production bundle of frontend Javascript code and place it as Django staticfiles, while the former is used to create Python wheel package.

* frontend `Makefile` package targets:
  - `make devel-bundle` - create a development Webpack bundle
  - `make prod-bundle` - create a production Webpack bundle
  - `make place-new-bundle` - place created bundle as Django staticfile
* backend `Makefile` package targets:
  - `make wheel-devel` - create date-tagged wheel package
  - `make wheel-prod` - create versioned wheel package picking up the version from `setuptools`

### Security vulnerabilities

Security vulnerabilites happens ocassionally and are more often in environments and applications built from multiple software stacks. That's the case with ARGO POEM - two software stacks needs to be maintained: Django (Python) and React (Node.js/Javascript). Therefore, helpers are introduced to timely identify and resolve security issues:
* Python `Makefile` security audit:
    - `make py-audit-view`
    - bump proposed package versions in `requirements.txt`
* Javascript `Makefile` security audit:
    - `make js-audit-view`
    - `make js-audit-fix`
Those are introduced in [poem/Poem/Makefile](poem/Poem/Makefile).
