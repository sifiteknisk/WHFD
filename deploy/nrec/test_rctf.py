#!/usr/bin/env python3
"""Exercise the actual command with mocked Docker and API calls. Run as root."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("rctf")
MOCK = r'''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
tool = os.path.basename(sys.argv[0])
upstream = open(os.environ['RCTF_UPSTREAM_FILE']).read()
color = 'blue' if ':8082/' in upstream else 'green'
data = sys.stdin.read() if os.path.basename(sys.argv[0]) == 'docker' and args[:1] == ['exec'] and '-i' in args else ''
with open(os.environ['CALLS'], 'a') as f:
    f.write(json.dumps({'tool': os.path.basename(sys.argv[0]), 'args': args, 'stdin': data}) + '\n')
if tool == 'docker' and 'ps' in args and '-q' in args:
    if os.environ.get('NO_CONTAINER'): sys.exit(0)
    print(args[-1] + '-container')
elif 'psql' in args:
    if 'SELECT id FROM users WHERE lower(email)' in data: print('team-id')
    elif any('SELECT id FROM users WHERE (perms' in arg for arg in args): print('admin-id')
    else: print('query result')
elif 'pg_dump' in args:
    if os.environ.get('FAIL_DUMP'): sys.exit(1)
    print('PGDMP mock backup')
elif tool == 'docker' and args[:1] == ['inspect']:
    if args[-1] == '{{.Image}}': print('sha256:' + 'a' * 64)
    else: print(os.environ.get('REDIS_HEALTH', 'healthy'))
elif tool == 'docker' and 'up' in args and os.environ.get('FAIL_START'):
    sys.exit(1)
elif tool == 'nginx' and os.environ.get('FAIL_NGINX_TEST') and color == 'blue':
    sys.exit(1)
elif tool == 'systemctl' and 'reload' in args and os.environ.get('FAIL_RELOAD') and color == 'blue':
    sys.exit(1)
elif tool == 'curl':
    if '--dump-header' in args:
        if os.environ.get('FAIL_INGRESS') and color == 'blue': sys.exit(1)
        open(args[args.index('--dump-header') + 1], 'w').write('X-RCTF-Slot: ' + color + '\r\n')
    print('ready')
'''


@unittest.skipUnless(os.geteuid() == 0, "run as root to exercise command dispatch")
class Commands(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        self.project.mkdir()
        (self.project / "compose.nrec.yml").write_text("services: {}\n")
        (self.project / ".env").write_text("dummy=true\n")
        (self.project / "rctf.d").mkdir()
        (self.project / ".data/uploads").mkdir(parents=True)
        self.calls = self.root / "calls"
        self.upstream = self.root / "upstream.conf"
        self.upstream.write_text('proxy_pass http://127.0.0.1:8083/;\nadd_header X-RCTF-Slot green always;\n')
        self.slot_config = self.root / 'bluegreen.yml'
        self.slot_config.write_text('services: {}\n')
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for tool in ["docker", "curl", "systemctl", "nginx", "sleep"]:
            path = self.bin / tool
            path.write_text(MOCK)
            path.chmod(0o755)
        self.env = {**os.environ, "PATH": f"{self.bin}:{os.environ['PATH']}",
                    "CALLS": str(self.calls), "RCTF_PROJECT_DIR": str(self.project),
                    "RCTF_UPSTREAM_FILE": str(self.upstream), "RCTF_BLUEGREEN_FILE": str(self.slot_config),
                    "RCTF_BACKUP_DIR": str(self.root / "backups")}

    def tearDown(self):
        self.temp.cleanup()

    def run_command(self, *args, **env):
        result = subprocess.run(["bash", str(SCRIPT), *args], env={**self.env, **env},
                                input="", capture_output=True, text=True)
        self.history = [json.loads(line) for line in self.calls.read_text().splitlines()] if self.calls.exists() else []
        return result

    def test_email_is_a_psql_variable_and_cli_preserves_arguments(self):
        email = "o'brien@example.org"
        self.assertEqual(self.run_command("users", email).returncode, 0)
        query = next(call for call in self.history if "psql" in call["args"])
        self.assertIn("search=" + email, query["args"])
        self.assertNotIn(email, query["stdin"])
        self.assertEqual(self.run_command("makeadmin", email, "--perms", "challsRead").returncode, 0)
        self.assertEqual(self.history[-1]["args"][-5:], ["user", "promote", email, "--perms", "challsRead"])

    def test_reject_invalid_arguments_before_mutation(self):
        for args in [("deleteuser",), ("makeadmin", "a@b", "--bad"), ("logs", "app", "oops"), ("restart", "unexpected")]:
            self.assertNotEqual(self.run_command(*args).returncode, 0)
        self.assertEqual(self.history, [])

    def test_missing_container_and_unhealthy_redis_fail(self):
        self.assertNotEqual(self.run_command("listadmins", NO_CONTAINER="1").returncode, 0)
        self.assertNotEqual(self.run_command("health", REDIS_HEALTH="unhealthy").returncode, 0)

    def test_delete_requires_confirmation_and_backs_up_before_api_mutation(self):
        self.assertNotEqual(self.run_command("deleteuser", "team@example.org").returncode, 0)
        self.assertFalse(any("pg_dump" in call["args"] for call in self.history))
        self.calls.unlink()
        self.assertEqual(self.run_command("deleteuser", "team@example.org", "--yes").returncode, 0)
        dump = next(i for i, call in enumerate(self.history) if "pg_dump" in call["args"])
        deletion = next(i for i, call in enumerate(self.history) if call["args"][-1:] == ["deleteuser"])
        self.assertLess(dump, deletion)
        self.assertEqual(len(list((self.root / "backups").glob("*/database.dump"))), 1)

    def test_failed_backup_prevents_deletion(self):
        self.assertNotEqual(self.run_command("deleteuser", "team@example.org", "--yes", FAIL_DUMP="1").returncode, 0)
        self.assertFalse(any(call["args"][-1:] == ["deleteuser"] for call in self.history))
        self.assertEqual(list((self.root / "backups").glob("*/database.dump")), [])

    def test_backup_has_private_permissions_and_required_files(self):
        # Git metadata is collected using the real git command.
        subprocess.run(["git", "init", "-q", str(self.project)], check=True)
        subprocess.run(["git", "-C", str(self.project), "-c", "user.name=test", "-c", "user.email=test@example.org",
                        "commit", "--allow-empty", "-qm", "test"], check=True)
        result = self.run_command("backup")
        self.assertEqual(result.returncode, 0, result.stderr)
        backup = next((self.root / "backups").iterdir())
        self.assertEqual(backup.stat().st_mode & 0o777, 0o700)
        self.assertEqual((backup / "database.dump").stat().st_mode & 0o777, 0o600)
        archive = subprocess.check_output(["tar", "-tzf", str(backup / "platform.tar.gz")], text=True)
        for name in [".env", "rctf.d/", ".data/uploads/", "compose.nrec.yml"]:
            self.assertIn(name, archive.splitlines())

    def test_restart_switches_before_stopping_old_slot(self):
        result = self.run_command("restart")
        self.assertEqual(result.returncode, 0, result.stderr)
        start = next(i for i, call in enumerate(self.history) if 'up' in call['args'])
        reload = next(i for i, call in enumerate(self.history) if 'reload' in call['args'])
        stop = next(i for i, call in enumerate(self.history) if 'stop' in call['args'])
        self.assertLess(start, reload)
        self.assertLess(reload, stop)
        self.assertIn('rctf-blue', self.history[start]['args'])
        self.assertEqual(self.history[stop]['args'][-2:], ['stop', 'rctf-green'])
        self.assertIn(':8082/', self.upstream.read_text())
        self.assertIn('sha256:' + 'a' * 64, self.slot_config.read_text())
        if Path("/etc/whfd-observability/runtime-image.yml").exists():
            self.assertIn("/etc/whfd-observability/runtime-image.yml", self.history[start]["args"])

    def test_failed_start_or_nginx_switch_preserves_live_slot(self):
        for error in ['FAIL_START', 'FAIL_NGINX_TEST', 'FAIL_RELOAD', 'FAIL_INGRESS']:
            with self.subTest(error=error):
                if self.calls.exists(): self.calls.unlink()
                original_slots = self.slot_config.read_text()
                result = self.run_command('restart', **{error: '1'})
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(':8083/', self.upstream.read_text())
                self.assertEqual(self.slot_config.read_text(), original_slots)
                self.assertFalse(any(call['args'][-2:] == ['stop', 'rctf-green'] for call in self.history))

    def test_app_helpers_follow_blue_and_rollback_reuses_previous_container(self):
        self.upstream.write_text('proxy_pass http://127.0.0.1:8082/;\nadd_header X-RCTF-Slot blue always;\n')
        self.assertEqual(self.run_command('listadmins').returncode, 0)
        self.assertEqual(self.history[-1]['args'][1], 'rctf-blue-container')
        self.assertEqual(self.run_command('health').returncode, 0)
        self.assertTrue(any('http://127.0.0.1:8082/api/readyz' in call['args'] for call in self.history))
        result = self.run_command('rollback')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(':8083/', self.upstream.read_text())
        self.assertTrue(any(call['args'] == ['start', 'rctf-green-container'] for call in self.history))

    def test_boot_starts_selected_slot_and_stops_other_slot(self):
        result = subprocess.run(['bash', str(SCRIPT.with_name('bluegreen.sh')), 'start'],
                                env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls.read_text().splitlines()]
        start = next(call for call in calls if 'up' in call['args'])
        self.assertEqual(start['args'][-3:], ['postgres', 'redis', 'rctf-green'])
        self.assertEqual(calls[-1]['args'][-2:], ['stop', 'rctf-blue'])


if __name__ == "__main__":
    unittest.main()
