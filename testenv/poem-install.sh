#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

# build and install wheel
cd /mnt/poem-source
sudo make clean
sudo make wheel-devel
sudo pip3 install dist/*.whl
sudo pip3 install -r requirements.txt
sudo pip3 install -r requirements_tests.txt

# prerequisites
sudo cp -f /home/jenkins/secret_key $VIRTUAL_ENV/etc/poem/secret_key
sudo cp -f /home/jenkins/poem.conf $VIRTUAL_ENV/etc/poem/poem.conf
