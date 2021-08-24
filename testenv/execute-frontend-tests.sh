#!/bin/bash

#!/bin/bash

cd /mnt/poem-source/poem/Poem
sudo npm test
sudo cp coverage/cobertura-coverage.xml /mnt/poem-source/cobertura-coverage.xml
