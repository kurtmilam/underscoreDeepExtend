'use strict';

// Pins the module format and entry point (compatibility policy V.B).
//
// The UMD wrapper picks the first environment that matches, in this order:
//   1. CommonJS: `module` is defined        -> module.exports = factory
//   2. AMD:      `define` is a function     -> define('underscoreDeepExtend', m)
//   3. Global:   otherwise                  -> window.underscoreDeepExtend = factory
// Each environment is simulated in a fresh vm context with only the globals
// that environment would have.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const _ = require('lodash');

const ROOT = path.join(__dirname, '..');
const ENTRY = path.join(ROOT, 'index.js');
const source = fs.readFileSync(ENTRY, 'utf8');

function runIn(globals) {
  const context = vm.createContext(globals);
  vm.runInContext(source, context, { filename: ENTRY });
  return context;
}

// A factory from any environment must produce a working deepExtend.
function assertWorkingFactory(factory) {
  assert.equal(typeof factory, 'function');
  const lodash = _.runInContext();
  lodash.mixin({ deepExtend: factory(lodash) });
  assert.deepEqual(
    lodash.deepExtend({ a: { b: 1 } }, { a: { c: 2 } }),
    { a: { b: 1, c: 2 } }
  );
}

describe('package.json entry point', function () {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  it('declares "main": "index" (extensionless)', function () {
    assert.equal(pkg.main, 'index');
  });

  it('resolves the package root to index.js', function () {
    assert.equal(require.resolve(ROOT), ENTRY);
  });

  it('has no "exports" field, so deep requires like underscore-deep-extend/index.js still work', function () {
    assert.equal('exports' in pkg, false);
  });

  it('has no "type" field, so index.js is loaded as CommonJS', function () {
    assert.equal('type' in pkg, false);
  });

  it('has no runtime dependencies', function () {
    assert.equal('dependencies' in pkg, false);
    assert.equal('peerDependencies' in pkg, false);
  });
});

describe('CommonJS', function () {
  const factory = require(ROOT);

  it('exports the factory function as module.exports', function () {
    assert.equal(typeof factory, 'function');
    assert.equal(factory.length, 1);
  });

  it('the factory returns a function named underscoreDeepExtend with arity 1', function () {
    const fn = factory(_);
    assert.equal(typeof fn, 'function');
    assert.equal(fn.name, 'underscoreDeepExtend');
    assert.equal(fn.length, 1);
  });

  it('each factory call returns a new function', function () {
    assert.notEqual(factory(_), factory(_));
  });

  it('works when loaded into a bare CommonJS environment', function () {
    const context = runIn({ module: { exports: {} } });
    assertWorkingFactory(context.module.exports);
  });

  it('wins over AMD when both module and define exist; define is never called', function () {
    let defineCalls = 0;
    const context = runIn({
      module: { exports: {} },
      define: function () { defineCalls += 1; },
    });
    assert.equal(defineCalls, 0);
    assertWorkingFactory(context.module.exports);
  });

  it('does not set window.underscoreDeepExtend', function () {
    const context = runIn({ module: { exports: {} }, window: {} });
    assert.equal('underscoreDeepExtend' in context.window, false);
  });
});

describe('AMD', function () {
  it('calls define once with the module id "underscoreDeepExtend" and a module function', function () {
    const calls = [];
    runIn({ define: function () { calls.push(Array.prototype.slice.call(arguments)); } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].length, 2);
    assert.equal(calls[0][0], 'underscoreDeepExtend');
    assert.equal(typeof calls[0][1], 'function');
  });

  it('the module function returns the factory', function () {
    let moduleFn;
    runIn({ define: function (id, m) { moduleFn = m; } });
    assertWorkingFactory(moduleFn());
  });

  it('does not check define.amd: any global function named define is used', function () {
    let called = false;
    runIn({ define: function () { called = true; } });
    assert.equal(called, true);
  });

  it('wins over the browser global when both define and window exist', function () {
    const context = runIn({ define: function () {}, window: {} });
    assert.equal('underscoreDeepExtend' in context.window, false);
  });

  it('is skipped when define is not a function', function () {
    const context = runIn({ define: {}, window: {} });
    assertWorkingFactory(context.window.underscoreDeepExtend);
  });
});

describe('browser global', function () {
  it('sets window.underscoreDeepExtend to the factory', function () {
    const context = runIn({ window: {} });
    assertWorkingFactory(context.window.underscoreDeepExtend);
  });

  it('assigns to `window` specifically, not the global object', function () {
    const context = runIn({ window: {} });
    assert.equal('underscoreDeepExtend' in context, false);
  });

  it('throws a ReferenceError at load time when no module, define or window exists (e.g. a Web Worker)', function () {
    assert.throws(function () { runIn({}); }, function (err) {
      // vm errors come from another realm, so compare by name, not instanceof.
      return err.name === 'ReferenceError';
    });
  });
});
