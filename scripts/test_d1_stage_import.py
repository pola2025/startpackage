import argparse
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('stage', Path(__file__).with_name('d1-stage-import.py'))
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)


class StageImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.snapshot = self.root / '.omx/d1-migration/snapshot'
        self.snapshot.mkdir(parents=True)
        schema = self.root / 'prisma/d1/0001_initial.sql'
        schema.parent.mkdir(parents=True)
        schema.write_text('schema', encoding='utf-8')
        self.content = b'CREATE TABLE example(id TEXT PRIMARY KEY);'
        (self.snapshot / 'import.sql').write_bytes(self.content)
        self.report = {'complete': True, 'valueParity': True, 'rows': 1,
                       'schemaSqlSha256': hashlib.sha256(b'schema').hexdigest(),
                       'importFile': 'import.sql', 'importSha256': hashlib.sha256(self.content).hexdigest()}
        self.save_report()
        self.args = argparse.Namespace(snapshot=self.snapshot, create_target='startpackage-migration-test', resume=False)
        self.root_patch = patch.object(stage, 'ROOT', self.root)
        self.env_patch = patch.object(stage, 'read_env', return_value={
            'CLOUDFLARE_ACCOUNT_ID': 'account', 'CLOUDFLARE_API_TOKEN': 'test-only-token'})
        self.root_patch.start()
        self.env_patch.start()

    def tearDown(self):
        self.root_patch.stop()
        self.env_patch.stop()
        self.temp.cleanup()

    def save_report(self):
        (self.snapshot / 'validation.json').write_text(json.dumps(self.report), encoding='utf-8')

    @staticmethod
    def response(result):
        return io.BytesIO(json.dumps({'success': True, 'result': result}).encode())

    def test_unvalidated_snapshot_never_calls_cloudflare(self):
        self.report['valueParity'] = False
        self.save_report()
        with patch.object(stage.urllib.request, 'urlopen') as network:
            with self.assertRaises(ValueError):
                stage.run(self.args)
            network.assert_not_called()

    def test_changed_file_or_schema_never_calls_cloudflare(self):
        (self.snapshot / 'import.sql').write_text('changed', encoding='utf-8')
        with patch.object(stage.urllib.request, 'urlopen') as network:
            with self.assertRaises(ValueError):
                stage.run(self.args)
            network.assert_not_called()

    def test_staging_import_and_completed_replay_are_bounded(self):
        responses = [self.response({'id': 'account'}), self.response({'uuid': 'database'}),
                     self.response({'filename': 'already-uploaded'}),
                     self.response({'status': 'complete', 'at_bookmark': 'done'})]
        with patch.object(stage.urllib.request, 'urlopen', side_effect=responses) as network:
            stage.run(self.args)
            self.assertEqual(network.call_count, 4)
            stage.run(self.args)
            self.assertEqual(network.call_count, 4)
        state = json.loads((self.snapshot / 'd1-stage-state.json').read_text(encoding='utf-8'))
        self.assertTrue(state['complete'])
        self.assertFalse(state['applicationCutover'])

    def test_polling_stops_after_six_calls_and_resume_never_reimports(self):
        state = {'accountId': 'account', 'databaseId': 'database', 'name': 'startpackage-migration-test',
                 'importSha256': self.report['importSha256'], 'complete': False, 'bookmark': 'pending'}
        (self.snapshot / 'd1-stage-state.json').write_text(json.dumps(state), encoding='utf-8')
        self.args.resume = True
        with patch.object(stage.time, 'sleep'), patch.object(stage.urllib.request, 'urlopen',
                side_effect=[self.response({'at_bookmark': 'pending'}) for _ in range(6)]) as network:
            stage.run(self.args)
            self.assertEqual(network.call_count, 6)
            for call in network.call_args_list:
                self.assertEqual(json.loads(call.args[0].data)['action'], 'poll')


if __name__ == '__main__':
    unittest.main()
