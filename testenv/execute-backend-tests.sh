#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

cd /mnt/poem-source/

sudo coverage run --source='.' /home/pyvenv/poem/lib/python3.6/site-packages/Poem/manage.py test api
sudo coverage xml
