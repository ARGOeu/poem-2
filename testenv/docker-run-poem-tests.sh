#!/bin/bash

test -z $1 && TAG="latest" || TAG="$1"

docker run \
--log-driver json-file \
--log-opt max-size=10m \
-v /dev/log:/dev/log \
-v /etc/localtime:/etc/localtime \
-v $HOME:/mnt/ \
-v $HOME/.ssh:/home/jenkins/.ssh/ \
-v /tmp/.X11-unix:/tmp/.X11-unix \
-v /home/daniel/my_work/srce/git.poem-react/poem-react/:/home/user/poem-react-source \
-h docker-centos7 \
--net host \
--name poem-react-tests \
--rm -ti \
poem-react-tests:$TAG
