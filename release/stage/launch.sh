#!/bin/bash

#restore prod db
snap=$(aws rds describe-db-snapshots --db-instance-identifier lwp-main | jq -r '.DBSnapshots|sort_by(.SnapshotCreateTime)|reverse|.[0].DBSnapshotIdentifier')

# LWP-7902 - Temporarily upgrade staging db to match prod spec. Original spec was db.t4g.medium
# Line commented below for easy rollback once load testing is complete
#aws rds restore-db-instance-from-db-snapshot --db-instance-identifier 'lwp-stage' --db-snapshot-identifier $snap --db-instance-class db.t4g.medium --db-subnet-group-name db-subnet-group-prod --vpc-security-group-ids sg-0e482397baa10bd8e sg-055a7a04047cc6fbf --publicly-accessible --db-parameter-group-name pg16-lwptweaks &
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier 'lwp-stage' --db-snapshot-identifier $snap --db-instance-class db.m6gd.large --db-subnet-group-name db-subnet-group-prod --vpc-security-group-ids sg-0e482397baa10bd8e sg-055a7a04047cc6fbf sg-04da9e9ccc2306dd2 --publicly-accessible --db-parameter-group-name pg16-lwptweaks &
# S3_LOCATION="bucket=lwp-release-store,key=build_${LWP_BUILD_TYPE}_${CODEBUILD_BUILD_NUMBER}.tar.gz,bundleType=tgz"

# aws deploy register-application-revision \
#     --application-name LwP-Explore \
#     --s3-location $S3_LOCATION

# aws deploy create-deployment \
#     --application-name LwP-Explore \
#     --deployment-group-name stage-backend \
#     --revision revisionType=S3,s3Location={$S3_LOCATION}

# aws deploy create-deployment \
#     --application-name LwP-Explore \
#     --deployment-group-name stage-notification \
#     --revision revisionType=S3,s3Location={$S3_LOCATION}

exit 0