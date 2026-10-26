#!/bin/bash
cd /var/lwp

source ./release/db.env
cd graphql-provider
yarn typeorm:up || exit 1
cd ..

#setup notification service
cp /var/lwp/release/lwp_notification.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_notification.service
systemctl daemon-reload
systemctl enable lwp_notification

echo ' ***** notification setup completed! ***** '
