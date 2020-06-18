#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"

$RUNASROOT "supervisord"
. /home/pyenv/poem/bin/activate
/bin/zsh -c $*
