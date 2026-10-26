#!/bin/bash
echo 'releasing development build'
#terminate all old instances
exit 0

# USER_DATA=$(<release/instance.user-data);
# #launch api server
# read -r -d '' BUD << EOM
# $USER_DATA
# aws s3 cp s3://lwp-release-store/build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz /var/lwp/latest.tar.gz
# tar -xf /var/lwp/latest.tar.gz -C /var/lwp/
# /var/lwp/release/dev/backend_build.sh
# EOM
# echo "$BUD" >> backend.user_data
# aws ec2 run-instances --launch-template LaunchTemplateId=lt-044b57b7cca69dac9 --subnet-id subnet-08c1c00a1e62de199 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=dev-api}]' --user-data file://backend.user_data

# #launch explore server and notification service
# read -r -d '' FUD << EOM
# $USER_DATA
# export NEXT_PUBLIC_GRAPHQL_END_POINT=$NEXT_PUBLIC_GRAPHQL_END_POINT;
# export NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
# export NEXT_PUBLIC_RECAPTCHA_SECRET_KEY=$NEXT_PUBLIC_RECAPTCHA_SECRET_KEY;
# aws s3 cp s3://lwp-release-store/build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz /var/lwp/latest.tar.gz
# tar -xf /var/lwp/latest.tar.gz -C /var/lwp/
# /var/lwp/release/dev/frontend_build.sh
# EOM
# echo "$FUD" >> frontend.user_data

# NO_AWS_FRONTEND disabled launch of frontend instance
#aws ec2 run-instances --launch-template LaunchTemplateId=lt-022c52a42a6af96c1 --subnet-id subnet-08c1c00a1e62de199 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=dev-explore}]' --user-data file://frontend.user_data
