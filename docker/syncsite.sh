#!/bin/bash

SITEPACK=$(python -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())")

printf "**** sync sitepkg64\n"
rsync -avz --exclude='*node_modules*' $(echo $SITEPACK/ | sed "s/lib\//lib64\//" ) /root/pysitepkg/sitepkg64

printf "**** sync sitepkg32\n"
rsync -avz --exclude='*node_modules*' $SITEPACK/ /root/pysitepkg/sitepkg32
