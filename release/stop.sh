#!/bin/bash
deployment_group=(${DEPLOYMENT_GROUP_NAME//-/ })
service="lwp_${deployment_group[1]}"

systemctl is-active $service && systemctl stop $service