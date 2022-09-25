#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"
$RUNASROOT "kill -9 `pgrep -f runserver` >/dev/null"

$RUNASROOT ". /home/pyvenv/poem/bin/activate && poem-manage runserver 0.0.0.0:8000"
