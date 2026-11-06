#!/usr/bin/env bash
set -euo pipefail
(( EUID == 0 )) || { echo 'Run this installer with sudo on nrec-rctf.' >&2; exit 1; }
source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
[[ -f /srv/rctf-data/platform/WHFD/compose.nrec.yml ]] || { echo 'NREC deployment not found.' >&2; exit 1; }
if [[ -e /usr/local/bin/rctf || -L /usr/local/bin/rctf ]]; then
  [[ $(readlink -f /usr/local/bin/rctf) == /usr/local/lib/rctf-tools/rctf ]] || {
    echo 'Refusing to overwrite an unrelated /usr/local/bin/rctf.' >&2; exit 1;
  }
fi
if [[ -e /usr/local/bin/rctfscript || -L /usr/local/bin/rctfscript ]]; then
  [[ $(readlink -f /usr/local/bin/rctfscript) == /usr/local/lib/rctf-tools/rctfscript ]] || {
    echo 'Refusing to overwrite an unrelated /usr/local/bin/rctfscript.' >&2; exit 1;
  }
fi
for tool in docker curl tar flock python3 nginx; do command -v "$tool" >/dev/null; done
exec 9>/run/lock/rctf-tools-restart.lock
flock -n 9 || { echo 'Another restart or installation is running.' >&2; exit 1; }
umask 077
install -d -m 700 /var/backups/rctf-tools
saved=$(mktemp -d "/var/backups/rctf-tools/install-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
if [[ -d /usr/local/lib/rctf-tools ]]; then cp -a /usr/local/lib/rctf-tools "$saved/lib"; fi
config_paths=(/etc/nginx/sites-available/whfd.conf /etc/nginx/snippets/rctf-upstream.conf /etc/rctf-tools/bluegreen.yml /etc/systemd/system/whfd-platform.service.d/bluegreen.conf)
for path in "${config_paths[@]}"; do
  if [[ -f "$path" ]]; then cp -a --parents "$path" "$saved"; fi
done
cleanup() {
  local code=$?
  trap - EXIT
  if (( code != 0 )); then
    for path in "${config_paths[@]}"; do
      if [[ -f "$saved$path" ]]; then cp -a "$saved$path" "$path"; else rm -f "$path"; fi
    done
    if [[ -d "$saved/lib" ]]; then cp -a "$saved/lib/." /usr/local/lib/rctf-tools/; fi
    systemctl daemon-reload || true
    if nginx -t; then systemctl reload nginx || true; fi
    echo "Installation failed; previous configuration restored from $saved." >&2
  fi
  exit "$code"
}
trap cleanup EXIT
install -d -m 755 /usr/local/lib/rctf-tools /usr/local/share/doc/rctf-tools
install -m 755 "$source_dir/rctf" /usr/local/lib/rctf-tools/rctf
install -m 755 "$source_dir/rctfscript" /usr/local/lib/rctf-tools/rctfscript
install -m 755 "$source_dir/bluegreen.sh" /usr/local/lib/rctf-tools/bluegreen.sh
install -m 644 "$source_dir/common.sh" /usr/local/lib/rctf-tools/common.sh
install -m 644 "$source_dir/api-user.mjs" /usr/local/lib/rctf-tools/api-user.mjs
install -m 755 "$source_dir/deleteflagsubmissions" /usr/local/lib/rctf-tools/deleteflagsubmissions
install -m 644 "$source_dir/reset-competition.sql" /usr/local/lib/rctf-tools/reset-competition.sql
install -m 644 "$source_dir/reset-redis.py" /usr/local/lib/rctf-tools/reset-redis.py
install -m 644 "$source_dir/deleteflagsubmissions.md" /usr/local/share/doc/rctf-tools/deleteflagsubmissions.md
if [[ -e /usr/local/bin/deleteflagsubmissions || -L /usr/local/bin/deleteflagsubmissions ]]; then
  cp -a --parents /usr/local/bin/deleteflagsubmissions "$saved"
fi
ln -sfn /usr/local/lib/rctf-tools/deleteflagsubmissions /usr/local/bin/deleteflagsubmissions
install -m 644 "$source_dir/README.md" /usr/local/share/doc/rctf-tools/README.md
ln -sfn /usr/local/lib/rctf-tools/rctf /usr/local/bin/rctf
if [[ -e /usr/local/bin/rctfscript || -L /usr/local/bin/rctfscript ]]; then
  cp -a --parents /usr/local/bin/rctfscript "$saved"
fi
ln -sfn /usr/local/lib/rctf-tools/rctfscript /usr/local/bin/rctfscript
source /usr/local/lib/rctf-tools/common.sh
install -d -m 700 /etc/rctf-tools
install -d -m 755 /etc/systemd/system/whfd-platform.service.d
live=$(active_color)
id=$(docker ps --filter label=com.docker.compose.project=whfd --filter "label=com.docker.compose.service=rctf-$live" --format '{{.ID}}')
[[ -n "$id" && "$id" != *$'\n'* ]] || fail "Expected one running $live container."
image=$(docker inspect "$id" --format '{{.Image}}')
write_slot_config "$image"
write_upstream "$live"
python3 <<'PY'
from pathlib import Path
import os
import tempfile
path = Path('/etc/nginx/sites-available/whfd.conf')
text = path.read_text()
include = 'include /etc/nginx/snippets/rctf-upstream.conf;'
if include not in text:
    old = 'proxy_pass http://127.0.0.1:8083/;'
    if text.count(old) != 1:
        raise SystemExit('Expected one production upstream; refusing to change nginx.')
    text = text.replace(old, include)
elif text.count(include) != 1:
    raise SystemExit('Expected one blue/green upstream include.')
fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.whfd-')
with os.fdopen(fd, 'w') as f:
    f.write(text)
os.chmod(temporary, 0o644)
os.replace(temporary, path)
PY
"${compose[@]}" config --quiet
cat > /etc/systemd/system/whfd-platform.service.d/bluegreen.conf <<'UNIT'
[Service]
ExecStart=
ExecStart=/usr/local/lib/rctf-tools/bluegreen.sh start
ExecStop=
ExecStop=/usr/local/lib/rctf-tools/bluegreen.sh stop
TimeoutStartSec=240
UNIT
nginx -t
systemctl reload nginx
systemctl daemon-reload
for home_dir in /root /home/ubuntu; do
  [[ -d "$home_dir" ]] || continue
  for name in makeadmin listadmins deleteuser restart removeadmin; do
    dest="$home_dir/$name.sh"
    if [[ -e "$dest" || -L "$dest" ]]; then cp -a --parents "$dest" "$saved"; fi
    install -m 755 "$source_dir/compat.sh" "$dest"
    if [[ "$home_dir" == /home/ubuntu ]]; then chown ubuntu:ubuntu "$dest"; fi
  done
  dest="$home_dir/deleteflagsubmissions.sh"
  if [[ -e "$dest" || -L "$dest" ]]; then cp -a --parents "$dest" "$saved"; fi
  install -m 755 "$source_dir/deleteflagsubmissions.sh" "$dest"
  if [[ "$home_dir" == /home/ubuntu ]]; then chown ubuntu:ubuntu "$dest"; fi
done
printf 'Installed rctf with blue/green restart (live: %s). Run: rctf help\nPrevious helpers and configuration saved in: %s\n' "$live" "$saved"
