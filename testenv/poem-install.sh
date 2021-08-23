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
sudo cp -f /home/jenkins/fake-secret $VIRTUAL_ENV/etc/poem/fake-secret
sudo cp -f /home/jenkins/poem.conf $VIRTUAL_ENV/etc/poem/poem.conf


# install frontend packages
cd $VIRTUAL_ENV/lib/python3.6/site-packages/Poem
sudo rm package-lock.json
sudo npm i
