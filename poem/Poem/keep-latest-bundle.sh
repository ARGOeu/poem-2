#!/bin/sh

latest=$(ls -t1 frontend/bundles/reactbundle/main*.js | head -n1)

for f in frontend/bundles/reactbundle/main*.js;
do
	if [[ $f != $latest ]]
	then
		rm -f $f
	fi
done

latest=$(ls -t1 frontend/bundles/reactbundle/vendors*.js | head -n1)

for f in frontend/bundles/reactbundle/vendors*.js;
do
	if [[ $f != $latest ]]
	then
		rm -f $f
	fi
done

latest=$(ls -t1 frontend/bundles/reactbundle/runtime*.js | head -n1)

for f in frontend/bundles/reactbundle/runtime*.js;
do
	if [[ $f != $latest ]]
	then
		rm -f $f
	fi
done
