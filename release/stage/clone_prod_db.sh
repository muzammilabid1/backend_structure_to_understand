#!/bin/bash
# Restores lwp-stage from the latest available prod snapshot and waits until it's available.
set -euo pipefail

REGION=eu-west-2
DB_CLASS=${STAGE_DB_CLASS:-db.m6gd.large}

SNAP=$(aws rds describe-db-snapshots --region "$REGION" --db-instance-identifier lwp-main \
    --query "reverse(sort_by(DBSnapshots[?Status=='available'], &SnapshotCreateTime))[0].DBSnapshotIdentifier" --output text)

if [ -z "$SNAP" ] || [ "$SNAP" = "None" ]; then
    echo "No available snapshot found for lwp-main"
    exit 1
fi

echo "Restoring lwp-stage from $SNAP"

aws rds restore-db-instance-from-db-snapshot --region "$REGION" \
    --db-instance-identifier lwp-stage \
    --db-snapshot-identifier "$SNAP" \
    --db-instance-class "$DB_CLASS" \
    --db-subnet-group-name db-subnet-group-prod \
    --vpc-security-group-ids sg-0e482397baa10bd8e sg-055a7a04047cc6fbf sg-04da9e9ccc2306dd2 \
    --db-parameter-group-name pg16-lwptweaks \
    --publicly-accessible \
    --no-multi-az \
    --no-deletion-protection \
    --query 'DBInstance.DBInstanceStatus' --output text

# The CLI waiter gives up after 30 minutes, so poll for up to 2 hours instead.
for i in $(seq 1 120); do
    status=$(aws rds describe-db-instances --region "$REGION" --db-instance-identifier lwp-stage \
        --query 'DBInstances[0].DBInstanceStatus' --output text)
    echo "$(date -u +%H:%M) lwp-stage: $status"
    case "$status" in
        available) exit 0 ;;
        failed | incompatible-* | inaccessible-encryption-credentials* | storage-full) exit 1 ;;
    esac
    sleep 60
done

echo "lwp-stage still not available after 2 hours"
exit 1
