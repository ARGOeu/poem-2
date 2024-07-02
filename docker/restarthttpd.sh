#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"

$RUNASROOT 'killall httpd; sleep 2; httpd'
