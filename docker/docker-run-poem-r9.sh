#!/bin/bash

POEM_SOURCE="${HOME}/my_work/srce/git.poem-react/poem-react"

docker rm poem-r9; \
docker run \
--log-driver json-file \
--log-opt max-size=10m \
--name poem-r9 \
--privileged \
--net host \
--privileged \
-v "${HOME}":/mnt/ \
-v "${HOME}"/.ssh:/home/user/.ssh/ \
-v "${POEM_SOURCE}":/home/user/poem-source \
\
-h poem-r9 \
--rm -ti -v /dev/log:/dev/log poem-react-r9 /bin/zsh
