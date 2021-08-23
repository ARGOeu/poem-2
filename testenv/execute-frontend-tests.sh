#!/bin/bash

#!/bin/bash

cd $VIRTUAL_ENV/lib/python3.6/site-packages/Poem
npm test
cp -R coverage /mnt/poem-source/coverage-frontend
