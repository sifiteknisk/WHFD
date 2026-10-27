#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if [ "$#" -eq 0 ]; then
  echo 'Usage: bun rctf:docker <command> [arguments...]' >&2
  echo 'Example: bun rctf:docker test first-blood fabianta@uio.no --force' >&2
  exit 1
fi

# Set RCTF_CONTAINER explicitly when both deployment slots are running.
container=${RCTF_CONTAINER:-}
if [ -z "$container" ]; then
  containers=$(docker compose ps --status running -q rctf-blue rctf-green)
  count=$(printf '%s\n' "$containers" | awk 'NF { n++ } END { print n+0 }')
  case "$count" in
    0)
      echo 'No running rCTF container found in this Compose project.' >&2
      exit 1
      ;;
    1) container=$containers ;;
    *)
      echo 'Multiple rCTF containers are running. Set RCTF_CONTAINER to the active container name.' >&2
      exit 1
      ;;
  esac
fi

exec docker exec "$container" rctf "$@"
