import argparse
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_env(filename):
    result = {}
    for line in filename.read_text(encoding='utf-8-sig').splitlines():
        if '=' not in line or line.lstrip().startswith('#'):
            continue
        key, value = line.split('=', 1)
        result[key.strip()] = value.strip().strip('"\'')
    return result


def run(args):
    snapshot = args.snapshot.resolve()
    if not snapshot.is_relative_to(ROOT / '.omx' / 'd1-migration'):
        raise ValueError('Use an ignored project-local snapshot')
    report = json.loads((snapshot / 'validation.json').read_text(encoding='utf-8'))
    if not report.get('complete') or not report.get('valueParity'):
        raise ValueError('Complete local value parity validation is required')
    if hashlib.sha256((ROOT / 'prisma/d1/0001_initial.sql').read_bytes()).hexdigest() != report.get('schemaSqlSha256'):
        raise ValueError('D1 schema changed after validation')
    import_file = (snapshot / report['importFile']).resolve()
    if import_file.parent != snapshot:
        raise ValueError('Invalid import file path')
    content = import_file.read_bytes()
    if hashlib.sha256(content).hexdigest() != report['importSha256']:
        raise ValueError('Import file differs from validated snapshot')
    if len(content) > 25_000_000 or report['rows'] > 20_000:
        raise ValueError('Import exceeds the reviewed staging budget')
    env = read_env(ROOT / '.env.local')
    account = env.get('CLOUDFLARE_ACCOUNT_ID')
    if not account:
        raise ValueError('Project-local CLOUDFLARE_ACCOUNT_ID is required')
    headers = {'Content-Type': 'application/json'}
    if env.get('CLOUDFLARE_API_TOKEN'):
        headers['Authorization'] = 'Bearer ' + env['CLOUDFLARE_API_TOKEN']
    elif env.get('CLOUDFLARE_EMAIL') and env.get('CLOUDFLARE_API_KEY'):
        headers.update({'X-Auth-Email': env['CLOUDFLARE_EMAIL'], 'X-Auth-Key': env['CLOUDFLARE_API_KEY']})
    else:
        raise ValueError('Project-local Cloudflare authority is required')
    api_root = 'https://api.cloudflare.com/client/v4/accounts/' + account
    calls = 0

    def api(suffix, payload=None):
        nonlocal calls
        calls += 1
        if calls > 12:
            raise ValueError('Cloudflare request budget exhausted')
        request = urllib.request.Request(api_root + suffix, headers=headers,
                                         data=None if payload is None else json.dumps(payload).encode())
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)
        if data.get('success') is not True:
            raise ValueError('Cloudflare rejected the operation')
        return data['result']

    state_file = snapshot / 'd1-stage-state.json'
    if state_file.exists():
        state = json.loads(state_file.read_text(encoding='utf-8'))
        if state['accountId'] != account or state['importSha256'] != report['importSha256']:
            raise ValueError('Staging account or snapshot changed')
        if state.get('complete'):
            print(json.dumps({'complete': True, 'databaseName': state['name'], 'requests': 0}))
            return
        if not args.resume or not state.get('bookmark'):
            raise ValueError('Existing staging attempt requires investigation; no automatic re-import')
    else:
        if args.resume or not args.create_target or not args.create_target.startswith('startpackage-migration-'):
            raise ValueError('Explicit --create-target=startpackage-migration-... required for a NEW staging database')
        account_result = api('')
        if account_result.get('id') != account:
            raise ValueError('Cloudflare account mismatch')
        created = api('/d1/database', {'name': args.create_target})
        state = {'accountId': account, 'databaseId': created['uuid'], 'name': args.create_target,
                 'importSha256': report['importSha256'], 'complete': False, 'applicationCutover': False}
        state_file.write_text(json.dumps(state, indent=2), encoding='utf-8')
        endpoint = '/d1/database/' + state['databaseId'] + '/import'
        etag = hashlib.md5(content).hexdigest()
        initialized = api(endpoint, {'action': 'init', 'etag': etag})
        if initialized.get('upload_url'):
            upload_url = initialized['upload_url']
            parsed = urllib.parse.urlparse(upload_url)
            if parsed.scheme != 'https' or not (parsed.hostname or '').endswith('.r2.cloudflarestorage.com'):
                raise ValueError('Unexpected D1 presigned upload destination')
            request = urllib.request.Request(upload_url, data=content, method='PUT')
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status not in (200, 201, 204):
                    raise ValueError('D1 upload failed')
        ingested = api(endpoint, {'action': 'ingest', 'etag': etag, 'filename': initialized['filename']})
        state['bookmark'] = ingested.get('at_bookmark')
        state['complete'] = ingested.get('status') == 'complete'
        if ingested.get('result'):
            state['metrics'] = ingested['result'].get('meta')
            state['finalBookmark'] = ingested['result'].get('final_bookmark')
        state_file.write_text(json.dumps(state, indent=2), encoding='utf-8')
        if ingested.get('status') == 'error':
            raise ValueError('D1 import failed; inspect staging state without retrying writes')

    endpoint = '/d1/database/' + state['databaseId'] + '/import'
    for _ in range(6):
        if state['complete']:
            break
        if not state.get('bookmark'):
            raise ValueError('Import did not return a polling bookmark')
        time.sleep(5)
        result = api(endpoint, {'action': 'poll', 'current_bookmark': state['bookmark']})
        state['bookmark'] = result.get('at_bookmark', state['bookmark'])
        state['complete'] = result.get('status') == 'complete'
        state['requestsThisRun'] = calls
        if result.get('result'):
            state['metrics'] = result['result'].get('meta')
            state['finalBookmark'] = result['result'].get('final_bookmark')
        state_file.write_text(json.dumps(state, indent=2), encoding='utf-8')
        if result.get('status') == 'error':
            raise ValueError('D1 import failed; no automatic re-import')
    print(json.dumps({'complete': state['complete'], 'databaseName': state['name'], 'requests': calls,
                      'applicationCutover': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--create-target')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    try:
        run(args)
    except Exception as error:
        print(json.dumps({'complete': False, 'errorType': type(error).__name__}))
        raise SystemExit(1)
