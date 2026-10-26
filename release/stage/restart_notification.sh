#!/bin/bash
# Runs migrations on the staging notification server and restarts it, using the build already there.
set -euo pipefail

REGION=eu-west-2

INSTANCE=$(aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Name,Values=stage-notify" "Name=tag:ActiveForDeployment,Values=true" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text)

if [ "$(echo "$INSTANCE" | wc -w)" -ne 1 ]; then
    echo "Expected one running stage-notify instance, found: '$INSTANCE'"
    exit 1
fi

ID=$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
    --document-name AWS-RunShellScript --comment "Daily staging DB reset" \
    --parameters '{"commands":["set -e","export HOME=/root","systemctl stop lwp_notification","cd /var/lwp",". ./release/db.env","cd graphql-provider","yarn typeorm:up","systemctl start lwp_notification"],"executionTimeout":["1800"]}' \
    --query Command.CommandId --output text)

echo "$INSTANCE: running migrations and restart as $ID"

print_output() {
    aws ssm get-command-invocation --region "$REGION" --command-id "$ID" --instance-id "$INSTANCE" \
        --query '[StandardOutputContent, StandardErrorContent]' --output text
}

for i in $(seq 1 62); do
    sleep 30
    status=$(aws ssm get-command-invocation --region "$REGION" --command-id "$ID" --instance-id "$INSTANCE" \
        --query Status --output text 2>/dev/null || echo Pending)
    echo "$(date -u +%H:%M) $status"
    case "$status" in
        Success) print_output; exit 0 ;;
        Failed | Cancelled | TimedOut) print_output; exit 1 ;;
    esac
done

echo "Migrations and restart did not finish within 30 minutes"
exit 1
