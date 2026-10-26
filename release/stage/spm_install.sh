#!/bin/bash
cd /var/lwp

cp /var/lwp/release/lwp_spm.service /etc/systemd/system/
chmod 755 /etc/systemd/system/lwp_spm.service
systemctl daemon-reload
systemctl enable lwp_spm

echo ' ***** spm setup completed! ***** '
