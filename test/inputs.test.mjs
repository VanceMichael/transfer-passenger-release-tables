import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {readBundle} from '../scripts/inspect.mjs';

test('资料可按声明的主键和字段完整读取', async () => {
  const bundle = await readBundle();
  assert(Object.values(bundle).every(rows => rows.length > 0));
  const {movement, boarding, link, publications, requests} = bundle;
  assert(boarding.every(row => movement.some(observation => observation.id === row.movement)));
  assert(link.every(row => movement.find(observation => observation.id === row.arriving)?.direction === 'arrive' &&
    movement.find(observation => observation.id === row.leaving)?.direction === 'depart'));
  assert(link.some(row => row.replaces && link.some(previous => previous.id === row.replaces)));
  assert(requests.some(row => publications.some(publication => publication.period === row.period && publication.cohort === row.cohort)));
});

test('读取资料时拒绝重复主键', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'record-check-'));
  try {
    await writeFile(join(dir, 'manifest.json'), '{"entries":{"fields":["id","value"],"key":["id"]}}');
    await writeFile(join(dir, 'entries.json'), '[{"id":"x","value":1},{"id":"x","value":2}]');
    await assert.rejects(readBundle(pathToFileURL(dir + '/')), /主键/);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
