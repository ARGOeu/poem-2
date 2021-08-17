#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

sudo coverage run /home/pyvenv/poem/lib/python3.6/site-packages/Poem/manage.py test api
sudo coverage xml

mv -f coverage.xml /mnt/poem-source/coverage-backend.xml
