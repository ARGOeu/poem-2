#!/bin/bash

# directory with cloned Github branch code
cd ${1}

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

pip3 install -r requirements.txt
pip3 install -r requirements_tests.txt
python setup.py egg_info --tag-date sdist bdist_wheel
pip3 install dist/*

# prerequisites
SITEPACK=$(python -c 'from distutils.sysconfig import get_python_lib; print(get_python_lib())')
cp /root/secret_key $VIRTUAL_ENV/etc/poem/secret_key
cp -f /root/poem.conf $VIRTUAL_ENV/etc/poem/poem.conf
chown -R apache:apache $VIRTUAL_ENV
cd $SITEPACK/Poem
cp /root/settings.py .
poem-db -c
ln -f -s $VIRTUAL_ENV/etc/httpd/conf.d/poem.conf /opt/rh/httpd24/root/etc/httpd/conf.d/
ln -f -s $VIRTUAL_ENV/etc/cron.d/poem-clearsessions /etc/cron.d/
ln -f -s $VIRTUAL_ENV/etc/cron.d/poem-syncvosf /etc/cron.d/
