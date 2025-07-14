#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh

cd /opt/poem/lib/python3.9/site-packages/Poem/
sudo coverage run --source='.' manage.py test api --parallel
retcode="$?"

sudo coverage report
sudo coverage xml
sudo mv -f coverage.xml /mnt/poem-source/coverage-backend.xml
sudo mv -f junit-backend.xml /mnt/poem-source/

exit $retcode
