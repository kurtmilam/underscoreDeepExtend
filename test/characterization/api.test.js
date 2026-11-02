'use strict';

// Call signature, return value, argument handling and the mixin requirement.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { factory, eachLibrary } = require('../helpers/libraries');

eachLibrary(function (_) {
  describe('return value', function () {
    it('returns the first argument itself (same reference)', function () {
      const target = {};
      assert.equal(_.deepExtend(target, { a: 1 }), target);
    });

    it('returns the target unchanged when no sources are given', function () {
      const target = { a: 1 };
      assert.equal(_.deepExtend(target), target);
      assert.deepEqual(target, { a: 1 });
    });

    it('returns undefined when called with no arguments', function () {
      assert.equal(_.deepExtend(), undefined);
    });

    it('accepts an array as the target and returns it', function () {
      const target = [1, 2];
      assert.equal(_.deepExtend(target, [3]), target);
      assert.deepEqual(target, [3, 2]);
    });
  });

  describe('sources', function () {
    it('applies any number of sources, left to right', function () {
      assert.deepEqual(
        _.deepExtend({ a: 0 }, { a: 1, b: 1 }, { a: 2 }, { c: 3 }),
        { a: 2, b: 1, c: 3 }
      );
    });

    it('does not mutate top-level sources', function () {
      const source = { o: { x: 1 }, a: [1, 2] };
      _.deepExtend({ o: { y: 1 }, a: [9, 9, 9] }, source);
      assert.deepEqual(source, { o: { x: 1 }, a: [1, 2] });
    });

    it('copies only own enumerable string keys (inherited, non-enumerable and symbol keys are ignored)', function () {
      const source = Object.create({ inherited: 1 });
      source.own = 2;
      Object.defineProperty(source, 'hidden', { value: 3, enumerable: false });
      source[Symbol('sym')] = 4;
      const result = _.deepExtend({}, source);
      assert.deepEqual(result, { own: 2 });
      assert.deepEqual(Object.getOwnPropertySymbols(result), []);
    });

    it('treats an arguments object as an object source', function () {
      const args = (function () { return arguments; })(5);
      assert.deepEqual(_.deepExtend({ a: { 0: 1 } }, { a: args }), { a: { 0: 5 } });
    });

    it('coerces a string source to its indexed characters (ES2015+ Object.keys; an ES5 engine throws TypeError)', function () {
      assert.deepEqual(_.deepExtend({}, 'ab'), { 0: 'a', 1: 'b' });
    });

    it('ignores a number or boolean source (ES2015+ Object.keys; an ES5 engine throws TypeError)', function () {
      assert.deepEqual(_.deepExtend({ a: 1 }, 5, true), { a: 1 });
    });
  });
});

describe('mixin requirement (library-independent)', function () {
  const lodash = require('lodash').runInContext();

  it('flat merges work without mixing in', function () {
    const deepExtend = factory(lodash);
    assert.deepEqual(deepExtend({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
  });

  it('nested merges throw TypeError unless mixed in as _.deepExtend', function () {
    const deepExtend = factory(lodash);
    assert.throws(function () {
      deepExtend({ a: {} }, { a: { b: 1 } });
    }, TypeError);
  });

  it('nested merges call whatever _.deepExtend is at call time', function () {
    const isolated = require('lodash').runInContext();
    const deepExtend = factory(isolated);
    const calls = [];
    isolated.mixin({
      deepExtend: function (target, source) {
        calls.push([target, source]);
        return 'replaced';
      },
    });
    const result = deepExtend({ a: { x: 1 } }, { a: { y: 2 } });
    assert.equal(calls.length, 1);
    assert.deepEqual(result, { a: 'replaced' });
  });
});
