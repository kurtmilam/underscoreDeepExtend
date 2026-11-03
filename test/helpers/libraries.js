'use strict';

// Library matrix for the characterization suite (compatibility policy V.D;
// decisions log D6).
//
// Every behavior test runs once per entry. Each entry builds an instance of
// that library with deepExtend mixed in exactly the way the README tells
// consumers to: `_.mixin({ deepExtend: underscoreDeepExtend(_) })`.
//
// The mixin is not optional: the library calls `_.deepExtend` internally for
// nested values, so nested merges only work when it is mixed in under that
// exact name (pinned in test/characterization/api.test.js).
//
// Entries are grouped into families (underscore, lodash). Older versions are
// installed under npm aliases (package.json devDependencies), e.g.
// "lodash-3.10.1": "npm:lodash@3.10.1". Each entry's name includes the
// version it actually loaded, read from that package's package.json.

const { describe } = require('node:test');

// Resolve through package.json "main", the same way consumers do.
const factory = require('../..');

function version(pkg) {
  return require(pkg + '/package.json').version;
}

// underscore has no runInContext(); require() returns a singleton per
// installed copy. Mixing in again is idempotent, so this is safe across
// test files.
function underscoreEntry(pkg) {
  return {
    family: 'underscore',
    name: 'underscore ' + version(pkg),
    create: function () {
      const _ = require(pkg);
      _.mixin({ deepExtend: factory(_) });
      return _;
    },
  };
}

// runInContext() gives a pristine, isolated lodash instance (lodash 1.1+).
function lodashEntry(pkg) {
  return {
    family: 'lodash',
    name: 'lodash ' + version(pkg),
    create: function () {
      const _ = require(pkg).runInContext();
      _.mixin({ deepExtend: factory(_) });
      return _;
    },
  };
}

// Newest first within each family. The unaliased packages are the primary
// versions (D5); the aliased ones bound each family's supported range (D6).
const libraries = [
  underscoreEntry('underscore'),
  underscoreEntry('underscore-1.8.3'),
  underscoreEntry('underscore-1.2.1'),
  lodashEntry('lodash'),
  lodashEntry('lodash-3.10.1'),
  lodashEntry('lodash-3.0.0'),
];

const libraryNames = libraries.map(function (lib) { return lib.name; });

const families = libraries.reduce(function (acc, lib) {
  return acc.indexOf(lib.family) === -1 ? acc.concat(lib.family) : acc;
}, []);

function libraryByName(name) {
  const found = libraries.filter(function (lib) { return lib.name === name; })[0];
  if (!found) {
    throw new Error('unknown library "' + name + '"');
  }
  return found;
}

// Runs `body(_, name)` inside a describe() block per matrix entry.
function eachLibrary(body) {
  libraries.forEach(function (lib) {
    describe(lib.name, function () {
      body(lib.create(), lib.name);
    });
  });
}

// Per-library expectation for behavior that differs between libraries.
//
// Keys are family names ("underscore", "lodash"), and every family must have
// one, so adding a family forces a deliberate decision at every place behavior
// is known to differ. A key may also be an exact entry name
// ("lodash 3.0.0"), which overrides its family's expectation for that version
// only. Unknown keys are rejected, so a typo can't silently fall back.
function perLibrary(name, expectations) {
  const has = function (key) {
    return Object.prototype.hasOwnProperty.call(expectations, key);
  };
  families.forEach(function (family) {
    if (!has(family)) {
      throw new Error('perLibrary(): missing expectation for "' + family + '"');
    }
  });
  Object.keys(expectations).forEach(function (key) {
    if (families.indexOf(key) === -1 && libraryNames.indexOf(key) === -1) {
      throw new Error('perLibrary(): unknown key "' + key + '"');
    }
  });
  return has(name) ? expectations[name] : expectations[libraryByName(name).family];
}

module.exports = { factory, libraries, libraryNames, families, eachLibrary, perLibrary };
