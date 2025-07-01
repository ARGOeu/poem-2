#!/bin/bash

# load virtual environment
source /etc/profile.d/venv_poem.sh

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
sudo pip3 install *.whl
sudo sh -c '. /opt/poem/bin/activate; poetry sync --with devel'

# prerequisites
sudo cp -f /home/jenkins/fake-secret /opt/poem/etc/poem/fake-secret
sudo cp -f /home/jenkins/poem.conf /opt/poem/etc/poem/poem.conf

# install frontend packages
cd /mnt/poem-source/poem/Poem
sudo npm update -g npm
sudo rm package-lock.json
sudo npm config set registry https://registry.npmjs.org/
sudo npm i
