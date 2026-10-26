#!/bin/bash

deployment_group=(${DEPLOYMENT_GROUP_NAME//-/ })

cd /var/lwp
./release/${deployment_group[0]}/${deployment_group[1]}_install.sh;