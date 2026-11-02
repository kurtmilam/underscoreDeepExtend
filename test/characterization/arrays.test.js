'use strict';

// Arrays are merged index by index, like objects with numeric keys.
// For a NESTED array the library then removes null elements with _.reject and
// assigns the resulting NEW array to the parent key. The top-level target is
// never filtered.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary } = require('../helpers/libraries');

eachLibrary(function (_) {
  describe('index-wise merging', function () {
    it('overwrites matching indexes and keeps the rest of a longer target', function () {
      assert.deepEqual(_.deepExtend([1, 2, 3], [9]), [9, 2, 3]);
    });

    it('extends the target with the extra elements of a longer source', function () {
      assert.deepEqual(_.deepExtend([1], ['#{_}', 2, 3]), ['1', 2, 3]);
    });

    it('skips holes in a sparse source', function () {
      // eslint-disable-next-line no-sparse-arrays
      assert.deepEqual(_.deepExtend([1, 2, 3], [, 9]), [1, 9, 3]);
    });

    it('deep-merges objects at the same index', function () {
      assert.deepEqual(
        _.deepExtend({ a: [{ x: 1, y: 1 }, { x: 2 }] }, { a: [{ y: 9 }] }),
        { a: [{ x: 1, y: 9 }, { x: 2 }] }
      );
    });

    it('deep-merges nested arrays at the same index', function () {
      assert.deepEqual(_.deepExtend({ a: [[1, 2], [3]] }, { a: [[9]] }), { a: [[9, 2], [3]] });
    });

    it('an empty source array leaves a nested target array\'s contents unchanged', function () {
      assert.deepEqual(_.deepExtend({ a: [1, 2] }, { a: [] }), { a: [1, 2] });
    });
  });

  describe('null elements', function () {
    it('removes nulls from a nested array (shifting later elements down)', function () {
      assert.deepEqual(_.deepExtend({ a: [1, 2, 3, 4] }, { a: [9, null] }), { a: [9, 3, 4] });
    });

    it('also removes nulls that were already in the target\'s nested array', function () {
      assert.deepEqual(_.deepExtend({ a: [1, null, 3] }, { a: [] }), { a: [1, 3] });
    });

    it('keeps undefined elements in a nested array', function () {
      assert.deepEqual(_.deepExtend({ a: [1, 2] }, { a: [undefined] }), { a: [undefined, 2] });
    });

    it('does NOT remove nulls from a top-level array target', function () {
      assert.deepEqual(_.deepExtend([1, 2, 3], [9, null]), [9, null, 3]);
    });

    it('does not filter a nested array that was assigned rather than merged', function () {
      assert.deepEqual(_.deepExtend({}, { a: [1, null] }), { a: [1, null] });
    });
  });

  describe('identity and mutation', function () {
    it('replaces a merged nested array with a new array', function () {
      const inner = [1, 2];
      const target = { a: inner };
      _.deepExtend(target, { a: [9] });
      assert.notEqual(target.a, inner);
    });

    it('still mutates the original nested array in place, nulls included', function () {
      const inner = [1, 2, 3];
      const target = { a: inner };
      _.deepExtend(target, { a: [9, null] });
      assert.deepEqual(inner, [9, null, 3]);
      assert.deepEqual(target.a, [9, 3]);
    });

    it('mutates a top-level array target in place', function () {
      const target = [1, 2];
      _.deepExtend(target, [9]);
      assert.deepEqual(target, [9, 2]);
    });
  });

  describe('arrays and plain objects', function () {
    it('an array target and an object source merge by key at the top level', function () {
      assert.deepEqual(_.deepExtend([1, 2], { 0: 9, x: 1 }), Object.assign([9, 2], { x: 1 }));
    });

    it('an object target and an array source merge by index at the top level', function () {
      assert.deepEqual(_.deepExtend({ a: 1 }, [9]), { a: 1, 0: 9 });
    });
  });
});
