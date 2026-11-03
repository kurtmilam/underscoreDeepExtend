# Quirks log

Behaviors of the current code (1.1.5) that may be bugs, or that consumers may
not expect. Each one is pinned by tests anyway, so it can only change through a
deliberate, documented decision.

Every entry lists the tests that pin it. `test/records.test.js` fails if a
listed test is renamed or removed, so this log can't silently drift out of
date. Tests that run per library are listed once; they run for every
underscore and lodash version in the library matrix (decisions log D6).

Decisions: **open** (not yet decided), **keep** (intended, or too risky to
change), **change in vX** (to be changed in that major version), or **docs
fix** (the documentation changes; the behavior doesn't). Decided 2026-11-03;
the principles behind the v2 decisions are in decisions log D14.

## Placeholder (`#{_}`)

### Q1. Non-string parent values are stringified

`#{_}` is resolved with `String#replace`, so a number, boolean, object, array or
Date parent is converted to a string: `100` becomes `"100"`, `{ id: 1234 }`
becomes `"[object Object]"`, `[1, 2]` becomes `"1,2"`. The README presents
`#{_}` as a way to keep any parent value unchanged; that only holds for strings.

- `test/characterization/placeholder.test.js`: "stringifies number, boolean, object and array parents"
- `test/characterization/placeholder.test.js`: "stringifies a Date parent with Date#toString"
- `test/characterization/errors.test.js`: "a #{_} string can replace an object or array without throwing"

Decision: change in v2. A source string that is exactly `#{_}` keeps the parent value unchanged, whatever its type; a placeholder inside a longer string still stringifies the parent (decisions log D14).

### Q2. Only the first placeholder in a string is replaced

The pattern has no `g` flag. In `"#{_}-#{_}"` only the first one is replaced.

- `test/characterization/placeholder.test.js`: "replaces only the FIRST placeholder; later ones stay literal"

Decision: change in v2. Every placeholder in the string is replaced.

### Q3. `$` patterns in the parent string are interpreted

The parent value is passed to `String#replace` as the replacement string, so
`$&`, `$'`, `` $` `` and `$$` inside it are expanded instead of copied.

- `test/characterization/placeholder.test.js`: "interprets $ patterns in the parent string as String#replace patterns"

Decision: change in v2. The parent value is inserted literally (a replacer function, not a replacement string).

### Q4. The placeholder stays literal when there is no parent value

When the target value is missing, `undefined`, `null` or a function, the source
string is copied as-is, `#{_}` included.

- `test/characterization/placeholder.test.js`: "keeps the placeholder literally when the target key is missing, undefined or null"
- `test/characterization/placeholder.test.js`: "keeps the placeholder literally when the target value is a function"

Decision: keep. With no parent value there is nothing to substitute.

## Assignment and cloning

### Q5. A function in a source becomes an empty object

A function assigned to a key the target lacks goes through `_.clone`, which
turns it into `{}` in both underscore and lodash. A function replacing a
function becomes `{}` too, or a plain object holding the source function's own
properties.

Gist comments asked for functions to be copied (wulftone, 2013), and the gist
was updated in response, but functions still aren't copied; a 2024 comment
(nntoan) reports the same thing.

This holds for every version in the matrix. lodash before 3.0.0, which isn't
in the matrix, returns the function itself from `_.clone`, so with those
versions functions are copied by reference (decisions log D6).

- `test/characterization/dispatch.test.js`: "a function source value for a new key becomes a plain empty object"
- `test/characterization/gist-reports.test.js`: "a function assigned to a new key is not copied: it becomes an empty object"
- `test/characterization/gist-reports.test.js`: "a function replacing another function becomes an empty object"
- `test/characterization/gist-reports.test.js`: "a function replacing a function with properties keeps only the source function's own properties, as a plain object"

Decision: change in v2. Functions are copied by reference. v2 uses its own clone instead of the injected `_.clone` (D14).

### Q6. With underscore, Dates and RegExps become empty objects

Assigned values go through the injected `_.clone`. underscore's `_.clone`
turns a Date or RegExp into `{}`; lodash's clones them properly. Pinned per
library.

The gist's Date handling was added in response to a 2014 comment (tkalfigo).
It works with lodash, but with underscore, the dependency the gist itself
names, the reported scenario still doesn't produce a Date.

Every underscore version in the matrix behaves this way. lodash before 2.2.0,
which isn't in the matrix, also turns Dates and RegExps into `{}` (decisions
log D6).

