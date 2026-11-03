'use strict';

// Keeps CHANGELOG.md usable as the source of GitHub release notes
// (docs/DECISIONS.md, D13).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parse, unwrap } = require('../scripts/changelog-entry.js');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'changelog-entry.js');
const entries = parse(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

test('CHANGELOG.md has an entry for package.json\'s version', function () {
  assert.ok(entries.some(function (e) { return e.version === pkg.version; }));
});

test('CHANGELOG.md has an entry for every version published to npm through 1.1.5 (D4)', function () {
  const published = ['0.0.1', '0.0.2', '0.0.3', '0.0.4', '0.0.5', '1.0.1', '1.0.4', '1.1.4', '1.1.5'];
  const listed = entries.map(function (e) { return e.version; });
  assert.deepEqual(published.filter(function (v) { return listed.indexOf(v) === -1; }), []);
});

test('CHANGELOG.md entries are unique, newest first, with non-increasing dates', function () {
  entries.slice(1).forEach(function (e, i) {
    const newer = entries[i];
    assert.ok(compareVersions(newer.version, e.version) > 0, newer.version + ' should come before ' + e.version);
    assert.ok(newer.date >= e.date, newer.version + ' is dated before ' + e.version);
  });
});

test('every CHANGELOG.md entry has a body and a link reference to its tag or changes', function () {
  entries.forEach(function (e) {
    assert.ok(e.body.length > 0, e.version + ' has no body');
    assert.match(e.link || '', /^https:\/\/github\.com\/kurtmilam\/underscoreDeepExtend\/(compare\/v[\d.]+\.\.\.v|releases\/tag\/v)/, e.version);
    assert.ok(e.link.endsWith('v' + e.version), e.version + '\'s link names another version');
  });
});

test('scripts/changelog-entry.js prints an entry\'s body, publish date and changes link', function () {
  const out = execFileSync(process.execPath, [SCRIPT, 'v1.1.5'], { encoding: 'utf8' });
  assert.match(out, /^The merge function was rewritten/);
  assert.doesNotMatch(out, /^## /m);
  assert.ok(out.endsWith('Published to npm on 2016-05-13 ([changes](https://github.com/kurtmilam/underscoreDeepExtend/compare/v1.1.4...v1.1.5)).\n'));
});

test('release notes join hard-wrapped paragraphs and list items into single lines', function () {
  const text = 'One\ntwo.\n\n### Changed\n\n- A\n  b.\n- C\n\nThree\nfour.';
  assert.equal(unwrap(text), 'One two.\n\n### Changed\n\n- A b.\n- C\n\nThree four.');
});

test('scripts/changelog-entry.js omits the changes link for the first version', function () {
  const out = execFileSync(process.execPath, [SCRIPT, '0.0.1'], { encoding: 'utf8' });
  assert.ok(out.endsWith('Published to npm on 2014-03-28.\n'));
});

test('scripts/changelog-entry.js fails for a version without an entry', function () {
  const r = spawnSync(process.execPath, [SCRIPT, '9.9.9'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /No CHANGELOG\.md entry for version "9\.9\.9"/);
});
