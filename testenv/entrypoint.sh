#!/bin/bash

VENV=/opt/poem/
RUNASROOT="su -m -s /bin/bash root -c"

$RUNASROOT "supervisord"
. $VENV/bin/activate
/bin/bash -c $*
