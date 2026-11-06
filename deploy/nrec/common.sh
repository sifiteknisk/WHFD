#!/usr/bin/env bash

fail() { echo "$*" >&2; exit 1; }
project=${RCTF_PROJECT_DIR:-/srv/rctf-data/platform/WHFD}
upstream=${RCTF_UPSTREAM_FILE:-/etc/nginx/snippets/rctf-upstream.conf}
slot_config=${RCTF_BLUEGREEN_FILE:-/etc/rctf-tools/bluegreen.yml}
[[ -f "$project/compose.nrec.yml" ]] || fail "Missing $project/compose.nrec.yml"
cd "$project"
compose=(docker compose -f compose.nrec.yml)
if [[ -f /etc/whfd-observability/runtime-image.yml ]]; then
  compose+=(-f /etc/whfd-observability/runtime-image.yml)
fi
compose+=(-f "$slot_config")

active_color() {
  local line
  # Allow the basic helpers to work before blue/green is enabled.
  if [[ ! -f "$upstream" ]]; then echo green; return; fi
  IFS= read -r line < "$upstream"
  case "$line" in
    'proxy_pass http://127.0.0.1:8082/;') echo blue ;;
    'proxy_pass http://127.0.0.1:8083/;') echo green ;;
    *) fail "Unrecognized active upstream in $upstream" ;;
  esac
}
port_for() {
  case "$1" in blue) echo 8082 ;; green) echo 8083 ;; *) fail 'Invalid slot' ;; esac
}
container() {
  local id
  id=$("${compose[@]}" ps --status running -q "$1") || return
  [[ -n "$id" && "$id" != *$'\n'* ]] || fail "Expected one running $1 container. Run rctf status."
  printf '%s\n' "$id"
}
app_container() { container "rctf-$(active_color)"; }
ready() {
  local port=${1:-$(port_for "$(active_color)")}
  curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:$port/api/readyz"
}
write_slot_config() {
  local image=$1 temporary
  [[ "$image" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'Expected an immutable Docker image ID.'
  temporary=$(mktemp "$slot_config.XXXXXX")
  cat > "$temporary" <<YAML
services:
  rctf-green:
    image: $image
  rctf-blue:
    extends:
      file: $project/compose.nrec.yml
      service: rctf-green
    image: $image
    ports: !override
      - 127.0.0.1:8082:80
YAML
  chmod 600 "$temporary"
  mv "$temporary" "$slot_config"
}
write_upstream() {
  local temporary
  temporary=$(mktemp "$upstream.XXXXXX")
  printf 'proxy_pass http://127.0.0.1:%s/;\nadd_header X-RCTF-Slot %s always;\n' "$(port_for "$1")" "$1" > "$temporary"
  chmod 644 "$temporary"
  mv "$temporary" "$upstream"
}
