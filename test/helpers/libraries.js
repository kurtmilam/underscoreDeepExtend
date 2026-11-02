'use strict';

// Library matrix for the characterization suite (compatibility policy V.D).
//
// Every behavior test runs once per injected library. Each entry builds an
// instance of that library with deepExtend mixed in exactly the way the README
// tells consumers to: `_.mixin({ deepExtend: underscoreDeepExtend(_) })`.
//
// The mixin is not optional: the library calls `_.deepExtend` internally for
// nested values, so nested merges only work when it is mixed in under that
// exact name (pinned in test/characterization/api.test.js).

const { describe } = require('node:test');

// Resolve through package.json "main", the same way consumers do.
const factory = require('../..');

const libraries = [
  {
    name: 'underscore',
    create: function () {
      // underscore has no runInContext(); require() returns a shared singleton.
      // Mixing in again is idempotent, so this is safe across test files.
      const _ = require('underscore');
      _.mixin({ deepExtend: factory(_) });
      return _;
    },
  },
  {
    name: 'lodash',
    create: function () {
      // runInContext() gives a pristine, isolated lodash instance.
      const _ = require('lodash').runInContext();
      _.mixin({ deepExtend: factory(_) });
      return _;
    },
  },
];

const libraryNames = libraries.map(function (lib) { return lib.name; });

// Runs `body(_, name)` inside a describe() block per library.
function eachLibrary(body) {
  libraries.forEach(function (lib) {
    describe(lib.name, function () {
      body(lib.create(), lib.name);
    });
  });
}

// Per-library expectation for behavior that differs between libraries.
// Requires an entry for every library in the matrix, so adding a library
// forces a deliberate decision at every place behavior is known to differ.
function perLibrary(name, expectations) {
  libraryNames.forEach(function (n) {
    if (!Object.prototype.hasOwnProperty.call(expectations, n)) {
      throw new Error('perLibrary(): missing expectation for "' + n + '"');
    }
  });
  return expectations[name];
}

module.exports = { factory, libraries, libraryNames, eachLibrary, perLibrary };
