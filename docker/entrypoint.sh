#!/bin/bash

VENV=/opt/poem/
RUNASROOT="su -m -s /bin/bash root -c"

$RUNASROOT "supervisord -nc /etc/supervisord.conf"
. $VENV/bin/activate
/bin/zsh -c $*
