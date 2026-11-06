# NREC rCTF helpers

After `ssh nrec-rctf`, run `rctf help`. Commands elevate through `sudo` when
needed. The old `./makeadmin.sh`, `./listadmins.sh`, `./deleteuser.sh` and
`./restart.sh` names work in both `/home/ubuntu` and `/root`.

## Terminal menu

Run `rctfscript` after `ssh nrec-rctf`, or connect directly with:

```sh
ssh -t nrec-rctf rctfscript
```

The Charm Gum TUI groups all commands into Monitor, Users, Deploy, Backups,
Competition and Advanced. Use arrows and Enter to choose a category, then type
to search its actions. Esc returns to categories. Guided inputs collect emails,
permissions, log services and line counts. Ctrl-C stops following logs and
returns to the menu; output remains visible until you continue.

Deploy also includes `/home/ubuntu/pull-challenge-images.sh`. Competition includes
a read-only reset preview and the full reset helper. Team deletion still requires
typing the email in the existing helper; a competition reset still requires
typing `confirm` and makes its normal database backup. Application CLI arguments
are entered one per line, without shell quotes or expansion. The PostgreSQL
console and application CLI operate directly on production.

The installer adds `/usr/local/bin/rctfscript`. Install Charm Gum separately;
this is the verified Linux x86-64 version used on NREC:

```sh
curl -fL https://github.com/charmbracelet/gum/releases/download/v2.0.2/gum_2.0.2_Linux_x86_64.tar.gz -o /tmp/rctf-gum.tar.gz
echo 'd842e06d93dbed90af48cb8dd10698db6f22e331fc40346bb37bbc753109edc2  /tmp/rctf-gum.tar.gz' | sha256sum -c -
tar -xzf /tmp/rctf-gum.tar.gz -C /tmp gum_2.0.2_Linux_x86_64/gum
sudo install -m 755 /tmp/gum_2.0.2_Linux_x86_64/gum /usr/local/bin/gum
```

To update only the TUI from a checkout on NREC, without running the platform
installer:

```sh
sudo install -m 755 deploy/nrec/rctfscript /usr/local/lib/rctf-tools/rctfscript
sudo ln -sfn /usr/local/lib/rctf-tools/rctfscript /usr/local/bin/rctfscript
```

To reset all solves, scores and bongs with a typed confirmation and database backup,
see [deleteflagsubmissions](deleteflagsubmissions.md).

```sh
rctf status
rctf health
rctf logs app 200
rctf stats
rctf users example.org
rctf user person@example.org
rctf listadmins
rctf makeadmin person@example.org
rctf makeadmin person@example.org --perms challsRead,challsWrite
rctf removeadmin person@example.org
rctf ban person@example.org
rctf unban person@example.org
rctf backup
rctf backups
rctf restart
rctf rollback
rctf cli test --help
```

`makeadmin` defaults to all application permissions. `removeadmin` removes all
admin permissions. These use the built-in CLI, including cache invalidation.
`user`, `ban`, `unban` and `deleteuser` use the running application's admin API.
They authenticate locally as an existing admin with `usersWrite`; the token and
key stay inside the app container. Deletion and bans use the application's score
recomputation, cache invalidation and admin-user protection.

`rctf deleteuser person@example.org` displays the user, requires typing the email,
and saves a database dump before deleting the team and its solves. For intentional
noninteractive use, add `--yes`. The API refuses deletion of admins; demote first.

`restart` alternates between blue (port 8082) and green (8083). It starts the
inactive slot with the currently running image, waits for Docker health and app
readiness, validates and reloads nginx, and checks HTTPS through the local nginx
with the expected `X-RCTF-Slot` response header. Only then does it drain the old
slot for ten seconds and stop it. If startup or switching fails, it restores the
old route. If nginx recovery cannot be verified, both slots remain running for
inspection. Long-lived connections may reconnect when the old slot stops.

`rollback` starts the retained previous container and uses the same checked
traffic switch. It does not restore the database or uploads. The nginx upstream
snippet records the active slot; all helpers follow it. A systemd drop-in makes
`whfd-platform` start the selected slot after reboot and stop both slots on shutdown.

Restart does not pull or rebuild source. NREC has local source changes and a
runtime image override, so deploying new code requires deliberately reconciling
both. The previous `/root/restart.sh` (which pulled and rebuilt) is retained in
the installer backup. Both slots share PostgreSQL, Redis and uploads.

## Backups

`rctf backup` creates a directory under `/srv/rctf-data/platform/backups` containing:

- `database.dump`: PostgreSQL custom-format dump.
- `platform.tar.gz`: `.env`, `rctf.d`, uploads and `compose.nrec.yml`.
- `runtime-image.yml`, when present, the blue/green override and active upstream,
  plus the running image ID and Git commit.

Backups contain credentials and user data, are root-only, and are never pruned
automatically. A failed operation leaves `.partial` files rather than a completed
archive. Database and file snapshots run sequentially while the site stays online;
they are not an atomic snapshot. These are local backups, not off-host disaster
recovery. They exclude worker hosts, nginx/TLS configuration, Redis, image layers
and the observability ledger. Confirm free disk space before making many copies.

To inspect a dump without restoring anything:

```sh
sudo cat /srv/rctf-data/platform/backups/<backup>/database.dump \
  | sudo docker exec -i whfd-postgres-1 pg_restore --list
```

Restoring is intentionally manual: stop writes, select the right database/image,
and plan for PostgreSQL, uploads and Redis caches together.

## Install or update

From a checkout on NREC, run `sudo bash deploy/nrec/install.sh`. Alternatively,
copy this directory to a temporary directory on NREC and run its `install.sh`.
The installer preserves existing helpers under `/var/backups/rctf-tools/install-*`,
installs `rctf` in `/usr/local/bin`, and copies this guide to
`/usr/local/share/doc/rctf-tools/README.md`. It installs an nginx upstream include,
`/etc/rctf-tools/bluegreen.yml`, and a `whfd-platform` systemd drop-in. It validates
Compose and nginx before reloading nginx and systemd configuration. Installation
preserves the live slot and does not restart the app or edit the production
checkout or its Compose files. Original configuration is retained beside the
original helpers in the installer backup.

The scripts target `/srv/rctf-data/platform/WHFD/compose.nrec.yml`, include
`/etc/whfd-observability/runtime-image.yml` if present, then apply the blue/green
override. Both slots are pinned to the image selected for the last switch.
The scripts find running containers by Compose service.

## Checks

```sh
bash -n deploy/nrec/rctf deploy/nrec/install.sh deploy/nrec/compat.sh deploy/nrec/common.sh deploy/nrec/bluegreen.sh
python3 deploy/nrec/test_rctfscript.py
node --test deploy/nrec/api-user.test.mjs
# Root is needed because the real command elevates to root. Docker/API calls are mocked.
sudo python3 deploy/nrec/test_rctf.py
```

After installing, use `rctf health`, `rctf status` and `rctf stats` for live,
read-only verification. Test user mutations only on a disposable account.
