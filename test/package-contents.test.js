'use strict';

// Pins the set of files published to npm (docs/DECISIONS.md, D10). It is the
// file set of 1.1.5 minus its old .npmignore, so adding a file to the repo
// can't silently add it to the package. Asks npm itself, via a dry-run pack.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function npm(args) {
  // Under `npm test` / `npm run`, npm_execpath points at npm's own CLI script,
  // which runs on this Node.js. Otherwise fall back to npm on the PATH.
  const cli = process.env.npm_execpath;
  const env = Object.assign({}, process.env);
  delete env.NODE_TEST_CONTEXT;
  const opts = { cwd: ROOT, env: env, encoding: 'utf8' };
  if (cli && /\.c?js$/.test(cli)) {
    return execFileSync(process.execPath, [cli].concat(args), opts);
  }
  return execFileSync('npm', args, Object.assign({ shell: process.platform === 'win32' }, opts));
}

test('the npm package contains exactly 1.1.5\'s files, minus its .npmignore', function () {
  const packed = JSON.parse(npm(['pack', '--dry-run', '--json', '--ignore-scripts']));
  const files = packed[0].files.map(function (f) { return f.path; }).sort();
  assert.deepEqual(files, [
    'LICENSE.md',
    'README.md',
    'bower.json',
    'component.json',
    'index.js',
    'package.json'
  ]);
});
