#!/bin/bash

RUNASROOT="su -m -s /bin/bash root -c"

$RUNASROOT 'scl enable httpd24 "killall httpd; sleep 2; httpd"'
