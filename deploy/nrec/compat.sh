#!/usr/bin/env bash
set -euo pipefail
command=$(basename "$0" .sh)
exec /usr/local/bin/rctf "$command" "$@"
