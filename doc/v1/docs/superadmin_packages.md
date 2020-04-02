# Packages

Packages are `.rpm` packages which provide probes. 

## List of Packages

The page is accessible from the menu on the left side. It is shown in the image below.

![SuperAdmin packages](figures/superadmin_packages.png)

Packages can be filtered by choosing repo name from the drop down menu in **Repo** column, and by name by typing values in search bar on top of **Name and version** column. 

## Package Details

Page of each individual package is accessible by clicking name of package. The example page is shown in the image below.

![SuperAdmin Package Detail](figures/superadmin_package_details.png)

### Mandatory fields

* **Name** - name of package (as defined in `.rpm` file);
* **Version** - version of package (as defined in `.rpm` file);
* **YUM repo** - **at least one** YUM repo must be defined; YUM repo which provides the given package:
    * **CentOS 6 repo** - repo tagged with CentOS 6 tag,
    * **CentOS 7 repo** - repo tagged with CentOS 7 tag.
    
### `Use version which is present in repo` Checkbox

If **Use version which is present in repo** is checked, package version is going to be tagged as present, and the version which exists in the repo is going to be installed on the monitoring box.


### List of Probes Provided by the Package

At the bottom of the page is shown the list of probes which are provided by the package and are defined in POEM.    
