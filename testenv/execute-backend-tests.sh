#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

sudo coverage run /home/pyvenv/poem/lib/python3.6/site-packages/Poem/manage.py test api
retcode="$?"

sudo coverage xml
sudo mv -f coverage.xml /mnt/poem-source/coverage-backend.xml

exit $retcode
