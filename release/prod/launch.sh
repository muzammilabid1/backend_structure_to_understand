#!/bin/bash
# USER_DATA=$(<release/instance.user-data);

echo 'releasing production build'
exit 0
# #launch api server
# read -r -d '' BUD << EOM
# $USER_DATA
# aws s3 cp s3://lwp-release-store/build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz /var/lwp/latest.tar.gz
# tar -xf /var/lwp/latest.tar.gz -C /var/lwp/
# /var/lwp/release/prod/backend_build.sh
# EOM
# echo "$BUD" >> backend.user_data

# aws ec2 run-instances --launch-template LaunchTemplateId=lt-0cc0d4a93008b7c39 --subnet-id subnet-08ca2f8a3f7b0ab1c --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-api}]' --user-data file://backend.user_data
# ##aws ec2 run-instances --launch-template LaunchTemplateId=lt-0cc0d4a93008b7c39 --subnet-id subnet-0f9f6056aeccdbb33 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-api}]' --user-data file://backend.user_data

# #launch explore server
# read -r -d '' FUD << EOM
# $USER_DATA
# export NEXT_PUBLIC_GRAPHQL_END_POINT=$NEXT_PUBLIC_GRAPHQL_END_POINT;
# export NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
# export NEXT_PUBLIC_RECAPTCHA_SECRET_KEY=$NEXT_PUBLIC_RECAPTCHA_SECRET_KEY;
# aws s3 cp s3://lwp-release-store/build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz /var/lwp/latest.tar.gz
# tar -xf /var/lwp/latest.tar.gz -C /var/lwp/
# /var/lwp/release/prod/frontend_build.sh
# EOM
# echo "$FUD" >> frontend.user_data

# # NO_AWS_FRONTEND disabled launch of frontend instances
# #aws ec2 run-instances --launch-template LaunchTemplateId=lt-0f63ad1d45ed5cf40 --subnet-id subnet-08ca2f8a3f7b0ab1c --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-explore}]' --user-data file://frontend.user_data
# #aws ec2 run-instances --launch-template LaunchTemplateId=lt-0f63ad1d45ed5cf40 --subnet-id subnet-0f9f6056aeccdbb33 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-explore}]' --user-data file://frontend.user_data

# #launch notification system
# read -r -d '' NUD << EOM
# $USER_DATA
# aws s3 cp s3://lwp-release-store/build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz /var/lwp/latest.tar.gz
# tar -xf /var/lwp/latest.tar.gz -C /var/lwp/
# /var/lwp/release/prod/notification_build.sh
# EOM
# echo "$NUD" >> notification.user_data

# aws ec2 run-instances --launch-template LaunchTemplateId=lt-080c866f5ef224e3b --subnet-id subnet-08ca2f8a3f7b0ab1c --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=prod-notify}]' --user-data file://notification.user_data
