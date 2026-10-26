#!/bin/bash
cd /var/lwp

cp /var/lwp/release/lwp_analytics.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_analytics.service
systemctl daemon-reload
systemctl enable lwp_analytics

echo ' ***** analytics setup completed! ***** '