- `test/characterization/dispatch.test.js`: "a Date source value is cloned onto a new key"
- `test/characterization/gist-reports.test.js`: "a later Date replaces an earlier Date (underscore: as an empty object)"
- `test/characterization/dispatch.test.js`: "a Date source value replaces an existing Date"
- `test/characterization/dispatch.test.js`: "a Date source value replaces an existing primitive or object without throwing"
- `test/characterization/dispatch.test.js`: "a RegExp source value for a new key is cloned"

Decision: change in v2. v2's own clone copies Dates and RegExps as Dates and RegExps, with any injected library (D14).

### Q7. Assigned values are shallow copies that share nested values with the source

When the target lacks a key, the source value is shallow-cloned. Nested objects
and arrays inside it are shared with the source, so a later merge into the
result can mutate an earlier source.

A 2015 gist comment (pavelthq) reported that changing the result changed the
source. The fix reaches one level: changing a first-level value is now safe,
but a second-level value is still shared.

- `test/characterization/dispatch.test.js`: "a new object is copied, but its nested values are shared with the source"
- `test/characterization/gist-reports.test.js`: "changing a first-level value of the result does not change the source"
- `test/characterization/gist-reports.test.js`: "changing a second-level value of the result DOES change the source"
- `test/characterization/dispatch.test.js`: "a new array is copied, but its elements are shared with the source"
- `test/characterization/dispatch.test.js`: "shared nested values let a LATER merge mutate an earlier source"

Decision: change in v2. The result is fully fresh: it shares no objects or arrays with any input (D14).

### Q8. An object merges into a Date target, mutating the Date

A Date in the target is treated as an object, so an object source adds
properties to that Date instance.

- `test/characterization/dispatch.test.js`: "an object source merges INTO a Date target, mutating that Date"

Decision: change in v2. v2 never mutates its inputs (D14), so a Date in the target is never changed. What an object merged over a Date produces is decided when v2 is designed.

## Arrays

### Q9. Nulls are removed only from nested arrays

After merging a nested array, `null` elements are removed (including nulls
that were already in the target). A top-level array target is never filtered,
and an array assigned to a new key is not filtered either.

- `test/characterization/arrays.test.js`: "removes nulls from a nested array (shifting later elements down)"
- `test/characterization/arrays.test.js`: "also removes nulls that were already in the target's nested array"
- `test/characterization/arrays.test.js`: "does NOT remove nulls from a top-level array target"
- `test/characterization/arrays.test.js`: "does not filter a nested array that was assigned rather than merged"

Decision: keep. Removing nulls from merged nested arrays is the documented way to delete elements. The README will say exactly where it applies. In v2 the nulls are removed from the result only, never from the target's own array (D14).

### Q10. A merged nested array is both mutated and replaced

The original nested array is mutated in place (nulls included), then replaced
on the parent by a new, filtered array. Anyone holding a reference to the
original sees the unfiltered result.

- `test/characterization/arrays.test.js`: "replaces a merged nested array with a new array"
- `test/characterization/arrays.test.js`: "still mutates the original nested array in place, nulls included"

Decision: change in v2. The result gets a new array; the original is never changed (D14).

## Type mismatches and errors

### Q11. An object or array can't be replaced by a primitive

Merging a primitive (including an explicit `undefined`) over an object, or an
object over a primitive, throws. Arrays and non-arrays can't be combined
either. Only `null`, a Date, or a `#{_}` string can replace an object or array.

- `test/characterization/errors.test.js`: "object target, number source throws \"Trying to combine an object with a non-object (k)\""
- `test/characterization/errors.test.js`: "object target, undefined source value throws \"Trying to combine an object with a non-object (k)\""
- `test/characterization/errors.test.js`: "number target, object source throws \"Trying to combine an object with a non-object (k)\""
- `test/characterization/errors.test.js`: "array target, object source throws \"Trying to combine an array with a non-array (k)\""

Decision: keep. The errors are intended.

