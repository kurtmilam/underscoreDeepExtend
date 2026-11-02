'use strict';

// Nested objects are merged recursively, in place.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary } = require('../helpers/libraries');

eachLibrary(function (_) {
  describe('deep merging', function () {
    it('merges nested objects at any depth', function () {
      assert.deepEqual(
        _.deepExtend(
          { a: { b: { c: 1, d: 1 }, e: 1 } },
          { a: { b: { d: 2, f: 2 } } }
        ),
        { a: { b: { c: 1, d: 2, f: 2 }, e: 1 } }
      );
    });

    it('an empty source object leaves the target object unchanged', function () {
      assert.deepEqual(_.deepExtend({ a: { x: 1 } }, { a: {} }), { a: { x: 1 } });
    });

    it('does not merge a plain object into a nested array, even with numeric keys', function () {
      // Both are objects, but the array branch runs first and rejects the pair.
      assert.throws(function () {
        _.deepExtend({ a: [1, 2] }, { a: { 0: 9 } });
      }, { message: 'Trying to combine an array with a non-array (a)' });
    });
  });

  describe('identity and mutation', function () {
    it('mutates a nested target object in place and keeps its identity', function () {
      const inner = { x: 1 };
      const target = { o: inner };
      _.deepExtend(target, { o: { y: 2 } });
      assert.equal(target.o, inner);
      assert.deepEqual(inner, { x: 1, y: 2 });
    });

    it('does not mutate nested source objects when merging into an existing target object', function () {
      const source = { o: { x: 1 } };
      _.deepExtend({ o: { y: 1 } }, source);
      assert.deepEqual(source, { o: { x: 1 } });
    });

    it('merging the same object into itself leaves it unchanged', function () {
      const obj = { a: { b: 1 }, c: [1, 2] };
      assert.equal(_.deepExtend(obj, obj), obj);
      assert.deepEqual(obj, { a: { b: 1 }, c: [1, 2] });
    });
  });
});
