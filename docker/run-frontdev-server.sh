#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"
PIDS=$(pgrep -f webpack | tr '\n' ' ')
$RUNASROOT "kill -9 $PIDS 2>/dev/null"

cd /home/user/frontend; node_modules/.bin/webpack-dev-server --config webpack.devserver.config.js --progress $*
