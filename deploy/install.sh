#!/bin/sh
set -e

fg_cyan="\033[36m"
bold_fg_white="\033[1;37m"
bg_red="\033[41m"
reset="\033[0m"

error() {
  # shellcheck disable=SC2059
  printf "${bg_red}${bold_fg_white}%s %s${reset}\n" "[-]" "$*" 1>&2
}

info() {
  # shellcheck disable=SC2059
  printf "${fg_cyan}%s %s${reset}\n" "[*]" "$*"
}

get_key() {
  head -c 32 /dev/urandom | base64 -w 0
}

repo_root() {
  script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  CDPATH= cd -- "$script_dir/.." && pwd
}

do_install() {
  info "Installing rCTF from this repository..."

  if [ ! "$(id -u)" = 0 ]; then
    error "You must run this script as root."
    exit 1
  fi

  cd "$(repo_root)"

  if [ ! -f compose.yml ] || [ ! -f deploy/rctf/Dockerfile ]; then
    error "This script must live in the rCTF repository. compose.yml or deploy/rctf/Dockerfile is missing."
    exit 1
  fi

  if [ ! -x "$(command -v docker)" ]; then
    if [ ! -x "$(command -v curl)" ]; then
      error "curl is not available. You must have curl to install Docker."
      exit 1
    fi

    info "Installing Docker..."
    curl -fsS https://get.docker.com | sh
  fi

  info "Configuring rCTF..."

  mkdir -p rctf.d .data/postgres .data/redis .data/uploads

  if [ ! -f .env ]; then
    printf "%s\n" \
    "RCTF_DATABASE_PASSWORD=$(get_key)" \
    "RCTF_REDIS_PASSWORD=$(get_key)" \
    "RCTF_GIT_REF=local" \
    > .env
    info "Wrote .env"
  else
    info "Keeping existing .env"
  fi

  if [ ! -f rctf.d/01-ui.yaml ]; then
    printf "%s\n" \
    "ctfName: rCTF" \
    "meta:" \
    "  description: 'A description of your CTF'" \
    "  imageUrl: 'https://example.com'" \
    "homeContent: 'A description of your CTF. Markdown supported.'" \
    > rctf.d/01-ui.yaml
  fi

  if [ ! -f rctf.d/02-ctf.yaml ]; then
    printf "%s\n" \
    "origin: http://127.0.0.1:8080" \
    "divisions:" \
    "  open: Open" \
    "tokenKey: '$(get_key)'" \
    "startTime: $(date +%s)000" \
    "endTime: $(($(date +%s) + 604800))000" \
    > rctf.d/02-ctf.yaml
  fi

  if [ ! -f rctf.d/03-db.yaml ]; then
    printf "%s\n" \
    "database:" \
    "  sql:" \
    "    host: postgres" \
    "    user: rctf" \
    "    database: rctf" \
    "  redis:" \
    "    host: redis" \
    "  migrate: before" \
    > rctf.d/03-db.yaml
  fi

  info "Building the local image and starting rCTF..."
  docker compose build
  docker compose up -d

  info "rCTF is now running at 127.0.0.1:8080."
}

do_install
