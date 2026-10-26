#!/bin/bash
cd /var/lwp

#setup service
cp /var/lwp/release/lwp_frontend.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_frontend.service
systemctl daemon-reload
systemctl enable lwp_frontend
systemctl start lwp_frontend

echo ' ***** frontend setup completed! ***** '
