'use strict';

// Pins the library matrix (decisions log D6) and the rules of perLibrary().

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { libraries, libraryNames, families, perLibrary } = require('./helpers/libraries');

const pkg = require(path.join(__dirname, '..', 'package.json'));

describe('library matrix', function () {
  it('runs every behavior test against these library versions, in this order', function () {
    assert.deepEqual(libraryNames, [
      'underscore 1.13.8',
      'underscore 1.8.3',
      'underscore 1.2.1',
      'lodash 4.18.1',
      'lodash 3.10.1',
      'lodash 3.0.0',
    ]);
  });

  it('has the families underscore and lodash', function () {
    assert.deepEqual(families, ['underscore', 'lodash']);
  });

  it('installs each older version under an exact npm alias named after it', function () {
    const aliases = Object.keys(pkg.devDependencies).filter(function (dep) {
      return /^(underscore|lodash)-/.test(dep);
    });
    const expected = libraryNames
      .filter(function (name) {
        return name !== 'underscore ' + pkg.devDependencies.underscore &&
          name !== 'lodash ' + pkg.devDependencies.lodash;
      })
      .map(function (name) { return name.replace(' ', '-'); });
    assert.deepEqual(aliases.sort(), expected.sort());
    aliases.forEach(function (alias) {
      const parts = /^(underscore|lodash)-(.+)$/.exec(alias);
      assert.equal(pkg.devDependencies[alias], 'npm:' + parts[1] + '@' + parts[2]);
    });
  });

  it('creates a separate, working instance for each entry', function () {
    const instances = libraries.map(function (lib) { return lib.create(); });
    instances.forEach(function (_, i) {
      assert.equal(_.VERSION, libraryNames[i].split(' ')[1]);
      assert.deepEqual(_.deepExtend({ a: { b: 1 } }, { a: { c: 2 } }), { a: { b: 1, c: 2 } });
    });
  });
});

describe('perLibrary()', function () {
  it('returns the family expectation for every version in that family', function () {
    libraries.forEach(function (lib) {
      assert.equal(perLibrary(lib.name, { underscore: 'u', lodash: 'l' }), lib.family === 'underscore' ? 'u' : 'l');
    });
  });

  it('lets an exact entry name override its family for that version only', function () {
    const expectations = { underscore: 'u', lodash: 'l', 'lodash 3.0.0': 'old' };
    assert.equal(perLibrary('lodash 3.0.0', expectations), 'old');
    assert.equal(perLibrary('lodash 3.10.1', expectations), 'l');
  });

  it('throws when a family has no expectation', function () {
    assert.throws(function () {
      perLibrary('lodash 4.18.1', { lodash: 'l', 'underscore 1.13.8': 'u' });
    }, { message: 'perLibrary(): missing expectation for "underscore"' });
  });

  it('throws on a key that is neither a family nor an entry name', function () {
    assert.throws(function () {
      perLibrary('lodash 4.18.1', { underscore: 'u', lodash: 'l', 'lodash 2.4.2': 'x' });
    }, { message: 'perLibrary(): unknown key "lodash 2.4.2"' });
  });

  it('throws on an unknown library name', function () {
    assert.throws(function () {
      perLibrary('lodash 2.4.2', { underscore: 'u', lodash: 'l' });
    }, { message: 'unknown library "lodash 2.4.2"' });
  });
});
