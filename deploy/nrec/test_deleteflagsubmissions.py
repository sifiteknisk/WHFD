#!/usr/bin/env python3
"""Run as root; PostgreSQL integration uses temporary tables, Redis an isolated container."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest

SCRIPT = Path(__file__).with_name('deleteflagsubmissions')
MOCK = r'''#!/usr/bin/env python3
import json, os, subprocess, sys
args = sys.argv[1:]
data = sys.stdin.read() if '-i' in args else ''
with open(os.environ['CALLS'], 'a') as f:
    f.write(json.dumps({'args': args, 'input': data}) + '\n')
if 'ps' in args:
    print(('blue' if args[-1] == 'rctf-green' else args[-1]) + '-container')
elif args[-2:] == ['get', 'database.redis']:
    print(json.dumps({'host': 'redis', 'password': 'fixture'}))
elif 'pg_dump' in args:
    if os.environ.get('FAIL_BACKUP'): sys.exit(1)
    if not os.environ.get('EMPTY_BACKUP'): print('PGDMP mock backup')
elif 'PING' in args:
    print('PONG')
elif 'EVAL' in args:
    if os.environ.get('FAIL_REDIS'): sys.exit(1)
    print('5')
elif data.startswith('BEGIN;'):
    if os.environ.get('FAIL_SQL'): sys.exit(1)
    if os.environ.get('REAL_SQL'):
        tables = ['admin_bot_jobs', 'submission_logs', 'dynamic_flags', 'score_events', 'solves']
        fixture = ''.join('CREATE TEMP TABLE ' + table + '(id text); INSERT INTO ' + table + " VALUES ('old');\n" for table in tables)
        extra = ', bongs_earned int CHECK (bongs_earned <= bongs_total)' if os.environ.get('EARNED_COLUMN') else ''
        fixture += 'CREATE TEMP TABLE users (id text, name text, perms int, score int, bongs_total int, bongs_available int, global_rank int, division_rank int, last_solve_at timestamptz, last_tiebreak_solve_at timestamptz' + extra + ');\n'
        fixture += "INSERT INTO users VALUES ('u','keep',63,500,5,3,1,1,now(),now()" + (',2' if extra else '') + ');\n'
        fixture += "CREATE TEMP TABLE challenges(id text, data jsonb, score int, solve_count int); INSERT INTO challenges VALUES ('c','{\"name\":\"keep\"}',500,1);\n"
        checks = "DO $$ BEGIN " + ''.join("IF EXISTS (SELECT FROM " + table + ") THEN RAISE EXCEPTION 'Rows remain'; END IF; " for table in tables)
        checks += "IF NOT EXISTS (SELECT FROM users WHERE id='u' AND name='keep' AND perms=63 AND score=0 AND bongs_total=0 AND bongs_available=0 AND global_rank IS NULL AND division_rank IS NULL AND last_solve_at IS NULL AND last_tiebreak_solve_at IS NULL" + (' AND bongs_earned=0' if extra else '') + ") THEN RAISE EXCEPTION 'User reset incorrect'; END IF; "
        checks += "IF NOT EXISTS (SELECT FROM challenges WHERE id='c' AND data->>'name'='keep' AND score=0 AND solve_count=0) THEN RAISE EXCEPTION 'Challenge reset incorrect'; END IF; END $$;"
        command = [os.environ['REAL_DOCKER'], 'exec', '-i', os.environ['RCTF_TEST_POSTGRES'], 'psql', '-X', '-q', '-U', 'rctf', '-d', 'rctf', '-v', 'ON_ERROR_STOP=1']
        sys.exit(subprocess.run(command, input=fixture + data + checks, text=True).returncode)
'''


@unittest.skipUnless(os.geteuid() == 0, 'run as root')
class CompetitionReset(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'compose.nrec.yml').write_text('services: {}\n')
        (self.root / 'upstream').write_text('proxy_pass http://127.0.0.1:8082/;\n')
        self.calls = self.root / 'calls'
        binary = self.root / 'bin'
        binary.mkdir()
        for tool in ['docker', 'curl']:
            path = binary / tool
            path.write_text(MOCK)
            path.chmod(0o755)
        self.env = {**os.environ, 'PATH': f'{binary}:{os.environ["PATH"]}',
                    'CALLS': str(self.calls), 'RCTF_PROJECT_DIR': str(self.root),
                    'RCTF_UPSTREAM_FILE': str(self.root / 'upstream'),
                    'RCTF_BACKUP_DIR': str(self.root / 'backups'),
                    'REAL_DOCKER': shutil.which('docker') or '/usr/bin/docker'}

    def tearDown(self):
        self.temp.cleanup()

    def run_script(self, *args, answer=None, **env):
        if self.calls.exists(): self.calls.unlink()
        master = slave = None
        try:
            if answer is not None: master, slave = os.openpty()
            process = subprocess.Popen(['bash', str(SCRIPT), *args], env={**self.env, **env},
                                       stdin=slave if slave is not None else subprocess.DEVNULL,
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if master is not None:
                os.close(slave)
                slave = None
                os.write(master, (answer + '\n').encode())
            stdout, stderr = process.communicate(timeout=20)
            self.history = [json.loads(line) for line in self.calls.read_text().splitlines()] if self.calls.exists() else []
            return process.returncode, stdout, stderr
        finally:
            if slave is not None: os.close(slave)
            if master is not None: os.close(master)

    def assert_no_writes(self):
        self.assertFalse(any('pg_dump' in call['args'] or 'EVAL' in call['args'] or call['args'][:1] in (['stop'], ['start']) or 'DELETE FROM' in call['input'] for call in self.history))

    def test_preview_noninteractive_and_no_bypass(self):
        code, output, _ = self.run_script('--dry-run')
        self.assertEqual(code, 0)
        self.assertIn('FULL RESET', output)
        self.assert_no_writes()
        self.assertNotEqual(self.run_script()[0], 0)
        self.assert_no_writes()
        self.assertNotEqual(self.run_script('--yes')[0], 0)
        self.assert_no_writes()

    def test_only_exact_confirm_is_accepted(self):
        for answer in ['', 'no', 'Confirm', ' confirm', 'confirm ']:
            self.assertEqual(self.run_script(answer=answer)[0], 0)
            self.assert_no_writes()

    def test_stop_backup_cache_sql_and_restart_order(self):
        code, _, error = self.run_script(answer='confirm')
        self.assertEqual(code, 0, error)
        stop = next(i for i, c in enumerate(self.history) if c['args'][:1] == ['stop'])
        backup = next(i for i, c in enumerate(self.history) if 'pg_dump' in c['args'])
        cache = next(i for i, c in enumerate(self.history) if 'EVAL' in c['args'])
        sql = next(i for i, c in enumerate(self.history) if c['input'].startswith('BEGIN;'))
        start = next(i for i, c in enumerate(self.history) if c['args'][:1] == ['start'])
        self.assertEqual([stop, backup, cache, sql, start], sorted([stop, backup, cache, sql, start]))
        dump = next((self.root / 'backups').glob('*/database.dump'))
        self.assertEqual(dump.stat().st_mode & 0o777, 0o600)
        self.assertEqual(dump.parent.stat().st_mode & 0o777, 0o700)

    def test_failures_resume_app_and_prevent_later_steps(self):
        for failure in ['FAIL_BACKUP', 'EMPTY_BACKUP', 'FAIL_REDIS', 'FAIL_SQL']:
            code, _, _ = self.run_script(answer='confirm', **{failure: '1'})
            self.assertNotEqual(code, 0)
            self.assertTrue(any(c['args'][:1] == ['start'] for c in self.history))
            if failure != 'FAIL_SQL':
                self.assertFalse(any(c['input'].startswith('BEGIN;') for c in self.history))

    @unittest.skipUnless(os.environ.get('RCTF_TEST_POSTGRES'), 'optional PostgreSQL temporary-table check')
    def test_sql_resets_old_and_new_schema_without_deleting_accounts_or_challenges(self):
        for extra in ['', '1']:
            code, _, error = self.run_script(answer='confirm', REAL_SQL='1', EARNED_COLUMN=extra)
            self.assertEqual(code, 0, error)

    @unittest.skipUnless(os.environ.get('RCTF_TEST_REDIS'), 'optional isolated Redis container check')
    def test_redis_clears_progress_but_keeps_settings_and_login_state(self):
        spec = importlib.util.spec_from_file_location('reset_redis', SCRIPT.with_name('reset-redis.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        docker = self.env['REAL_DOCKER']
        container = subprocess.check_output([docker, 'run', '--rm', '-d', '--network', 'none', 'redis:8.2.2', 'redis-server', '--save', '', '--appendonly', 'no', '--requirepass', 'fixture'], text=True).strip()
        def redis(*args):
            return subprocess.check_output([docker, 'exec', '-e', 'REDISCLI_AUTH=fixture', container, 'redis-cli', '--no-auth-warning', '--raw', *args], text=True).strip()
        try:
            for _ in range(30):
                try:
                    if redis('PING') == 'PONG': break
                except subprocess.CalledProcessError: pass
                time.sleep(0.1)
            for key in ['graph-data', 'dynamic-graph:c', 'dynamic-feed-version', 'user:u', 'bong-version:u', 'bongs:history', 'settings:resolved', 'login:pending']:
                redis('SET', key, 'keep-or-delete')
            redis('-n', '1', 'SET', 'graph-data', 'other-database')
            module.run(container, json.dumps({'host': 'redis', 'password': 'fixture'}), check=True)
            module.run(container, json.dumps({'host': 'redis', 'password': 'fixture'}))
            self.assertEqual(set(redis('KEYS', '*').splitlines()), {'settings:resolved', 'login:pending'})
            self.assertEqual(redis('-n', '1', 'GET', 'graph-data'), 'other-database')
        finally:
            subprocess.run([docker, 'rm', '-f', container], check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    unittest.main()
