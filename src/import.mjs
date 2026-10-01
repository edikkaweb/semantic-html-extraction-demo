import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const pin = JSON.parse(fs.readFileSync(path.join(root, 'originals/pin.json')));
export const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const get = (object, field) => field.split('.').reduce((o, key) => o?.[key], object);
export const tools = [
  ['readability', 'Mozilla Readability', '@mozilla/readability', 'content'],
  ['trafilatura', 'Trafilatura', 'trafilatura', 'xml'],
  ['readability_lxml', 'readability-lxml', 'readability_lxml', 'html'],
  ['newspaper4k', 'newspaper4k', 'newspaper4k', 'html'],
  ['justext', 'jusText', 'justext', 'text'],
  ['html2text', 'html2text', 'html2text', 'markdown'],
  ['markdownify', 'markdownify', 'markdownify', 'markdown'],
];

// Minimal ZIP reader for this pinned archive only. No entry is executed or extracted to disk.
// The archive SHA-256 is checked BEFORE parsing; each member is checked against its manifest.
export function readPackage(bytes) {
  assert.equal(hash(bytes), pin.sha256, 'ZIP SHA-256 mismatch: refusing import (expected pin is not changed)');
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  assert(end >= 0, 'ZIP end record missing');
  assert.equal(bytes.readUInt16LE(end + 4), 0, 'Split ZIP not supported');
  const count = bytes.readUInt16LE(end + 10);
  assert(count > 0 && count < 500, 'Unexpected ZIP entry count');
  let pos = bytes.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(pos), 0x02014b50, 'Invalid central directory');
    const method = bytes.readUInt16LE(pos + 10), size = bytes.readUInt32LE(pos + 20);
    const length = bytes.readUInt32LE(pos + 24), nameLength = bytes.readUInt16LE(pos + 28);
    const name = bytes.subarray(pos + 46, pos + 46 + nameLength).toString('utf8');
    const prefix = `semantic-html-extraction-v${pin.package_version}/`;
    assert(name.startsWith(prefix) && !name.split('/').includes('..') && !name.includes('\\'), `Unsafe ZIP path: ${name}`);
    const entry = name.slice(prefix.length);
    assert(!files.has(entry), `Duplicate member: ${entry}`);
    const local = bytes.readUInt32LE(pos + 42);
    assert.equal(bytes.readUInt32LE(local), 0x04034b50, `Invalid local header: ${entry}`);
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    assert(start + size <= bytes.length && length <= 32 * 1024 * 1024, `Invalid member size: ${entry}`);
    const packed = bytes.subarray(start, start + size);
    assert([0, 8].includes(method), `Unsupported ZIP compression: ${method}`);
    const data = method === 0 ? packed : inflateRawSync(packed, {maxOutputLength: 32 * 1024 * 1024});
    assert.equal(data.length, length, `ZIP member size mismatch: ${entry}`);
    if (!name.endsWith('/')) files.set(entry, data);
    pos += 46 + nameLength + bytes.readUInt16LE(pos + 30) + bytes.readUInt16LE(pos + 32);
  }
  const manifest = JSON.parse(files.get('manifest.json'));
  for (const key of ['package_version', 'protocol_version', 'evaluation_version']) assert.equal(manifest[key], pin[key], key);
  assert.equal(files.size, manifest.files.length + 1, 'Unmanifested member(s)');
  for (const entry of manifest.files) {
    const data = files.get(entry.path);
    assert(data, `Missing manifest member: ${entry.path}`);
    assert.equal(data.length, entry.bytes, `Manifest size mismatch: ${entry.path}`);
    assert.equal(hash(data), entry.sha256, `Manifest SHA-256 mismatch: ${entry.path}`);
  }
  return {files, manifest};
}

