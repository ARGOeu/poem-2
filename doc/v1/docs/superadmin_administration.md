# Administration

SuperAdmin POEM Administration page is shown on the image below.

![SuperAdmin administration](figures/superadmin_administration.png)

Administration page is only available to authenticated users with superuser status. 

## Sections

### POEM

Most pages in the first section ([tenants](superadmin_tenants.md), [YUM repos](superadmin_repos.md), [packages](superadmin_packages.md), [probes](superadmin_probe.md), [metric tags](superadmin_metric_tags.md), and [metric templates](superadmin_metric_templates.md)) are also available to all users from the menu on the left side. The exception to this is [default ports](superadmin_default_ports.md) page, which is only accessible from this page, due to the fact that default port values are very rarely updated.

### Authentication and Authorization Page

[Users](superadmin_users.md) and **API keys** pages, on the other hand, are only available through **Administration** page. Only users with superuser status may add, change or delete users, or see or revoke API keys. API keys page looks the same as the one in tenant POEMs, and is described in [documentation for tenant POEM](tenant_apikey.md).
