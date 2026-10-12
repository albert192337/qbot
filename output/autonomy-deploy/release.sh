#!/usr/bin/env bash
set -euo pipefail
release=$(cd -- "$(dirname -- "$0")" && pwd)
case "$release" in /root/qbot-autonomy-*) ;; *) exit 1;; esac
cd /opt/qbot-rooms
echo '13e0ad96e9194fe18198f8a37e0eb7cb668ca212b7d0fbef08d08947f58e8606  server.mjs' | sha256sum -c -
echo '48eee37109b79d4c23d03185a281c680c630b3520d68921fdfc8d615d2ce30f6  generated/garden-core.cjs' | sha256sum -c -
find . -maxdepth 1 -type f -name '*.mjs' ! -name 'server.mjs' -exec sha256sum {} + > "$release/unchanged-modules.sha256"
rollback() {
  trap - ERR
  systemctl stop qbot-rooms || true
  install -m644 "$release/server.before.mjs" /opt/qbot-rooms/server.mjs
  install -m644 "$release/core.before.cjs" /opt/qbot-rooms/generated/garden-core.cjs
  systemctl start qbot-rooms
  echo 'Release failed; restored previous code and retained current player data' >&2
  exit 1
}
trap rollback ERR
systemctl stop qbot-rooms
data_directory=$(readlink -f /var/lib/qbot-rooms)
test -d "$data_directory"
umask 077
tar -czf "$release/state-before.tgz" -C "$data_directory" .
tar -tzf "$release/state-before.tgz" >/dev/null
sha256sum "$release/state-before.tgz" > "$release/state-before.sha256"
mkdir "$release/final"
cp -aL /var/lib/qbot-rooms "$release/final/preflight-data"
node "$release/candidate/scripts/preflight-capsule-machines.mjs" "$release/final/preflight-data"
install -m644 "$release/candidate/rooms/server.mjs" /opt/qbot-rooms/server.mjs
install -m644 "$release/candidate/rooms/generated/garden-core.cjs" /opt/qbot-rooms/generated/garden-core.cjs
echo 'fd930ceba1d6317fb6e9d4c39ce7b7c50956f277fdcd4c4bfe7ac867695d4349  server.mjs' | sha256sum -c -
echo '07daee5d3752ce3958af3480f6888369ff83b8438a4d9f1bd1cc613e918adb58  generated/garden-core.cjs' | sha256sum -c -
sha256sum -c "$release/unchanged-modules.sha256"
systemctl start qbot-rooms
sleep 3
systemctl is-active --quiet qbot-rooms
trap - ERR
date --iso-8601=seconds
systemctl is-active qbot-rooms qbot-market qbot-generation
systemctl show qbot-rooms -p ActiveState -p SubState -p NRestarts -p MainPID
cat "$release/state-before.sha256"
