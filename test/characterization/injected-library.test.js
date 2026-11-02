'use strict';

// The methods the library uses on the injected underscore-compatible library
// are public API (compatibility policy V.B): anyone injecting a custom or
// partial library depends on this exact set.
//
// The README's dependency list names each, isArray, isDate, isNull, isObject,
// isString, isUndefined, clone and reject. The code also uses isFunction, and
// deepExtend itself (which must be mixed in).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { factory, libraries } = require('../helpers/libraries');

const USED_METHODS = [
  'clone', 'deepExtend', 'each', 'isArray', 'isDate', 'isFunction', 'isNull',
  'isObject', 'isString', 'isUndefined', 'reject',
];

// Inputs that drive every branch of the per-key dispatch, both type-mismatch
// errors, and a nested array with a null element.
function exerciseEveryBranch(deepExtend) {
  deepExtend(
    { a: 1, b: { x: 1 }, c: [1, 2], s: 'p', n: null, f: function () {}, d: new Date(0) },
    { a: 2, b: { y: 1 }, c: ['#{_}', null], s: '#{_}!', n: {}, f: 3, d: new Date(1), z: null, u: undefined }
  );
  [[{ k: [] }, { k: {} }], [{ k: {} }, { k: 1 }]].forEach(function (args) {
    assert.throws(function () { deepExtend(args[0], args[1]); });
  });
}

// Wraps a library so every property read is recorded.
function recordingProxy(real, seen) {
  return new Proxy(real, {
    get: function (target, key) {
      if (typeof key === 'string') seen.add(key);
      return target[key];
    },
  });
}

libraries.forEach(function (lib) {
  describe(lib.name, function () {
    it('uses exactly these methods of the injected library: ' + USED_METHODS.join(', '), function () {
      const real = lib.create();
      const seen = new Set();
      real.mixin({ deepExtend: factory(recordingProxy(real, seen)) });
      exerciseEveryBranch(real.deepExtend);
      assert.deepEqual(Array.from(seen).sort(), USED_METHODS);
    });

    it('works with an injected object that has only those methods', function () {
      const real = lib.create();
      const minimal = {};
      USED_METHODS.forEach(function (name) {
        if (name !== 'deepExtend') minimal[name] = real[name];
      });
      minimal.deepExtend = factory(minimal);
      assert.deepEqual(
        minimal.deepExtend({ a: { x: 1 }, b: [1, 2, 3] }, { a: { y: 2 }, b: ['#{_}', null] }),
        { a: { x: 1, y: 2 }, b: ['1', 3] }
      );
      exerciseEveryBranch(minimal.deepExtend);
    });
  });
});

describe('without isFunction (it is missing from the README\'s dependency list)', function () {
  it('throws TypeError as soon as a key is processed', function () {
    const lodash = require('lodash').runInContext();
    const minimal = {};
    USED_METHODS.forEach(function (name) {
      if (name !== 'deepExtend' && name !== 'isFunction') minimal[name] = lodash[name];
    });
    minimal.deepExtend = factory(minimal);
    // isUndefined and isNull short-circuit first, so use a defined, non-null target value.
    assert.throws(function () { minimal.deepExtend({ a: 1 }, { a: 2 }); }, TypeError);
  });
});
