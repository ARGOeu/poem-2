#!/bin/bash

. /opt/poem/bin/activate
rm -rf $VIRTUAL_ENV/usr/share/poem/static/reactbundle/* ; \
python $VIRTUAL_ENV/lib/python3.12/site-packages/Poem/manage.py collectstatic --noinput ; \
rm -rf $VIRTUAL_ENV/usr/share/poem/static/admin