export function derive({files, manifest}) {
  const json = name => JSON.parse(files.get(name));
  const results = json('results.json'), real = json('real-pages/results.json');
  assert.equal(results.protocol_version, pin.protocol_version);
  assert.equal(results.evaluation_revision.version, pin.evaluation_version);
  assert.equal(results.evaluation_revision.extraction_rerun, false);
  assert.equal(results.cases.length, 12);
  const revised = results.evaluation_revision;
  for (const entry of [revised.original_aggregate, ...revised.raw_outputs]) assert.equal(hash(files.get(entry.path)), entry.sha256, `Revised reference: ${entry.path}`);
  const ids = new Set();
  const cases = results.cases.map((c, index) => {
    assert(!ids.has(c.id), `Duplicate case: ${c.id}`); ids.add(c.id);
    assert(['heading', 'table', 'caveat'].includes(c.family) && ['fr', 'en'].includes(c.language));
    const raw = json(c.raw_output), html = files.get(c.fixture).toString('utf8');
    assert.equal(hash(files.get(c.fixture)), c.html_sha256, `Fixture: ${c.id}`);
    for (const k of ['id', 'pair_id', 'family', 'language', 'variant', 'html_sha256']) assert.equal(raw[k], c[k], `Raw reference ${c.id}.${k}`);
    assert.equal(c.evaluation.schema_version, 2);
    const outcomes = Object.fromEntries(tools.map(([id, label, versionKey, outputKey], toolIndex) => {
      const verdict = c.evaluation.relation[id];
      assert(verdict, `Missing corrected verdict ${c.id}/${id}`);
      assert.equal(verdict.status, c.tools[id], `Status disagreement ${c.id}/${id}`);
      const field = ['readability', 'trafilatura'].includes(id) ? id : `additional_extractors.${id}`;
      const tool = get(raw, field);
      assert.equal(tool.status, verdict.status, `Raw status disagreement ${c.id}/${id}`);
      assert.equal(tool.version, results.tool_versions[versionKey], `Tool version ${c.id}/${id}`);
      const output = verdict.output_field ? get(raw, verdict.output_field) : get(raw, `${field}.${outputKey}`) ?? null;
      if (verdict.output_field) {
        assert.equal(typeof output, 'string', `Output field ${c.id}/${id}`);
        assert.equal(hash(output), verdict.output_sha256, `Output SHA-256 ${c.id}/${id}`);
      }
      if (verdict.status === 'no_output') assert(!output, `Unexpected no_output content ${c.id}/${id}`);
      return [id, {label, version: tool.version, class: toolIndex < 5 ? 'content_extractor' : 'markdown_converter',
        verdict, output, configuration: tool.configuration ?? null, rawTool: tool,
        source: {file: 'results.json', pointer: `/cases/${index}/evaluation/relation/${id}`, raw: c.raw_output,
          outputField: verdict.output_field ?? `${field}.${outputKey}`, outputFieldEvaluated: Boolean(verdict.output_field)}}];
    }));
    const pattern = c.family === 'heading' ? /<(h2|div) class="case-marker">[\s\S]*?<\/\1>/ : c.family === 'caveat' ? /<(p|aside) class="case-caveat">[\s\S]*?<\/\1>/ : /<table>[\s\S]*?<\/table>/;
    const inputExcerpt = html.match(pattern)?.[0];
    assert(inputExcerpt, `Treatment excerpt missing ${c.id}`);
    return {...c, sourceIndex: index, html, inputExcerpt, outcomes};
  });
  for (const family of ['heading', 'table', 'caveat']) for (const language of ['fr', 'en']) {
    const pair = cases.filter(c => c.family === family && c.language === language);
    assert.equal(pair.length, 2, `Incomplete pair ${family}/${language}`);
    assert.equal(pair[0].visible_text_sha256, pair[1].visible_text_sha256, `Pair text disagreement ${family}/${language}`);
    for (const c of pair) {assert.equal(c.visible_text_equality_with_pair, true); assert.equal(c.pair_markup_equal_after_masking_treatment, true);}
  }
  assert.equal(real.pages.length, 8);
  const pages = real.pages.map((page, index) => {
    const input = `real-pages/${page.input}`, rawPath = `real-pages/${page.raw_output}`, raw = json(rawPath);
    assert.equal(hash(files.get(input)), page.source_html_sha256, `Real page input: ${page.id}`);
    assert.equal(files.get(input).length, page.source_bytes, `Real page size: ${page.id}`);
    for (const key of ['id', 'source_html_sha256', 'deterministic_replay']) assert.equal(raw[key], page[key], `Real page reference ${page.id}.${key}`);
    assert.deepEqual(raw.component_replays, page.component_replays);
    for (const [id] of tools) assert.equal(get(raw.outputs, ['readability', 'trafilatura'].includes(id) ? id : `additional_extractors.${id}`).status, page.statuses[id]);
    if (!page.deterministic_replay) assert(raw.nondeterministic_outputs?.newspaper4k?.first && raw.nondeterministic_outputs?.newspaper4k?.replay, 'Missing unstable outputs');
    return {...page, input, rawPath, raw, sourceIndex: index, archivedOn: '2026-09-11', archiveDateSource: 'real-pages/results.json#/sampling/method'};
  });
  return {demoVersion: '1.0.0', provenance: {...pin, manifestSha256: hash(files.get('manifest.json')), verifiedMembers: manifest.files.length},
    executedAt: results.executed_at, evaluatedOn: revised.reviewed_on, versions: results.tool_versions, cases,
    real: {...real, pages}, counterTests: results.evaluator_counter_tests, determinism: results.determinism_control,
    mapping: {verdicts: 'results.json#/cases/*/evaluation/relation/* (copied verbatim)', outputs: 'Unmodified strings from each raw output, addressed by output_field',
      inputExcerpt: 'Exact substring of the corresponding fixture (class case-marker/case-caveat or table)',
      archiveDate: '2026-09-11, explicitly stated in real-pages/results.json sampling.method',
      historical: 'Raw evaluation fields and results-original-v1.2.0.json are preserved but never used as displayed verdicts'}};
}

export async function importData({download = false, verifyOnly = false} = {}) {
  let bytes;
  if (download) {
    const response = await fetch(pin.url);
    assert(response.ok, `Download failed: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else bytes = fs.readFileSync(path.join(root, 'originals', pin.file));
  const archive = readPackage(bytes), data = derive(archive);
  if (download) assert.equal(hash(fs.readFileSync(path.join(root, 'originals', pin.file))), hash(bytes), 'Remote and embedded archive differ');
  if (!verifyOnly) {
    fs.mkdirSync(path.join(root, 'data'), {recursive: true});
    fs.writeFileSync(path.join(root, 'data/display.json'), JSON.stringify(data, null, 2) + '\n');
  }
  return {archive, data, bytes};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {data} = await importData({download: process.argv.includes('--download'), verifyOnly: process.argv.includes('--verify-only')});
  console.log(`Verified package ${pin.package_version}: ${data.provenance.verifiedMembers} members, 12 fixtures, 84 tool verdicts, 8 real pages. No extraction executed.`);
}
