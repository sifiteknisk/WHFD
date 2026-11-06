# Reset all competition progress

On `nrec-rctf`:

```sh
./deleteflagsubmissions.sh --dry-run
./deleteflagsubmissions.sh
```

The command is also available as `deleteflagsubmissions` from any directory.
It shows current competition totals and requires typing exactly `confirm` in an
interactive terminal. Any other answer or Ctrl-D cancels.
There is no `--yes` option or other confirmation bypass.

After confirmation, it pauses both app slots to prevent incoming submissions or
background workers from restoring old state. It saves a root-only full database
dump under `/srv/rctf-data/platform/backups/competition-reset-*`, clears the
competition caches, and resets the database in one transaction. A failed backup
prevents deletion. The app is resumed afterward and checked for readiness.

The reset clears all solves, score events and graphs, all flag and admin-bot
submission history, admin-bot jobs, issued dynamic flags, team scores and ranks,
last-solve timestamps, and all earned, manually granted, available and spent bong
progress. It handles both the current production schema and the newer earned-bong
column. Derived challenge score and solve-count caches are reset and rebuilt by
the application.

Accounts, permissions, memberships, bans, challenge definitions and files,
competition settings and login state are preserved. Only competition-related
Redis keys in the configured database are cleared; other Redis databases and
settings are untouched. Existing backups, observability audit logs, external
messages and running challenge containers are not erased. Issued dynamic flags
must be generated again as teams start fresh.

The site is briefly unavailable during a confirmed reset. If an operation fails,
the script attempts to resume the previously running app slots and reports the
backup path. Inspect the output and `rctf status` before retrying.
