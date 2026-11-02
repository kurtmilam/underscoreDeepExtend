'use strict';

// Every example from README.md, pinned to what 1.1.5 ACTUALLY returns.
//
// Several examples do not match the output the README claims. Those are marked
// "README DISCREPANCY" below. Per compatibility policy V.A, the tests pin the
// real behavior; whether to fix the code or the README is a separate decision.

const { it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary } = require('../helpers/libraries');

eachLibrary(function (_) {
  it('concatenates strings with the #{_} placeholder', function () {
    const obj = _.deepExtend(
      { url: 'www.example.com' },
      { url: 'http://#{_}/path/to/file.html' }
    );
    assert.equal(obj.url, 'http://www.example.com/path/to/file.html');
  });

  it('README DISCREPANCY: #{_} placeholders stringify non-string parent values', function () {
    // README claims: [ 100, { id: 1234 }, false, "foo", [ 250, 500 ] ]
    const arr = _.deepExtend(
      [100, { id: 1234 }, true, 'foo', [250, 500]],
      ['#{_}', '#{_}', false, '#{_}', '#{_}']
    );
    assert.deepEqual(arr, ['100', '[object Object]', false, 'foo', '250,500']);
  });

  it('README DISCREPANCY: {} and [] keep the parent object/array, but #{_} still stringifies the number', function () {
    // README claims: [ 100, { id: 1234 }, false, "foo", [ 250, 500 ] ]
    const arr = _.deepExtend(
      [100, { id: 1234 }, true, 'foo', [250, 500]],
      ['#{_}', {}, false, '#{_}', []]
    );
    assert.deepEqual(arr, ['100', { id: 1234 }, false, 'foo', [250, 500]]);
  });

  it('README DISCREPANCY: a shorter child array leaves trailing parent elements untouched', function () {
    // README claims: [ 100, { id: 1234 }, false, "foo", [ 250, 500 ] ]
    const arr = _.deepExtend(
      [100, { id: 1234 }, true, 'foo', [250, 500]],
      ['#{_}', {}, false]
    );
    assert.deepEqual(arr, ['100', { id: 1234 }, false, 'foo', [250, 500]]);
  });

  it('merges arrays index by index, so order matters', function () {
    assert.deepEqual(_.deepExtend([1, 2, 3, 4], [1, 4, 3, 2]), [1, 4, 3, 2]);
  });

  it('README DISCREPANCY: null removes a nested array element, but #{_} stringifies the kept number', function () {
    // README claims: [ 1, 3, 4 ]
    const obj = _.deepExtend(
      { arr: [1, 2, 3, 4] },
      { arr: ['#{_}', null] }
    );
    assert.deepEqual(obj.arr, ['1', 3, 4]);
  });

  it('returns the first argument when called as _.deepExtend(myObj, child, ...)', function () {
    const myObj = { a: 1 };
    const result = _.deepExtend(myObj, { b: 2 }, { c: 3 }, { d: 4 });
    assert.equal(result, myObj);
    assert.deepEqual(myObj, { a: 1, b: 2, c: 3, d: 4 });
  });
});
