#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"
PIDS=$(pgrep -f runserver | tr '\n' ' ')
$RUNASROOT "kill -9 $PIDS 2>/dev/null"

$RUNASROOT ". /home/pyvenv/poem/bin/activate && poem-manage runserver 0.0.0.0:8000"
