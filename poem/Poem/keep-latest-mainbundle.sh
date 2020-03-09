#!/bin/sh

latest=$(ls -t1 frontend/bundles/reactbundle/main* | head -n1)

for f in frontend/bundles/reactbundle/main*;
do
	if [[ $f != $latest ]]
	then
		rm -f $f
	fi
done
