#!/bin/bash
deployment_group=(${DEPLOYMENT_GROUP_NAME//-/ })

systemctl start lwp_${deployment_group[1]}

cd /var/lwp
./release/codedeploy_restart.sh > /dev/null 2> /dev/null < /dev/null &
exit 0