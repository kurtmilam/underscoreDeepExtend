'use strict';

// Enforces compatibility policy V.E: the existing entry point stays ES5 syntax
// and uses only ES5 built-ins.
//
// 1. Syntax: the source must parse as an ES5 script.
// 2. Globals: every free identifier must be an ES5 global, or one of the
//    module-detection globals the UMD wrapper probes (module, define, window).
// 3. Built-ins: member accesses must not use post-ES5 built-in members:
//    a. statics on a known built-in (`Object.assign`) are checked against
//       that built-in's ES5 static members;
//    b. any other non-computed member (`x.includes`) is rejected when its name
//       is a post-ES5 built-in member that ES5 has under no built-in at all.
//       Members accessed on `_` are exempt: those belong to the injected
//       library (`_.includes` is underscore's, not Array.prototype's).
//
// The post-ES5 list in 3b is derived from the running Node.js version, so new
// JavaScript features are covered automatically as Node is upgraded.

const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ENTRY = path.join(__dirname, '..', 'index.js');

const ES5_GLOBALS = [
  'Object', 'Function', 'Array', 'String', 'Boolean', 'Number', 'Math', 'Date',
  'RegExp', 'Error', 'EvalError', 'RangeError', 'ReferenceError',
  'SyntaxError', 'TypeError', 'URIError', 'JSON', 'NaN', 'Infinity',
  'undefined', 'eval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
];

// Probed by the UMD wrapper to detect the host environment.
const ENVIRONMENT_GLOBALS = ['module', 'define', 'window'];

const ES5_STATICS = {
  Object: ['getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
    'create', 'defineProperty', 'defineProperties', 'seal', 'freeze',
    'preventExtensions', 'isSealed', 'isFrozen', 'isExtensible', 'keys'],
  Function: [],
  Array: ['isArray'],
  String: ['fromCharCode'],
  Boolean: [],
  Number: ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY',
    'POSITIVE_INFINITY'],
  Math: ['E', 'LN10', 'LN2', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2',
    'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
    'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan'],
  Date: ['parse', 'UTC', 'now'],
  RegExp: [],
  JSON: ['parse', 'stringify'],
};
const COMMON_STATICS = ['prototype', 'length', 'name'];

// Every member any ES5 built-in prototype or instance has.
const ES5_MEMBERS = new Set([
  // Object.prototype
  'constructor', 'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable',
  // Function.prototype
  'apply', 'call', 'bind', 'length', 'name', 'prototype', 'arguments', 'caller',
  // Array.prototype
  'concat', 'join', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort',
  'splice', 'unshift', 'indexOf', 'lastIndexOf', 'every', 'some', 'forEach',
  'map', 'filter', 'reduce', 'reduceRight',
  // String.prototype
  'charAt', 'charCodeAt', 'localeCompare', 'match', 'replace', 'search',
  'split', 'substring', 'substr', 'toLowerCase', 'toLocaleLowerCase',
  'toUpperCase', 'toLocaleUpperCase', 'trim',
  // Number.prototype
  'toFixed', 'toExponential', 'toPrecision',
  // RegExp.prototype and instances
  'exec', 'test', 'source', 'global', 'ignoreCase', 'multiline', 'lastIndex',
  // Error.prototype and instances
  'message',
  // Date.prototype
  'toDateString', 'toTimeString', 'toLocaleDateString', 'toLocaleTimeString',
  'getTime', 'getFullYear', 'getUTCFullYear', 'getMonth', 'getUTCMonth',
  'getDate', 'getUTCDate', 'getDay', 'getUTCDay', 'getHours', 'getUTCHours',
  'getMinutes', 'getUTCMinutes', 'getSeconds', 'getUTCSeconds',
  'getMilliseconds', 'getUTCMilliseconds', 'getTimezoneOffset', 'setTime',
  'setMilliseconds', 'setUTCMilliseconds', 'setSeconds', 'setUTCSeconds',
  'setMinutes', 'setUTCMinutes', 'setHours', 'setUTCHours', 'setDate',
  'setUTCDate', 'setMonth', 'setUTCMonth', 'setFullYear', 'setUTCFullYear',
  'toUTCString', 'toISOString', 'toJSON', 'getYear', 'setYear', 'toGMTString',
]);

// Post-ES5 members: everything today's built-ins have that ES5 never had.
function modernMembers() {
  const owners = [
    Object, Function, Array, String, Boolean, Number, Math, Date, RegExp,
    Error, JSON, Object.prototype, Function.prototype, Array.prototype,
    String.prototype, Boolean.prototype, Number.prototype, Date.prototype,
    RegExp.prototype, Error.prototype,
  ];
  const names = new Set();
  owners.forEach(function (owner) {
    Object.getOwnPropertyNames(owner).forEach(function (n) {
      if (!ES5_MEMBERS.has(n)) names.add(n);
    });
  });
  return names;
}

function parse(source) {
  return acorn.parse(source, { ecmaVersion: 5, sourceType: 'script' });
}

