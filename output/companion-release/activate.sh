#!/bin/bash
set -Eeuo pipefail
stage=/opt/qbot-rooms-companions-20260925-215826
old=/opt/qbot-rooms-pre-companions-20260925-215826
backup=/root/qbot-rooms-backup-companions-20260925-215826
drop=/etc/systemd/system/qbot-rooms.service.d/70-companions.conf
test -d "$stage" && test ! -e "$old" && test ! -e "$drop"
mkdir -m 700 "$backup"
cp /etc/systemd/system/qbot-rooms.service "$backup/service-unit"
if [ -d /etc/systemd/system/qbot-rooms.service.d ]; then cp -a /etc/systemd/system/qbot-rooms.service.d "$backup/drop-ins"; fi
rollback() {
  trap - ERR
  systemctl stop qbot-rooms || true
  if [ -d "$old" ]; then
    if [ -d /opt/qbot-rooms ]; then mv /opt/qbot-rooms /opt/qbot-rooms-failed-companions-20260925-215826; fi
    mv "$old" /opt/qbot-rooms
  fi
  if [ -f "$drop" ]; then rm "$drop"; fi
  systemctl daemon-reload
  systemctl start qbot-rooms
  echo 'ROLLED_BACK_CODE_ONLY; current player data retained'
  exit 1
}
trap rollback ERR
systemctl stop qbot-rooms
tar czf "$backup/data.tgz" -C /var/lib/qbot-rooms .
chmod 600 "$backup/data.tgz"
tar tzf "$backup/data.tgz" > /dev/null
mv /opt/qbot-rooms "$old"
mv "$stage" /opt/qbot-rooms
mkdir -p /etc/systemd/system/qbot-rooms.service.d
printf '[Service]\nEnvironment=QBOT_COMPANIONS=1\nEnvironment=QBOT_COMPANION_MARKET_DIR=/opt/qbot-rooms/market-assets\n' > "$drop"
systemctl daemon-reload
systemctl start qbot-rooms
sleep 3
systemctl is-active --quiet qbot-rooms
node /opt/qbot-rooms/verify-companions-online.mjs ws://127.0.0.1:24252 > "$backup/verification.json"
trap - ERR
echo 'DEPLOYED'
cat "$backup/verification.json"
systemctl show qbot-rooms -p ActiveState -p NRestarts -p MainPID
systemctl is-active qbot-market qbot-generation
sha256sum "$backup/data.tgz"
