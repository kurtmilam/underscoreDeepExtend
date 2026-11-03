'use strict';

// Pins what npm trusted publishing depends on (docs/DECISIONS.md, D12).
// npm only accepts a CI publish when package.json's repository matches the
// GitHub repository the workflow ran in, and the trusted publisher on
// npmjs.com is bound to the workflow's file name. Neither mismatch can be
// detected before publish day, so they are checked here instead.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'publish.yml');

test('package.json names the canonical GitHub repository in the form npm writes', function () {
  assert.deepEqual(pkg.repository, {
    type: 'git',
    url: 'git+https://github.com/kurtmilam/underscoreDeepExtend.git'
  });
});

test('the publish workflow exists under the file name the trusted publisher names', function () {
  assert.ok(fs.existsSync(WORKFLOW), '.github/workflows/publish.yml is missing');
});

test('the publish workflow only stages; it never publishes directly', function () {
  // Comments are dropped so the explanation at the top of the file can
  // mention the commands without tripping the check.
  const commands = fs.readFileSync(WORKFLOW, 'utf8')
    .split('\n')
    .filter(function (line) { return !/^\s*#/.test(line); })
    .join('\n');
  assert.match(commands, /\bnpm stage publish\b/);
  assert.doesNotMatch(commands, /\bnpm publish\b/);
  // No check for `npm stage approve`: npm refuses it over OIDC (it needs an
  // interactive login with two-factor), and the job summary quotes it.
  assert.doesNotMatch(commands, /NODE_AUTH_TOKEN|NPM_TOKEN|registry-url/);
});