// Minimal ES5 AST walk that reports free identifiers and member accesses.
// Scopes are function-level, matching ES5 `var` semantics.
function analyze(ast) {
  const freeIdentifiers = new Set();
  const memberAccesses = [];

  function hoist(node, names) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'VariableDeclarator') names.add(node.id.name);
    if (node.type === 'FunctionDeclaration') {
      names.add(node.id.name);
      return; // its body is its own scope
    }
    if (node.type === 'FunctionExpression') return;
    childNodes(node).forEach(function (child) { hoist(child, names); });
  }

  function scopeFor(fn, parent) {
    const names = new Set(fn.params.map(function (p) { return p.name; }));
    names.add('arguments');
    if (fn.type === 'FunctionExpression' && fn.id) names.add(fn.id.name);
    hoist(fn.body, names);
    return { names: names, parent: parent };
  }

  function declared(name, scope) {
    for (let s = scope; s; s = s.parent) if (s.names.has(name)) return true;
    return false;
  }

  function visit(node, scope) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        visit(node.body, scopeFor(node, scope));
        return;
      case 'Identifier':
        if (!declared(node.name, scope)) freeIdentifiers.add(node.name);
        return;
      case 'MemberExpression': {
        visit(node.object, scope);
        if (node.computed) visit(node.property, scope);
        const name = node.computed
          ? (node.property.type === 'Literal' ? String(node.property.value) : null)
          : node.property.name;
        if (name !== null) {
          memberAccesses.push({
            receiver: node.object.type === 'Identifier' ? node.object.name : null,
            receiverIsFree: node.object.type === 'Identifier' &&
              !declared(node.object.name, scope),
            name: name,
            line: node.loc.start.line,
          });
        }
        return;
      }
      case 'Property':
        if (node.computed) visit(node.key, scope);
        visit(node.value, scope);
        return;
      case 'LabeledStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        if (node.body) visit(node.body, scope);
        return;
      case 'CatchClause': {
        const catchScope = { names: new Set([node.param.name]), parent: scope };
        visit(node.body, catchScope);
        return;
      }
      default:
        childNodes(node).forEach(function (child) { visit(child, scope); });
    }
  }

  const programScope = { names: new Set(), parent: null };
  hoist(ast, programScope.names);
  visit(ast, programScope);
  return { freeIdentifiers: freeIdentifiers, memberAccesses: memberAccesses };
}

function childNodes(node) {
  const out = [];
  Object.keys(node).forEach(function (key) {
    if (key === 'loc' || key === 'start' || key === 'end') return;
    const v = node[key];
    if (Array.isArray(v)) v.forEach(function (c) { if (c && c.type) out.push(c); });
    else if (v && typeof v.type === 'string') out.push(v);
  });
  return out;
}

function violations(source) {
  const ast = acorn.parse(source, { ecmaVersion: 5, sourceType: 'script', locations: true });
  const result = analyze(ast);
  const modern = modernMembers();
  const found = [];

  result.freeIdentifiers.forEach(function (name) {
    if (ES5_GLOBALS.indexOf(name) === -1 && ENVIRONMENT_GLOBALS.indexOf(name) === -1) {
      found.push('non-ES5 global: ' + name);
    }
  });

  result.memberAccesses.forEach(function (m) {
    if (m.receiver === '_') return; // the injected library's API
    if (m.receiverIsFree && ES5_STATICS[m.receiver]) {
      const allowed = ES5_STATICS[m.receiver].concat(COMMON_STATICS);
      if (allowed.indexOf(m.name) === -1) {
        found.push('non-ES5 static ' + m.receiver + '.' + m.name + ' (line ' + m.line + ')');
      }
      return;
    }
    if (modern.has(m.name)) {
      found.push('post-ES5 built-in member .' + m.name + ' (line ' + m.line + ')');
    }
  });
  return found;
}

const source = fs.readFileSync(ENTRY, 'utf8');

test('index.js parses as an ES5 script', function () {
  assert.doesNotThrow(function () { parse(source); });
});

test('index.js uses only ES5 globals and built-in members', function () {
  assert.deepEqual(violations(source), []);
});

// Self-tests: prove the checks actually reject what they should, so a passing
// run above means something.
describe('the ES5 checks themselves', function () {
  const rejectedSyntax = {
    'let': 'let a = 1;',
    'const': 'const a = 1;',
    'arrow function': 'var f = () => 1;',
    'template literal': 'var s = `x`;',
    'shorthand property': 'var a; var o = { a };',
    'spread': 'f(...a);',
    'class': 'class A {}',
  };
  Object.keys(rejectedSyntax).forEach(function (label) {
    it('syntax: ' + label, function () {
      assert.throws(function () { parse(rejectedSyntax[label]); }, SyntaxError);
    });
  });

  const rejectedApis = {
    'Object.assign': 'Object.assign({}, {});',
    'Array.from': 'Array.from([]);',
    'Symbol global': 'Symbol("x");',
    'Map global': 'new Map();',
    'Promise global': 'Promise.resolve();',
    'globalThis': 'globalThis.x = 1;',
    'Array#includes': 'var a = []; a.includes(1);',
    'String#startsWith': '"abc".startsWith("a");',
    'computed literal access': 'var a = []; a["find"](f);',
  };
  Object.keys(rejectedApis).forEach(function (label) {
    it('built-ins: ' + label, function () {
      assert.notDeepEqual(violations(rejectedApis[label]), []);
    });
  });

  const allowed = {
    'Object.keys': 'Object.keys({});',
    '_.includes (injected library)': 'var _; _.includes([], 1);',
    'Array#forEach': '[].forEach(function () {});',
    'shadowed global': 'function f(Map) { return Map; }',
    'module detection': 'typeof module; typeof define; window.x = 1;',
  };
  Object.keys(allowed).forEach(function (label) {
    it('allowed: ' + label, function () {
      assert.deepEqual(violations(allowed[label]), []);
    });
  });
});
