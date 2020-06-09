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

#### Complete list of packages used to built web service

Backend:
* `Django`
* `django-rest-auth`
* `django-tenant-schemas`
* `django-webpack-loader`
* `djangorestframework`
* `djangorestframework-api-key`
* `djangosaml2`
* `psycopg2-binary`

Frontend:
* `ReactJS`
* `formik`
* `react-autocomplete`
* `react-diff-viewer`
* `react-dom`
* `react-fontawesome`
* `react-notifications`
* `react-popup`
* `react-router`
* `react-table`
* `reactstrap`
* `webpack`
* `yup`

## Installation

POEM web service is meant to be running with Django 2.x driven by Python 3.x on CentOS 7 and served by installation of Apache from Software Collections. Setting up Python virtual environment based on Python 3.x is prerequisite. Once the virtual environment is set up, installation of the service simply narrows down to creating and installing wheel package that will also pull and install all needed dependencies. Beside wheel dependencies, service also needs some packages to be installed from CentOS 7 repositories:

```sh
% yum -y install ca-certificates \
		git which \
		xmlsec1 xmlsec1-openssl
```

Layout of POEM web service files on the filesystem depends on the location of virtual environment. By the default, service assumes it is:

```sh
VENV = /home/pyvenv/poem/
```

| File Types								    | Destination                                                               |
|------------------------------ |---------------------------------------------------------------------------|
| Configuration - General		    | `VENV/etc/poem/poem.conf`                                                 |
| Configuration - Logging		    | `VENV/etc/poem/poem_logging.conf`                                         |
| Configuration - Apache		    | `/opt/rh/httpd24/root/etc/httpd/conf.d/`                                  |
| Cron jobs									    | `/etc/cron.d/poem-clearsessions, poem-sync, poem-db_backup`               |
| Logrotate 								    | `/etc/logrotate.d/poem-db_backup`                                         |
| Database handler					    | `VENV/bin/poem-db`                                                        |
| Sync (Service, Service types) | `VENV/bin/poem-syncservtype, poem-syncservices, poem-syncmetricinstances` |
| Security key generator        | `VENV/bin/poem-genseckey`                                                 |
| Token set/create 					    | `VENV/bin/poem-token`                                                     |
| Tenant management					    | `VENV/bin/poem-tenant`                                                    |
| Django `manage.py` wrapper    | `VENV/bin/poem-manage`                                                    |
| Static data served by Apache  | `VENV/usr/share/poem/`                                                    |
| Main application code         | `VENV/lib/python3.6/site-packages/Poem/`                                  |
| Log file                      | `VENV/var/log/poem`                                                       |
| DB backups                    | `VENV/var/db_backups/`                                                    |

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

### GENERAL_<tenant_name>

    [GENERAL_EGI]
    Namespace = hr.cro-ngi.TEST
    SamlLoginString = Log in using EGI CHECK-IN
    SamlServiceName = ARGO POEM EGI-CheckIN

* `Namespace` defines the identifier that will be prepended to every Profile
* `SamlLoginString` defines the text presented on the SAML2 button of login page
* `SamlServiceName` defines service name in SAML2 configuration

### SUPERUSER_<tenant_name>

Initial superuser credentials that can be used to sign in to POEM with username and password.

    [SUPERUSER_EGI]
    Name = test
    Password = test
    Email = test@foo.baar

> It is **important** to note that these options should be specified with correct values **before** trying to create a superuser in database for the given tenant.

### SYNC_<tenant_name>

These control options are used by sync scripts that fetch all available services types from GOCDB-like service and Virtual organizations from Operations portal. Additionally, if GOCDB-like service supports only Basic HTTP Authentication, it should be enabled by setting `UsePlainHttpAuth` and specifying credentials in `HttpUser` and `HttpPass`.

    [SYNC_EGI]
    UsePlainHttpAuth = False
    HttpUser = xxxx
    HttpPass = xxxx
    ServiceType = https://goc.egi.eu/gocdbpi/private/?method=get_service_types
    Services = https://eosc-hub-devel.agora.grnet.gr/api/v2/service-types/

### Creating database and starting the service

Prerequisites for creating the empty database are:
1) PostgreSQL DB server running on `Host`, listening on `Port` and accepting `User` and `Password`
2) `[SUPERUSER_<tenant_name>]` section is set with desired credentials
3) `SECRET_KEY` is generated and placed in `$VIRTUAL_ENV/etc/poem/secret_key`
4) `$VIRTUAL_ENV` has permissions set to `apache:apache`
5) `poem.conf` Apache configuration is presented in `/opt/rh/httpd24/root/etc/httpd/conf.d/`

Once all is set, database can be created with provided tool `poem-db`. First, a tenant should be created for the `public` schema in the database, and migrations for public schema are run by calling `poem-db -c`:

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

Next step is creation of tenants by calling `poem-tenant` tool. The script takes two mandatory arguments, tenant name and hostname (called `domain_url` in database). Script will create schema in the database for the given tenant, and the migrations will be run. Also, data is imported for the `poem_tags` table in the new schema. Superuser is created by calling tool `poem-db -u -n <schema_name>`:
```sh
% poem-tenant -t EGI -d egi-ui.argo.grnet.gr
[standard:egi] === Running migrate for schema egi
[standard:egi] Operations to perform:
[standard:egi]   Apply all migrations: admin, auth, contenttypes, poem, rest_framework_api_key, reversion, sessions, tenants
[standard:egi] Running migrations:
...
% poem-db -u -n egi
Superuser created successfully.
```

Afterward, Apache server needs to be started:
```sh
% systemctl start httpd24-httpd.service
```

POEM web application should be now served at `https://<tenant_domain_url>/poem`

### Loading data from .json file
There is also possibility to load data for tenant from .json file:
```sh
poem-db -d -n egi -f /path/to/file.json
```
> In case that the data is to be loaded from .json file, super user **should not** be created beforehand.
