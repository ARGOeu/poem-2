---
title: POEM service for ARGO framework
page_title: POEM service for ARGO framework
font_title: 'fa fa-check-square-o'
description: This document describes the POEM service for ARGO framework.
---

## Changes

POEM for ARGO supports CentOS 6, it is reduced, simplified, easier to deploy and maintain and is much more lightweight than previous versions. Key components that were either dumped or substituted:

- MySQL, Oracle: it is replaced with a much more lightweight SQLite
- ATP bridge: since ATP is gone, POEM now syncs data from GOCDB and Operations portal
- poem-sync: removed which led to great simplification of DB model

## Configuration

### Database 

Prior any work, database needs to be created. Provided script do that for you and *need to be executed as root immediately* after an installation.

`poem-createdb` - create all necessary database models and POEM superuser account for managing and delegating other cert-authenticated users to handle profiles.

**Examples**

    [root@vcl-0-100 ~]# poem-createdb
    Creating tables ...
    Creating table auth_permission
    Creating table auth_group_permissions
    Creating table auth_group
    Creating table auth_user_user_permissions
    Creating table auth_user_groups
    Creating table auth_user
    Creating table django_content_type
    Creating table django_session
    Creating table django_admin_log
    Creating table poem_userprofile
    Creating table poem_vo
    Creating table poem_serviceflavour
    Creating table poem_profile
    Creating table poem_metricinstance
    
    You just installed Django's auth system, which means you don't have any
    superusers defined.
    Would you like to create one now? (yes/no): yes
    Username (leave blank to use 'apache'): dvrcic
    E-mail address: dvrcic@srce.hr
    Password:
    Password (again):
    Superuser created successfully.
    Installing custom SQL ...
    Installing indexes ...
    Installed 0 object(s) from 0 fixture(s)

POEM superuser account can be automatically created so poem-createdb script doesn't need to be necessarily interactive, but superuser credentials then must be provided in the config file.

    [general]
    SUPERUSER_NAME: dvrcic
    SUPERUSER_PASSWORD: testbed
    SUPERUSER_EMAIL: dvrcic@srce.hr

There are no config options related to database, it's just a file with appropriate permissions placed into:

`/var/lib/poem/poemserv.db`

### Profiles import

`poem-importprofiles` - can import all profiles like ROC, ROC_CRITICAL, ROC_OPERATORS and GLEXEC from another POEM instance. If POEM instance is not specified at command line, then central one will be used (`mon.egi.eu`)

**Examples**

    [root@vcl-0-100 ~]# poem-importprofiles
    Usage: poem-importprofiles [-i] [-url <URL>] PROFILE1 PROFILE2 ...
           [-i] - Only import profiles if poem database is empty
           [-u <URL>] - URL containing JSON encoded list of profiles
           PROFILE1 PROFILE2 - space separated list of profiles
    
    [root@vcl-0-100 ~]# poem-importprofiles ROC ROC_CRITICAL ROC_OPERATORS GLEXEC
    2014-12-02 14:14:56,257 - POEM - INFO - Running synchronizer for POEM sync
    2014-12-02 14:14:57,325 - POEM - INFO - Synchronized profile ROC 1.0 ops
    2014-12-02 14:14:57,666 - POEM - INFO - Running synchronizer for POEM sync
    2014-12-02 14:14:58,285 - POEM - INFO - Synchronized profile ROC_CRITICAL 1.0 ops
    2014-12-02 14:14:58,644 - POEM - INFO - Running synchronizer for POEM sync
    2014-12-02 14:14:59,551 - POEM - INFO - Synchronized profile ROC_OPERATORS 1.0 ops
    2014-12-02 14:14:59,910 - POEM - INFO - Running synchronizer for POEM sync
    2014-12-02 14:15:00,674 - POEM - INFO - Synchronized profile GLEXEC 1.0 ops

### Autocompletion of VO and Service Flavours fields in Web UI 

Data is synced from Operations Portal and GOCDB, respectively, with the help of two provided scripts:

`poem-syncvo`, `poem-syncservtype` - scripts need to be executed as root immediately after an installation. Subsequent syncs from both sources are executed every hour as a part of a cron job.

**Examples:**


    [root@vcl-0-100 ~]# poem-syncvo
    2014-12-02 14:17:27,629 - POEM - INFO - Added 216 VO
    [root@vcl-0-100 ~]# poem-syncservtype
    2014-12-02 14:17:50,333 - POEM - INFO - Added 111 service flavours

There are a new config file options introduced:


    GOCDB_SERVICETYPE_URL: https://goc.egi.eu/gocdbpi/private/?method=get_service_types
    CIC_VO_URL: http://operations-portal.egi.eu/xml/voIDCard/public/all/true
    HOST_CERT = /etc/grid-security/hostcert.pem
    HOST_KEY = /etc/grid-security/hostkey.pem

Certificate is needed for access to GOCDB feed.

## REST API

POEM exposes it's data to NCG and ARGO/ar-sync components via two available APIes:

**NCG**: `/api/0.2/json/profiles/`

Returned fields are all available profiles with associated service types and metrics. Some fields like valid_to, valid_from, groups and extensions are kept because of transition period in which poem-sync will still be lurking around. For the same reason, name of fields like atp_vo and atp_service_type_flavour are not changed, although ATP is removed. 

**Example:**

    {
        "name": "GLEXEC",
        "atp_vo": "ops",
        "version": "1.0",
        "owner": "/C=HR/O=edu/OU=srce/CN=Daniel Vrcic",
        "description": "test-dn",
        "metric_instances": 
        [
            {
                "metric": "emi.cream.glexec.CREAMCE-JobSubmit",
                "fqan": "/ops/Role=pilot",
                "vo": "ops",
                "atp_service_flavour": "gLExec"
            },
            {
                "metric": "emi.cream.glexec.WN-gLExec",
                "fqan": "/ops/Role=pilot",
                "vo": "ops",
                "atp_service_flavour": "gLExec"
            }
        ]
    }

**ARGO**: `/api/0.2/json/metrics_in_profiles/?vo_name=VO[&profile_name=PROFILE]`

- mandatory args - vo_name=VO
- optional args - profile_name=PROFILE


Returned fields are a list of all available metrics across all profiles for a specified VO. List can be further filtered for a specific profile name.

**Examples**:

    {
        "name": "ops",
        "profiles": [
            {
                "namespace": "CH.CERN.SAM",
                "name": "ROC_OPERATORS",
                "description": "The main profile that contains Operations tests."
                "metrics": [
                    {
                        "service_flavour": "APEL",
                        "fqan": "",
                        "name": "org.apel.APEL-Pub",
                    },
                    {
                        "service_flavour": "ARC-CE",
                        "fqan": "",
                        "name": "org.nordugrid.ARC-CE-ARIS",
                    },
                ],
            },
        ]
    }

## Things to consider for future

- handle a DB schema update - Django-South
- bootstrap theme

