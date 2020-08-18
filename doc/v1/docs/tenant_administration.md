# Administration

Tenant POEM administration page is shown in the image below.

![Tenant Administration](figures/tenant_administration.png)

## Sections

### POEM

First section are links to component pages users are allowed to modify. They are all also accessible from the menu of the left side.

### Authentication and authorization

Second section, **Authentication and authorization**, is only available through Administration page, and therefore, only superusers can modify them.

### SuperAdmin POEM data

Third section, **SuperAdmin POEM data**, are pages of read-only resources. They are set up through SuperAdmin POEM UI, and tenant users are not allowed to modify them. 

Through [metric template page](tenant_metric_templates.md), users can import metrics. Through [package page](tenant_packages.md), users can change versions of packages they use, and metrics will be automatically updated to use the probes provided by the chosen package version.

### APIKey Permissions

In fourth section, **APIKey Permissions**, users are able to see API keys for tenant.
