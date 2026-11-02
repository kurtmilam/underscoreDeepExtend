'use strict';

// The #{_} placeholder ("parentRE" = /#{\s*?_\s*?}/, no flags).
// A source string containing it is resolved with
//   sourceString.replace(parentRE, targetValue)
// which only applies when the target value is not undefined/null/function.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { eachLibrary } = require('../helpers/libraries');

eachLibrary(function (_) {
  describe('substitution', function () {
    it('replaces the placeholder with the parent string', function () {
      assert.deepEqual(_.deepExtend({ a: 'P' }, { a: '<#{_}>' }), { a: '<P>' });
    });

    it('a bare placeholder keeps a string parent unchanged', function () {
      assert.deepEqual(_.deepExtend({ a: 'P' }, { a: '#{_}' }), { a: 'P' });
    });

    it('replaces only the FIRST placeholder; later ones stay literal', function () {
      assert.deepEqual(_.deepExtend({ a: 'P' }, { a: '#{_}-#{_}' }), { a: 'P-#{_}' });
    });

    it('allows whitespace (including tabs and newlines) around the underscore', function () {
      assert.deepEqual(
        _.deepExtend({ a: 'P', b: 'P' }, { a: '#{ _ }', b: '#{\t_\n}' }),
        { a: 'P', b: 'P' }
      );
    });

    it('does not match other contents inside the braces', function () {
      assert.deepEqual(
        _.deepExtend({ a: 'P', b: 'P', c: 'P' }, { a: '#{__}', b: '#{}', c: '#{x}' }),
        { a: '#{__}', b: '#{}', c: '#{x}' }
      );
    });

    it('interprets $ patterns in the parent string as String#replace patterns', function () {
      // "$&" inserts the matched placeholder; "$'" inserts the text after it.
      assert.deepEqual(
        _.deepExtend({ a: 'x$&y', b: "$'" }, { a: '[#{_}]', b: '[#{_}]' }),
        { a: '[x#{_}y]', b: '[]]' }
      );
    });
  });

  describe('non-string parents', function () {
    it('stringifies number, boolean, object and array parents', function () {
      assert.deepEqual(
        _.deepExtend(
          { n: 5, b: true, o: { x: 1 }, a: [1, 2] },
          { n: '#{_}', b: '#{_}', o: '#{_}', a: '#{_}' }
        ),
        { n: '5', b: 'true', o: '[object Object]', a: '1,2' }
      );
    });

    it('stringifies a Date parent with Date#toString', function () {
      const date = new Date(0);
      assert.deepEqual(_.deepExtend({ d: date }, { d: '#{_}' }), { d: String(date) });
    });
  });

  describe('missing parents', function () {
    it('keeps the placeholder literally when the target key is missing, undefined or null', function () {
      assert.deepEqual(
        _.deepExtend({ b: undefined, c: null }, { a: 'x#{_}y', b: 'x#{_}y', c: 'x#{_}y' }),
        { a: 'x#{_}y', b: 'x#{_}y', c: 'x#{_}y' }
      );
    });

    it('keeps the placeholder literally when the target value is a function', function () {
      assert.deepEqual(_.deepExtend({ f: function () {} }, { f: '#{_}' }), { f: '#{_}' });
    });
  });

  describe('across several sources', function () {
    it('each source resolves against the result of the previous ones', function () {
      assert.deepEqual(
        _.deepExtend({ a: 'base' }, { a: '#{_}/one' }, { a: '#{_}/two' }),
        { a: 'base/one/two' }
      );
    });
  });
});
