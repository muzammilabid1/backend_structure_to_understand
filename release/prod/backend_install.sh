#!/bin/bash
cd /var/lwp

#setup service
cp /var/lwp/release/lwp_backend.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_backend.service
systemctl daemon-reload
systemctl enable lwp_backend

echo ' ***** backend setup completed! ***** '
