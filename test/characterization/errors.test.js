'use strict';

// Thrown errors are public API (compatibility policy V.B).
// The library's own errors are plain Error instances with exact messages that
// end in the key name. Errors from bad arguments are engine TypeErrors; only
// their type is pinned, since their messages vary between JS engines.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary } = require('../helpers/libraries');

function exactError(message) {
  return function (err) {
    // A plain Error: not a TypeError or another subclass.
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'Error');
    assert.equal(err instanceof TypeError, false);
    assert.equal(err.message, message);
    return true;
  };
}

eachLibrary(function (_) {
  describe('type mismatches', function () {
    const ARRAY = 'Trying to combine an array with a non-array (k)';
    const OBJECT = 'Trying to combine an object with a non-object (k)';
    const cases = [
      ['array target, object source', { k: [] }, { k: {} }, ARRAY],
      ['object target, array source', { k: {} }, { k: [] }, ARRAY],
      ['array target, string source', { k: [1] }, { k: 'x' }, ARRAY],
      ['array target, number source', { k: [1] }, { k: 1 }, ARRAY],
      ['number target, array source', { k: 1 }, { k: [1] }, ARRAY],
      ['object target, number source', { k: {} }, { k: 1 }, OBJECT],
      ['object target, string source', { k: { x: 1 } }, { k: 'x' }, OBJECT],
      ['object target, boolean source', { k: {} }, { k: false }, OBJECT],
      ['object target, undefined source value', { k: { x: 1 } }, { k: undefined }, OBJECT],
      ['number target, object source', { k: 1 }, { k: {} }, OBJECT],
      ['string target, object source', { k: 's' }, { k: {} }, OBJECT],
    ];
    cases.forEach(function (c) {
      it(c[0] + ' throws "' + c[3] + '"', function () {
        assert.throws(function () { _.deepExtend(c[1], c[2]); }, exactError(c[3]));
      });
    });

    it('names only the immediate key, not the full path', function () {
      assert.throws(function () {
        _.deepExtend({ outer: { inner: {} } }, { outer: { inner: 1 } });
      }, exactError('Trying to combine an object with a non-object (inner)'));
    });

    it('names the index for array elements', function () {
      assert.throws(function () {
        _.deepExtend({ a: [{}] }, { a: [1] });
      }, exactError('Trying to combine an object with a non-object (0)'));
    });

    it('a #{_} string can replace an object or array without throwing', function () {
      assert.deepEqual(
        _.deepExtend({ o: { x: 1 }, a: [1] }, { o: '#{_}!', a: '#{_}!' }),
        { o: '[object Object]!', a: '1!' }
      );
    });
  });

  describe('partial mutation before a throw', function () {
    it('keys processed before the failing key stay merged', function () {
      const target = { a: 1, b: {}, c: 1 };
      assert.throws(function () { _.deepExtend(target, { a: 2, b: 1, c: 2 }); });
      assert.deepEqual(target, { a: 2, b: {}, c: 1 });
    });

    it('earlier sources stay applied when a later source throws', function () {
      const target = { a: 1, b: {} };
      assert.throws(function () { _.deepExtend(target, { a: 2 }, { b: 1 }); });
      assert.deepEqual(target, { a: 2, b: {} });
    });
  });

  describe('invalid arguments', function () {
    it('a null source throws TypeError', function () {
      assert.throws(function () { _.deepExtend({ a: 1 }, null); }, TypeError);
    });

    it('an undefined source throws TypeError', function () {
      assert.throws(function () { _.deepExtend({ a: 1 }, undefined); }, TypeError);
    });

    it('sources before a null source are still applied', function () {
      const target = {};
      assert.throws(function () { _.deepExtend(target, { a: 1 }, null); }, TypeError);
      assert.deepEqual(target, { a: 1 });
    });

    it('a null or undefined target throws TypeError when there is a source key', function () {
      assert.throws(function () { _.deepExtend(null, { a: 1 }); }, TypeError);
      assert.throws(function () { _.deepExtend(undefined, { a: 1 }); }, TypeError);
    });

    it('a null target with an empty source is returned without error', function () {
      assert.equal(_.deepExtend(null, {}), null);
    });
  });
});
