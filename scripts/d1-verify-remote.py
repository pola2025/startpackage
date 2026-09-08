import argparse
import hashlib
import importlib.util
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify(snapshot):
    snapshot = snapshot.resolve()
    if not snapshot.is_relative_to(ROOT / '.omx/d1-migration'):
        raise ValueError('Use the ignored snapshot directory')
    state = json.loads((snapshot / 'd1-stage-state.json').read_bytes())
    validation = json.loads((snapshot / 'validation.json').read_bytes())
    manifest = json.loads((snapshot / 'manifest.json').read_bytes())
    if not state.get('complete') or not validation.get('valueParity') or not manifest.get('complete'):
        raise ValueError('Completed staging import and snapshot validation required')
    if state['importSha256'] != validation['importSha256']:
        raise ValueError('Staging snapshot mismatch')
    if validation['schemaSqlSha256'] != hashlib.sha256((ROOT / 'prisma/d1/0001_initial.sql').read_bytes()).hexdigest():
        raise ValueError('Schema changed after import')
    if len(manifest['tables']) != 24 or manifest['rows'] > 20000:
        raise ValueError('Unreviewed snapshot size')
    spec = importlib.util.spec_from_file_location('stage_import', ROOT / 'scripts/d1-stage-import.py')
    stage = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(stage)
    env = stage.read_env(ROOT / '.env.local')
    if env.get('CLOUDFLARE_ACCOUNT_ID') != state['accountId']:
        raise ValueError('Project-local account mismatch')
    headers = {'Content-Type': 'application/json'}
    if env.get('CLOUDFLARE_API_TOKEN'):
        headers['Authorization'] = 'Bearer ' + env['CLOUDFLARE_API_TOKEN']
    elif env.get('CLOUDFLARE_EMAIL') and env.get('CLOUDFLARE_API_KEY'):
        headers.update({'X-Auth-Email': env['CLOUDFLARE_EMAIL'], 'X-Auth-Key': env['CLOUDFLARE_API_KEY']})
    else:
        raise ValueError('Missing project-local Cloudflare authority')
    endpoint = f'https://api.cloudflare.com/client/v4/accounts/{state["accountId"]}/d1/database/{state["databaseId"]}/query'
    report = {'complete': False, 'requests': 0, 'rowsRead': 0, 'rowsCompared': 0,
              'maxRequests': 300, 'maxRowsRead': 25000, 'tableReports': [], 'applicationCutover': False}

    def query(sql, params=()):
        if report['requests'] >= report['maxRequests'] or report['rowsRead'] >= report['maxRowsRead']:
            raise ValueError('Read verification budget exhausted')
        report['requests'] += 1
        request = urllib.request.Request(endpoint, headers=headers, data=json.dumps({'sql': sql, 'params': params}).encode())
        with urllib.request.urlopen(request, timeout=30) as result:
            body = json.load(result)
        if not body.get('success') or len(body['result']) != 1 or not body['result'][0].get('success'):
            raise ValueError('D1 query rejected')
        result = body['result'][0]
        rows_read = result.get('meta', {}).get('rows_read')
        if not isinstance(rows_read, int) or rows_read < 0:
            raise ValueError('D1 read metrics missing')
        report['rowsRead'] += rows_read
        if report['rowsRead'] > report['maxRowsRead']:
            raise ValueError('D1 read cost exceeded budget')
        return result['results']

    def quote(name):
        return '"' + name.replace('"', '""') + '"'

    try:
        for table in manifest['tables']:
            name = table['name']
            columns = [field['name'] for field in table['fields']]
            info = query(f'PRAGMA table_info({quote(name)})')
            indexes = query(f'PRAGMA index_list({quote(name)})')
            if [field['name'] for field in info] != columns or not any(row.get('unique') for row in indexes):
                raise ValueError('Remote schema or primary index mismatch: ' + name)
            sql = f'SELECT {",".join(map(quote, columns))} FROM {quote(name)} WHERE "id" > ? ORDER BY "id" ASC LIMIT ?'
            plan = query('EXPLAIN QUERY PLAN ' + sql, ['', 100])
            details = ' '.join(row['detail'] for row in plan)
            if 'SEARCH' not in details or 'SCAN' in details or 'TEMP B-TREE' in details:
                raise ValueError('Unbounded remote query plan: ' + name)
            expected = {}
            id_index = columns.index('id')
            for page in table['pages']:
                page_file = (snapshot / page['file']).resolve()
                if page_file.parent != snapshot:
                    raise ValueError('Invalid snapshot page path')
                content = page_file.read_bytes()
                if hashlib.sha256(content).hexdigest() != page['sha256']:
                    raise ValueError('Snapshot page checksum mismatch')
                for row in json.loads(content):
                    if not isinstance(row[id_index], str) or not row[id_index] or row[id_index] in expected:
                        raise ValueError('Invalid snapshot primary key')
                    expected[row[id_index]] = row
            if len(expected) != table['rows']:
                raise ValueError('Snapshot table count mismatch')
            cursor = ''
            compared = 0
            starting_reads = report['rowsRead']
            for _ in range(table['rows'] // 100 + 2):
                actual_rows = query(sql, [cursor, 100])
                if len(actual_rows) > 100:
                    raise ValueError('D1 page bound exceeded')
                for actual in actual_rows:
                    row = [actual[column] for column in columns]
                    if expected.pop(actual['id'], None) != row:
                        raise ValueError('Remote value mismatch: ' + name)
                    compared += 1
                    report['rowsCompared'] += 1
                if len(actual_rows) < 100:
                    break
                next_cursor = actual_rows[-1]['id']
                if next_cursor <= cursor:
                    raise ValueError('Cursor did not advance')
                cursor = next_cursor
            else:
                raise ValueError('Table page budget exhausted')
            if expected or compared != table['rows']:
                raise ValueError('Remote row count mismatch: ' + name)
            report['tableReports'].append({'table': name, 'rows': compared,
                                           'rowsRead': report['rowsRead'] - starting_reads, 'plan': details})
        if report['rowsCompared'] != manifest['rows']:
            raise ValueError('Total remote row count mismatch')
        report['complete'] = True
    finally:
        (snapshot / 'remote-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'tableReports'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    args = parser.parse_args()
    try:
        verify(args.snapshot)
    except Exception as error:
        print(json.dumps({'complete': False, 'errorType': type(error).__name__}))
        raise SystemExit(1)
