#!/bin/bash
cd /var/lwp

apt install -y jq

source ./release/db.env
cd graphql-provider
yarn typeorm:up
cd ..

#setup api and frontend
cp /var/lwp/release/lwp_{notification,frontend}.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_{notification,frontend}.service
systemctl daemon-reload
systemctl enable --now lwp_{notification,frontend}

echo ' ***** backend setup completed! ***** '