### Q12. Error messages name only the immediate key

The message ends with the key or index where the mismatch happened, not the
path to it.

- `test/characterization/errors.test.js`: "names only the immediate key, not the full path"
- `test/characterization/errors.test.js`: "names the index for array elements"

Decision: change in v2. The message names the full path to the key. Message text is public API, so this needs a major version.

### Q13. A throw leaves the target partly merged

Keys and sources processed before the failing key stay applied.

- `test/characterization/errors.test.js`: "keys processed before the failing key stay merged"
- `test/characterization/errors.test.js`: "earlier sources stay applied when a later source throws"
- `test/characterization/errors.test.js`: "sources before a null source are still applied"

Decision: change in v2. v2 never mutates its inputs (D14), so a throw leaves every input exactly as it was; only the partly built result is discarded.

### Q14. A null or undefined source throws

Unlike `_.extend`, which skips them, a `null` or `undefined` source throws a
`TypeError`.

- `test/characterization/errors.test.js`: "a null source throws TypeError"
- `test/characterization/errors.test.js`: "an undefined source throws TypeError"

Decision: change in v2. `null` and `undefined` sources are skipped, as with `_.extend` (and as before 1.1.5).

### Q15. Primitive sources depend on the JavaScript engine

`Object.keys` coerces primitives in ES2015+ engines, so a string source merges
its characters by index and a number or boolean source is ignored. In an ES5
engine, the same calls throw `TypeError`. The tests pin the Node.js (ES2015+)
behavior.

- `test/characterization/api.test.js`: "coerces a string source to its indexed characters (ES2015+ Object.keys; an ES5 engine throws TypeError)"
- `test/characterization/api.test.js`: "ignores a number or boolean source (ES2015+ Object.keys; an ES5 engine throws TypeError)"

Decision: keep in 1.x. v2 decides how it treats primitive sources together with Q14.

## Injected library and module format

### Q16. Nested merges only work when mixed in as `_.deepExtend`

The library calls `_.deepExtend` for nested values, so calling the function
returned by the factory without mixing it in works only for flat merges. It
calls whatever `_.deepExtend` is at call time.

- `test/characterization/api.test.js`: "nested merges throw TypeError unless mixed in as _.deepExtend"
- `test/characterization/api.test.js`: "nested merges call whatever _.deepExtend is at call time"

Decision: change in v2. v2 recurses internally and doesn't call `_.deepExtend` (D14). This changes which injected methods are called, so it needs a major version.

### Q17. The README's dependency list is incomplete

The README lists `each`, `isArray`, `isDate`, `isNull`, `isObject`, `isString`,
`isUndefined`, `clone` and `reject`. The code also needs `isFunction` and the
mixed-in `deepExtend`.

- `test/characterization/injected-library.test.js`: "throws TypeError as soon as a key is processed"

Decision: docs fix. The README lists every injected method the code calls. No behavior change.

### Q18. Loading without `module`, `define` or `window` throws

The browser-global branch assigns to `window` directly, so loading the file
where none of the three exists (a Web Worker, for example) throws a
`ReferenceError`. The AMD branch also doesn't check `define.amd`.

- `test/module-format.test.js`: "throws a ReferenceError at load time when no module, define or window exists (e.g. a Web Worker)"
- `test/module-format.test.js`: "does not check define.amd: any global function named define is used"

Decision: change in v2. Fall back to the global object when `window` doesn't exist, and check `define.amd`. Adding that check can change which branch loads, so it needs a major version.

## Documentation

### Q19. Four README examples show output the code doesn't produce

See Q1. The tests pin the real output and are marked "README DISCREPANCY".

- `test/characterization/readme.test.js`: "README DISCREPANCY: #{_} placeholders stringify non-string parent values"
- `test/characterization/readme.test.js`: "README DISCREPANCY: {} and [] keep the parent object/array, but #{_} still stringifies the number"
- `test/characterization/readme.test.js`: "README DISCREPANCY: a shorter child array leaves trailing parent elements untouched"
- `test/characterization/readme.test.js`: "README DISCREPANCY: null removes a nested array element, but #{_} stringifies the kept number"

Decision: docs fix. The README examples show the output 1.x actually produces. v2's README follows from the Q1 decision.
