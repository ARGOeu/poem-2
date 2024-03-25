# SuperAdmin POEM guide

## Adding users
**Step 1:** Go to [Administration page](superadmin_administration.md).

**Step 2:** Select **Users** in **Authentication and Authorization** section.

**Step 3:** Click the `Add` button in [users page](superadmin_users.md#list-of-users).

**Step 4:** Fill in the necessary fields before hitting `Save` button. The fields are described in [users documentation](superadmin_users.md#user-details).

## Adding YUM repo
**Step 1:** Go to [YUM repos page](superadmin_repos.md).

**Step 2:** Click the `Add` button.

**Step 3:** Fill in the necessary data. The fields are described in [YUM repo documentation](superadmin_repos.md#fields).

## Adding package
**Step 1:** Make sure the YUM repo containing the package you wish to enter already exists in POEM (it should be listed in [YUM repo page](superadmin_repos.md#list-of-yum-repos)). 

* YUM repo exists: continue to **Step 2**;
* YUM repo does not exist: follow the steps described in [Adding YUM Repo section](#adding-yum-repo).

**Step 2:** Go to [package page](superadmin_packages.md#list-of-packages).

**Step 3:** Click the `Add` button.

**Step 4:** Fill in the form with appropriate data. Fields are described in [package documentation page](superadmin_packages.md#fields).

## Adding probe
**Step 1:** Make sure the package containing the probe you wish to enter already exists in POEM (it should be listed in [package page](superadmin_packages.md#list-of-packages)).

* Package exists: continue to **Step 2**,
* package does not exist: follow the steps described in [Adding package section](#adding-package).

**Step 2:** Go to [probe page](superadmin_probe.md#list-of-probes).

**Step 3:** Click the `Add` button.

**Step 4:** Fill in the form with appropriate data. Fields are described in [probe documentation](superadmin_probe.md#fields).

## Adding metric template
**Step 1:** If it is an active metric template, make sure the probe it uses already exists in POEM (it should be listed in [probe page](superadmin_probe.md#list-of-probes)).

* Probe exists: continue to **Step 2**,
* probe does not exist: follow the steps described in [Adding probe section](#adding-probe).

**Step 2:** Go to [metric templates page](superadmin_metric_templates.md#list-of-metric-templates).

**Step 3:** Click the `Add` button.

**Step 4:** Fill in the form with appropriate data. Fields are described in [metric template documentation](superadmin_metric_templates.md#field-descriptions).
