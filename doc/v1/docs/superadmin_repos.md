# YUM repos

## List of YUM Repos
YUM repos page is accessible from the menu on the left side. It contains list of YUM repos which contain packages which contain probes. It is shown in the image below.

![SuperAdmin YUM repos](figures/superadmin_repos.png)

## YUM Repo Details
 
YUM repos are defined for particular OS, and they can be filtered by OS tag. By clicking on the YUM repo name, user can access particular YUM repo page (shown on the image below). 

![SuperAdmin YUM repo details](figures/superadmin_repos_detail.png)

### Mandatory fields

* **Name** - name of YUM repo (**without** `.repo` file extension);
* **Tag** - tag which marks for which OS the repo is defined:
    * CentOS 6,
    * CentOS 7;
* **File content** - content of the YUM repo file;
* **Description** - short free text description, shown in the YUM repo list.
