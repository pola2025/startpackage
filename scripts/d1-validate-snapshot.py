"""Validate every exported value in SQLite before producing a D1 import file.

No network calls. All output containing customer data stays in the ignored snapshot.
"""
import argparse
import hashlib
import json
import sqlite3
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def quote(value):
    return '"' + value.replace('"', '""') + '"'


def validate(snapshot):
    snapshot = snapshot.resolve()
    if not snapshot.is_relative_to(ROOT / '.omx' / 'd1-migration'):
        raise ValueError('Snapshot must be inside the ignored migration directory')
    manifest = json.loads((snapshot / 'manifest.json').read_text(encoding='utf-8'))
    if not manifest.get('complete'):
        raise ValueError('Incomplete source snapshot')
    current_hash = hashlib.sha256((ROOT / 'prisma/schema.prisma').read_bytes()).hexdigest()
    # Node readFile UTF8 hashes raw text; CRLF is retained.
    if manifest['sourceSchemaSha256'] != current_hash:
        raise ValueError('Source schema changed since export')
    db_file = snapshot / f'validated-{time.time_ns()}.sqlite'
    connection = sqlite3.connect(db_file)
    connection.execute('PRAGMA foreign_keys = ON')
    schema_bytes = (ROOT / 'prisma/d1/0001_initial.sql').read_bytes()
    connection.executescript(schema_bytes.decode('utf-8'))
    connection.execute('BEGIN')
    connection.execute('PRAGMA defer_foreign_keys = ON')
    report = {'complete': False, 'tables': 0, 'rows': 0, 'valueParity': False,
              'databaseFile': db_file.name, 'schemaSqlSha256': hashlib.sha256(schema_bytes).hexdigest()}
    try:
        actual_tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if actual_tables != {table['name'] for table in manifest['tables']}:
            raise ValueError('Export and D1 table sets differ')
        for table in manifest['tables']:
            columns = [field['name'] for field in table['fields']]
            db_columns = [row[1] for row in connection.execute(f'PRAGMA table_info({quote(table["name"])})')]
            if columns != db_columns:
                raise ValueError('Export and D1 columns differ: ' + table['name'])
            query = f'INSERT INTO {quote(table["name"])} ({",".join(map(quote, columns))}) VALUES ({",".join("?" for _ in columns)})'
            count = 0
            for page in table['pages']:
                page_file = (snapshot / page['file']).resolve()
                if page_file.parent != snapshot:
                    raise ValueError('Invalid page path')
                content = page_file.read_bytes()
                if hashlib.sha256(content).hexdigest() != page['sha256']:
                    raise ValueError('Snapshot page checksum mismatch')
                rows = json.loads(content)
                if len(rows) != page['rows']:
                    raise ValueError('Snapshot page row count mismatch')
                connection.executemany(query, rows)
                count += len(rows)
            if count != table['rows']:
                raise ValueError('Snapshot table row count mismatch')
            report['tables'] += 1
            report['rows'] += count
        if connection.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Foreign key integrity violation')
        connection.commit()
        # Verify each value by primary-key point lookup; never print records.
        for table in manifest['tables']:
            columns = [field['name'] for field in table['fields']]
            id_index = columns.index('id')
            query = f'SELECT {",".join(map(quote, columns))} FROM {quote(table["name"])} WHERE id = ?'
            for page in table['pages']:
                for expected in json.loads((snapshot / page['file']).read_bytes()):
                    actual = connection.execute(query, [expected[id_index]]).fetchone()
                    if actual != tuple(expected):
                        raise ValueError('Value parity mismatch: ' + table['name'])
        if report['rows'] != manifest['rows']:
            raise ValueError('Total row count mismatch')
        report['valueParity'] = True
        sql_file = snapshot / f'd1-import-{report["schemaSqlSha256"][:12]}-{time.time_ns()}.sql'
        with sql_file.open('x', encoding='utf-8', newline='\n') as output:
            output.write(schema_bytes.decode('utf-8') + '\n')
            output.write('PRAGMA defer_foreign_keys = ON;\n')
            for table in manifest['tables']:
                columns = [field['name'] for field in table['fields']]
                prefix = f'INSERT INTO {quote(table["name"])} ({",".join(map(quote, columns))}) VALUES ('
                for page in table['pages']:
                    for row in json.loads((snapshot / page['file']).read_bytes()):
                        values = []
                        for value in row:
                            if isinstance(value, str) and '\x00' in value:
                                values.append("CAST(X'" + value.encode('utf-8').hex() + "' AS TEXT)")
                            else:
                                values.append(connection.execute('SELECT quote(?)', [value]).fetchone()[0])
                        output.write(prefix + ','.join(values) + ');\n')
            output.write('PRAGMA defer_foreign_keys = OFF;\n')
        replay = sqlite3.connect(':memory:')
        try:
            replay.executescript('BEGIN;\n' + sql_file.read_text(encoding='utf-8') + '\nCOMMIT;')
            if replay.execute('PRAGMA foreign_key_check').fetchall():
                raise ValueError('Generated import SQL violates foreign keys')
            for table in manifest['tables']:
                rows = replay.execute(f'SELECT COUNT(*) FROM {quote(table["name"])}').fetchone()[0]
                if rows != table['rows']:
                    raise ValueError('Generated import SQL count mismatch')
        finally:
            replay.close()
        report['importSha256'] = hashlib.sha256(sql_file.read_bytes()).hexdigest()
        report['importFile'] = sql_file.name
        report['importBytes'] = sql_file.stat().st_size
        report['complete'] = True
    finally:
        connection.close()
        (snapshot / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    args = parser.parse_args()
    try:
        validate(args.snapshot)
    except Exception as error:
        # SQL integrity errors can contain customer values.
        print(json.dumps({'complete': False, 'errorType': type(error).__name__}))
        raise SystemExit(1)
