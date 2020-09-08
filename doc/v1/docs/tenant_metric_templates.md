# Metric templates

## List of metric templates

Metric templates page is only accessible through [Administration](tenant_administration.md) page. It is used for importing metrics from metric templates, and only superusers have necessary permissions to perform metric imports. The page is shown in image below.

![Tenant Metric templates](figures/tenant_metric_templates.png)

The list shows all the available metric templates defined in POEM. User can select metric templates by clicking the checkbox next to their names, or select all metric templates by checking **Select all** checkbox. 

Metric templates can then further be filtered by probe, type (active or passive), and tag.

Note that when metric templates are filtered by any condition, **Select all** checkbox selects only the filtered metric templates. For example, if the user filters metric templates by probe, say `check_http`, and (s)he checks **Select all**, metric templates associated to `check_http` probe are going to be selected.

Once the user selects all the metric templates (s)he wants to import as metrics, (s)he should press **Import** button. The user will then be notified if the import has been successful. The example in the image below shows the success and warning notification.

![Tenant Metric Templates Notification](figures/tenant_metric_templates_notification.png)
