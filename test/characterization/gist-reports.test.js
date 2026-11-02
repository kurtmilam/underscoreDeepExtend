'use strict';

// Scenarios reported in the comments on the original gist
// (https://gist.github.com/1868955), pinned to what 1.1.5 does today.
// Each test cites the comment (author, date, comment id) it comes from.
// Several reports were answered with fixes; these tests show how far those
// fixes actually reach.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary, perLibrary } = require('../helpers/libraries');

eachLibrary(function (_, lib) {
  describe('functions (wulftone 2013-02-05 #767261, nntoan 2024-10-03 #5217865)', function () {
    it('a function assigned to a new key is not copied: it becomes an empty object', function () {
      const fn = function () {};
      const result = _.deepExtend({}, { foo: fn });
      assert.deepEqual(result.foo, {});
      assert.notEqual(result.foo, fn);
    });

    it('a function replacing another function becomes an empty object', function () {
      const result = _.deepExtend({ foo: function () {} }, { foo: function () {} });
      assert.deepEqual(result.foo, {});
    });

    it('a function replacing a function with properties keeps only the source function\'s own properties, as a plain object', function () {
      const target = function () {};
      target.a = 1;
      const source = function () {};
      source.b = 2;
      const result = _.deepExtend({ foo: target }, { foo: source });
      assert.deepEqual(result.foo, { b: 2 });
    });
  });

  describe('null deletes (kapooostin 2013-04-04 #810681)', function () {
    it('null replaces an object or array value on an object key, keeping the key', function () {
      assert.deepEqual(_.deepExtend({ a: { x: 1 }, b: [1] }, { a: null, b: null }), { a: null, b: null });
    });

    it('null removes object and array elements from a nested array', function () {
      assert.deepEqual(_.deepExtend({ a: [{ x: 1 }, [1], 3] }, { a: [null, null] }), { a: [3] });
    });
  });

  describe('dates (tkalfigo 2014-06-05 #1240838)', function () {
    it('a later Date replaces an earlier Date (underscore: as an empty object)', function () {
      const result = _.deepExtend({ a: new Date(1000) }, { a: new Date(2000) });
      assert.deepEqual(result.a, perLibrary(lib, {
        underscore: {},
        lodash: new Date(2000),
      }));
    });
  });

  describe('sources (vbarbarosh 2014-12-15 #1356616)', function () {
    it('merging into a new object does not mutate an earlier source\'s array', function () {
      const a = { name: 'a', items: [] };
      const result = _.deepExtend({}, a, { items: [1, 2, 3] });
      assert.deepEqual(a, { name: 'a', items: [] });
      assert.deepEqual(result, { name: 'a', items: [1, 2, 3] });
    });
  });

  describe('null target values (Xflofoxx 2015-03-05 #1406217)', function () {
    it('an object source replaces a null target value without throwing', function () {
      assert.deepEqual(
        _.deepExtend({ title: null }, { title: { 'en-GB': 'My Title' } }),
        { title: { 'en-GB': 'My Title' } }
      );
    });
  });

  describe('copies shared with the source (pavelthq 2015-05-22 #1458815)', function () {
    it('changing a first-level value of the result does not change the source', function () {
      const x = { defaults: { color: 'red' } };
      const y = _.deepExtend({}, x);
      y.defaults.color = 'blue';
      assert.equal(x.defaults.color, 'red');
    });

    it('changing a second-level value of the result DOES change the source', function () {
      const x = { defaults: { inner: { color: 'red' } } };
      const y = _.deepExtend({}, x);
      y.defaults.inner.color = 'blue';
      assert.equal(x.defaults.inner.color, 'blue');
    });
  });
});
