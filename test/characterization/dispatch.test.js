'use strict';

// How each key is handled. For every own key of a source, the library compares
// the target's current value (oProp) with the source value (sProp) and takes
// the FIRST matching branch:
//
//   1. assign:  oProp is undefined, null or a function,
//               or sProp is null or a Date          -> target[k] = _.clone(sProp)
//   2. regex:   sProp is a string containing #{_}   -> string replace
//   3. array:   either side is an array             -> deep merge (both must be arrays)
//   4. object:  either side is an object            -> deep merge (both must be objects)
//   5. else:    primitives                          -> target[k] = _.clone(sProp)
//
// Branch 1 uses the injected library's _.clone, which is SHALLOW and differs
// between libraries for Dates, RegExps and functions.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary, perLibrary } = require('../helpers/libraries');

eachLibrary(function (_, lib) {
  describe('primitives', function () {
    it('overwrites primitives with primitives of any type', function () {
      assert.deepEqual(
        _.deepExtend({ a: 1, b: true, c: 's', d: 1 }, { a: 2, b: false, c: 't', d: 'x' }),
        { a: 2, b: false, c: 't', d: 'x' }
      );
    });

    it('adds keys missing from the target', function () {
      assert.deepEqual(_.deepExtend({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
    });

    it('assigns an explicit undefined over a primitive, creating the key if absent', function () {
      const result = _.deepExtend({ a: 1 }, { a: undefined, b: undefined });
      assert.deepEqual(result, { a: undefined, b: undefined });
      assert.equal('b' in result, true);
    });
  });

  describe('null', function () {
    it('null in the source overwrites anything, including objects and arrays', function () {
      assert.deepEqual(
        _.deepExtend({ a: { x: 1 }, b: [1], c: 's' }, { a: null, b: null, c: null }),
        { a: null, b: null, c: null }
      );
    });

    it('anything replaces null in the target', function () {
      assert.deepEqual(
        _.deepExtend({ a: null, b: null }, { a: { x: 1 }, b: [1] }),
        { a: { x: 1 }, b: [1] }
      );
    });
  });

  describe('assignment uses a shallow _.clone', function () {
    it('a new object is copied, but its nested values are shared with the source', function () {
      const source = { o: { deep: { x: 1 } } };
      const result = _.deepExtend({}, source);
      assert.notEqual(result.o, source.o);
      assert.equal(result.o.deep, source.o.deep);
    });

    it('a new array is copied, but its elements are shared with the source', function () {
      const source = { a: [{ x: 1 }] };
      const result = _.deepExtend({}, source);
      assert.notEqual(result.a, source.a);
      assert.equal(result.a[0], source.a[0]);
    });

    it('shared nested values let a LATER merge mutate an earlier source', function () {
      const first = { o: { deep: { x: 1 } } };
      const result = _.deepExtend({}, first);
      _.deepExtend(result, { o: { deep: { y: 2 } } });
      assert.deepEqual(first, { o: { deep: { x: 1, y: 2 } } });
    });
  });

  describe('functions', function () {
    it('a function source value for a new key becomes a plain empty object', function () {
      const fn = function () {};
      const result = _.deepExtend({}, { f: fn });
      assert.deepEqual(result.f, {});
      assert.equal(typeof result.f, 'object');
    });

    it('a function in the target is replaced by the (cloned) source value', function () {
      assert.deepEqual(_.deepExtend({ f: function () {} }, { f: 1 }), { f: 1 });
      assert.deepEqual(_.deepExtend({ f: function () {} }, { f: { x: 1 } }), { f: { x: 1 } });
    });

    it('a function source merged into an object target contributes its own enumerable properties', function () {
      const fn = function () {};
      fn.x = 1;
      assert.deepEqual(_.deepExtend({ f: { a: 1 } }, { f: fn }), { f: { a: 1, x: 1 } });
    });
  });

  describe('dates', function () {
    it('a Date source value is cloned onto a new key', function () {
      const date = new Date(0);
      const result = _.deepExtend({}, { d: date });
      assert.notEqual(result.d, date);
      assert.deepEqual(result.d, perLibrary(lib, {
        underscore: {}, // underscore's _.clone turns a Date into a plain empty object
        lodash: new Date(0),
      }));
    });

    it('a Date source value replaces an existing Date', function () {
      const result = _.deepExtend({ d: new Date(1) }, { d: new Date(0) });
      assert.deepEqual(result.d, perLibrary(lib, {
        underscore: {},
        lodash: new Date(0),
      }));
    });

    it('a Date source value replaces an existing primitive or object without throwing', function () {
      const result = _.deepExtend({ a: 1, b: { x: 1 } }, { a: new Date(0), b: new Date(0) });
      const expected = perLibrary(lib, { underscore: {}, lodash: new Date(0) });
      assert.deepEqual(result, { a: expected, b: expected });
    });

    it('an object source merges INTO a Date target, mutating that Date', function () {
      const date = new Date(0);
      const result = _.deepExtend({ d: date }, { d: { x: 1 } });
      assert.equal(result.d, date);
      assert.equal(date.x, 1);
    });
  });

  describe('regular expressions', function () {
    it('a RegExp source value for a new key is cloned', function () {
      const result = _.deepExtend({}, { r: /a/g });
      assert.deepEqual(result.r, perLibrary(lib, {
        underscore: {}, // underscore's _.clone turns a RegExp into a plain empty object
        lodash: /a/g,
      }));
    });

    it('a RegExp source value over an existing object merges its (non-existent) own keys', function () {
      assert.deepEqual(_.deepExtend({ r: { x: 1 } }, { r: /a/ }), { r: { x: 1 } });
    });
  });
});
