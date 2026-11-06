#!/usr/bin/env bash
set -euo pipefail
(( EUID == 0 )) || { echo 'Run through rctf restart or sudo.' >&2; exit 1; }
lib_dir=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")
source "$lib_dir/common.sh"
[[ -f "$upstream" && -f "$slot_config" ]] || fail 'Blue/green is not installed. Run install.sh.'
exec 9>/run/lock/rctf-tools-restart.lock
flock -n 9 || fail 'Another restart or installation is running.'
live=$(active_color)
if [[ "$live" == green ]]; then next=blue; else next=green; fi

ingress_ready() {
  # The origin uses a private CA. This probe stays on loopback, bypassing proxies.
  curl --insecure --noproxy '*' --fail --silent --show-error --max-time 5 \
    --resolve whfd.sifi.no:443:127.0.0.1 --dump-header "$work/headers" \
    https://whfd.sifi.no/api/readyz > /dev/null &&
    tr -d '\r' < "$work/headers" | grep -Fxiq "X-RCTF-Slot: $1"
}
wait_slot() {
  local id=$1 color=$2 attempt health
  for (( attempt=0; attempt<90; attempt++ )); do
    health=$(docker inspect "$id" --format '{{.State.Health.Status}}')
    if [[ "$health" == healthy ]] && ready "$(port_for "$color")" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

case "${1:-}" in
  start)
    "${compose[@]}" up -d --no-build --wait --wait-timeout 120 postgres redis "rctf-$live"
    "${compose[@]}" stop "rctf-$next"
    exit
    ;;
  stop) "${compose[@]}" stop; exit ;;
  restart|rollback|pull) ;;
  *) fail 'Usage: bluegreen.sh start|stop|restart|rollback|pull' ;;
esac

work=$(mktemp -d)
cp "$upstream" "$work/upstream"
cp "$slot_config" "$work/slots"
switched=0
committed=0
candidate_started=0
deployment_started=0
cleanup() {
  local code=$? restored=0
  trap - EXIT
  if (( code != 0 && deployment_started == 0 )); then
    echo "Preparation failed; no deployment was attempted. $live remains live." >&2
  elif (( code != 0 && committed == 0 )); then
    cp "$work/slots" "$slot_config.recover"
    mv "$slot_config.recover" "$slot_config"
    cp "$work/upstream" "$upstream.recover"
    mv "$upstream.recover" "$upstream"
    if (( switched == 0 )); then
      restored=1
    elif nginx -t && systemctl reload nginx; then
      for (( attempt=0; attempt<10; attempt++ )); do
        if ingress_ready "$live"; then restored=1; break; fi
        sleep 1
      done
    fi
    if (( restored == 1 )); then
      echo "Switch failed; $live remains live." >&2
      if (( candidate_started == 1 )); then "${compose[@]}" stop "rctf-$next" || true; fi
    else
      echo 'Could not verify nginx recovery. Both slots left running; check rctf status and nginx.' >&2
    fi
  fi
  rm -r "$work"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

old=$(container "rctf-$live")
if [[ "$1" == pull ]]; then
  git pull --ff-only
  # The base file tags the build; the slot override still pins the live image.
  docker compose -f compose.nrec.yml build rctf-green
  image=$(docker image inspect ghcr.io/otter-sec/rctf:local --format '{{.Id}}')
  [[ "$image" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'Could not identify the built app image.'
  "$lib_dir/rctf" backup
elif [[ "$1" == rollback ]]; then
  candidate=$("${compose[@]}" ps -a -q "rctf-$next")
  [[ -n "$candidate" && "$candidate" != *$'\n'* ]] || fail "No previous $next container is available."
  image=$(docker inspect "$candidate" --format '{{.Image}}')
else
  image=$(docker inspect "$old" --format '{{.Image}}')
fi
deployment_started=1
write_slot_config "$image"
echo "Starting $next with $image; $live continues serving traffic."
candidate_started=1
if [[ "$1" == rollback ]]; then
  docker start "$candidate"
else
  "${compose[@]}" up -d --no-deps --no-build --force-recreate --wait --wait-timeout 120 "rctf-$next"
  candidate=$(container "rctf-$next")
fi
wait_slot "$candidate" "$next" || fail "$next did not become ready."
write_upstream "$next"
nginx -t
switched=1
systemctl reload nginx
verified=0
for (( attempt=0; attempt<10; attempt++ )); do
  if ingress_ready "$next"; then verified=1; break; fi
  sleep 1
done
(( verified == 1 )) || fail 'The new slot did not pass the nginx readiness check.'
committed=1
echo "Traffic switched to $next. Draining $live for 10 seconds."
sleep 10
"${compose[@]}" stop "rctf-$live" || fail "Traffic is on $next, but $live could not be stopped."
echo "Ready: $next is live. Previous $live container retained for rctf rollback."
