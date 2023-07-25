#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh
workon poem

# remove previous installation if there's one
pip3 show poem
is_installed=$(echo $?)

if [[ $is_installed -eq 0 ]]; then
    sudo pip3 uninstall -y poem
fi

# build and install wheel
cd /mnt/poem-source
sudo make clean
sudo make wheel-devel
sudo pip3 install dist/*.whl
sudo pip3 install -r requirements_tests.txt

# prerequisites
sudo cp -f /home/jenkins/fake-secret /home/pyvenv/poem/etc/poem/fake-secret
sudo cp -f /home/jenkins/poem.conf /home/pyvenv/poem/etc/poem/poem.conf

# install frontend packages
cd /mnt/poem-source/poem/Poem
sudo npm update -g npm
sudo rm package-lock.json
sudo npm config set registry https://registry.npmjs.org/
sudo npm i
