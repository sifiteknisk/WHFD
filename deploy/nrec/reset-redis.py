#!/usr/bin/env python3
"""Clear only competition caches in the configured rCTF Redis database."""
import json
import subprocess
import sys
from urllib.parse import unquote, urlsplit

PATTERNS = ('graph-*', 'dynamic-graph*', 'dynamic-feed-version', 'user:*', 'bong*')
LUA = """
local total = 0
for _, pattern in ipairs(cjson.decode(ARGV[1])) do
  local cursor = '0'
  repeat
    local result = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', 500)
    cursor = result[1]
    for _, key in ipairs(result[2]) do total = total + redis.call('DEL', key) end
  until cursor == '0'
end
return total
"""


def run(container, raw_config, check=False):
    if raw_config.lstrip().startswith('{'):
        config = json.loads(raw_config)
    else:
        url = urlsplit(raw_config.strip())
        if url.scheme != 'redis':
            raise ValueError('Expected local Redis configuration')
        config = {'host': url.hostname, 'password': unquote(url.password or ''),
                  'username': unquote(url.username or 'default'),
                  'database': int(url.path.lstrip('/') or '0')}
    if config.get('host') not in ('redis', '127.0.0.1', 'localhost'):
        raise ValueError('Refusing to reset a Redis host outside the NREC service')
    password = config.get('password') or ''
    if '\n' in password or '\r' in password:
        raise ValueError('Redis password must not contain line breaks')
    database = int(config.get('database', 0))
    if database < 0:
        raise ValueError('Invalid Redis database')
    # The password travels only over stdin, never command arguments or output.
    command = ['docker', 'exec', '-i', container, 'sh', '-c',
               'IFS= read -r REDISCLI_AUTH; export REDISCLI_AUTH; db=$1; user=$2; shift 2; exec redis-cli -e --no-auth-warning --raw -n "$db" --user "$user" "$@"',
               'redis-reset', str(database), config.get('username') or 'default']
    command.extend(['PING'] if check else ['EVAL', LUA, '0', json.dumps(PATTERNS)])
    result = subprocess.run(command, input=password + '\n', text=True, capture_output=True)
    output = result.stdout.strip()
    if result.returncode or (output != 'PONG' if check else not output.isdigit()):
        raise RuntimeError('Redis authentication or cache operation failed')
    print('Redis authentication checked.' if check else f'Competition cache keys cleared: {output}')


if __name__ == '__main__':
    try:
        run(sys.argv[1], sys.stdin.read(), check=sys.argv[2:] == ['--check'])
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
