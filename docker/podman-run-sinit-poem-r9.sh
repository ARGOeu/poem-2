#!/bin/bash

test -z $1 && TAG="latest" || TAG="$1"

podman run \
--security-opt label=disable \
--userns=keep-id \
-e "DISPLAY=unix$DISPLAY" \
--log-driver k8s-file \
--log-opt max-size=10m \
-v /dev/log:/dev/log \
-v /etc/localtime:/etc/localtime \
-v $HOME:/mnt \
-v $HOME/.ssh:/home/user/.ssh \
-v /tmp/.X11-unix:/tmp/.X11-unix:ro,z \
-v $HOME/.zsh_history:/home/user/.zsh_history:z \
-h poem-r9 \
--net host \
--name poem-r9 \
-u root \
--rm -ti \
localhost/poem-react-r9-systemd:$TAG
