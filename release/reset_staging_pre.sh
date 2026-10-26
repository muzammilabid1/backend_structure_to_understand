#/bin/bash

echo "Deleting staging DB instance"
echo

aws rds --region=eu-west-2 delete-db-instance --db-instance-identifier lwp-stage --skip-final-snapshot --output text > /dev/null 2>&1

echo
echo -n "Waiting for deletion"

while aws rds --region=eu-west-2 describe-db-instances --db-instance-identifier=lwp-stage > /dev/null 2>&1
do
  echo -n '.'
  sleep 10
done

echo

