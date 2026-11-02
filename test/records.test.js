'use strict';

// Keeps docs/QUIRKS.md honest: every test it cites must exist under that exact
// name. Names are collected by running the rest of the suite with the TAP
// reporter, so dynamically built test names are checked too.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const QUIRKS = path.join(ROOT, 'docs', 'QUIRKS.md');

function testFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (acc, entry) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return acc.concat(testFiles(full));
    if (entry.name.endsWith('.test.js') && full !== __filename) return acc.concat(full);
    return acc;
  }, []);
}

function actualTestNames() {
  // node:test marks child processes with NODE_TEST_CONTEXT, which switches
  // their output to an internal protocol. Clear it to get plain TAP.
  const env = Object.assign({}, process.env);
  delete env.NODE_TEST_CONTEXT;
  let out;
  try {
    out = execFileSync(process.execPath,
      ['--test', '--test-reporter=tap'].concat(testFiles(__dirname)),
      { cwd: ROOT, env: env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    out = err.stdout; // failing tests still have names; other tests report them
  }
  const names = new Set();
  out.split('\n').forEach(function (line) {
    const m = /^\s*(?:not )?ok \d+ - (.*?)(?: # .*)?$/.exec(line);
    if (m) names.add(m[1].replace(/\\#/g, '#').replace(/\\\\/g, '\\'));
  });
  return names;
}

function citedTests() {
  return fs.readFileSync(QUIRKS, 'utf8').split('\n').reduce(function (acc, line) {
    const m = /^- `([^`]+)`: "(.*)"$/.exec(line);
    return m ? acc.concat({ file: m[1], name: m[2].replace(/\\"/g, '"') }) : acc;
  }, []);
}

test('every test cited in docs/QUIRKS.md exists in the cited file, under that exact name', function () {
  const cited = citedTests();
  assert.ok(cited.length > 0, 'no citations found; has the citation format changed?');
  const names = actualTestNames();
  const missing = cited.filter(function (c) {
    return !fs.existsSync(path.join(ROOT, c.file)) || !names.has(c.name);
  });
  assert.deepEqual(missing, []);
});
