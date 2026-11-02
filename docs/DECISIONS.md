# Decisions log

Choices that outlast a single piece of work: baselines, tooling, the test
matrix, and policy. Newest entries go at the bottom. Each entry is dated and
says whether it is decided or still open.

## D1. Test baseline: the code published as 1.1.5 (2026-11-02, decided)

Characterization tests describe the behavior of the code published to npm as
1.1.5, the current version.

- The published 1.1.5 package matches commit `eb09674` ("Upgrade to 1.1.5 with
  Various improvements", 2016-05-13) exactly, once line endings are normalized
  (the published files use CRLF).
- The default branch (`master` at `d038cc3`) differs from `eb09674` in
  `index.js` only by copyright years, a comment, the name of an internal
  function (`extendObject` → `procAll`), and the removal of a redundant
  double assignment in the fallback branch. The README and other docs also
  changed.
- None of those `index.js` changes affects behavior. The full test suite
  passes against both the default branch's `index.js` and the published 1.1.5
  `index.js`.
- Tests run against the repo's `index.js`. Re-running the suite against the
  published file is part of any release check.

## D2. The xioup repository is a mirror (2026-11-02, decided)

https://github.com/xioup/underscoreDeepExtend has the same files as the
canonical repo (https://github.com/kurtmilam/underscoreDeepExtend) at
`d038cc3`. Its `master` is one merge commit ahead (`5cc0079`, merging the
canonical `master`), with an identical tree. The canonical repo is the source
of truth; the xioup repo holds no other code.

## D3. The original gist has the same merge function (2026-11-02, decided)

The original gist (https://gist.github.com/1868955) was compared at revision
`b547cbe0823f9963225f21aa891a4d744cd1ab7f` (2016-05-13), its latest.

- Its merge function is the same as the one in `index.js` on the default
  branch, so it matches published 1.1.5 apart from the cosmetic differences
  in D1.
- It is packaged differently: a global function declaration named
  `deepExtend` with no module wrapper, which uses the global `_` and calls
  `_.mixin` on it when loaded. So it needs `_.mixin`, and mixes itself in
  without being asked.
- Checked by running the characterization tests against the gist's code with
  the injected library as its `_`: 198 of 204 pass. The 6 that fail all follow
  from the self-mixin above (the mixin requirement, the set of methods used,
  and tests that inject a library without `mixin`). Every merge behavior is
  the same.
- The gist's usage notes repeat the README examples, including the outputs
  the code doesn't produce (quirk Q19).
- Its 27 comments (2012–2024) were reviewed. The scenarios they report are
  pinned in `test/characterization/gist-reports.test.js`, and noted in quirks
  Q5, Q6 and Q7 where the fixes made at the time don't fully hold.

## D4. Published versions and their commits (2026-11-02, decided; tagging open)

Each published version's npm package was compared, file by file, with every
commit in the repo (line endings normalized):

| Version | Published (UTC)  | Matching commit | Existing tag |
| ------- | ---------------- | --------------- | ------------ |
| 0.0.1   | 2014-03-28 15:24 | `54ce7fa`       | none         |
| 0.0.2   | 2014-03-28 15:53 | `079519a`       | none         |
| 0.0.3   | 2014-03-28 22:17 | `709a56e`       | `v0.0.3` → `9907a84` (see below) |
| 0.0.4   | 2014-07-17 21:11 | can't be matched: removed from npm | `v0.0.4` → `18906fe` |
| 0.0.5   | 2014-07-17 21:22 | `62f9cf7`       | `v0.0.5` → `62f9cf7` (correct) |
| 1.0.1   | 2016-04-12 20:07 | `be98a23`       | none         |
| 1.0.4   | 2016-04-12 21:31 | `de36d43`       | none         |
| 1.1.4   | 2016-05-11 14:53 | `4063d93`       | none         |
| 1.1.5   | 2016-05-13 09:11 | `eb09674`       | none         |

- 0.0.3: three commits have identical contents for the published files.
  `709a56e` ("Version bump for NPM") was committed nine seconds before the
  publish, and the two later commits add `bower.json` and `component.json`,
  which the published package doesn't contain. The existing `v0.0.3` tag
  points at the later `9907a84`; the code is the same.
- 0.0.4: the version is in npm's history but its package is no longer
  available, so it can't be compared. The existing `v0.0.4` tag is the only
  record.
- Open: create the missing tags, and decide whether to move `v0.0.3`.

## D5. Test tooling (2026-11-02, decided)

- Runner: `node:test` (`npm test`). Developed and verified on Node.js 22.
- Dev dependencies, pinned to exact versions so pinned behavior can't shift
  under us: `underscore` 1.13.8, `lodash` 4.18.1, `acorn` 8.19.0 (for the ES5
  syntax check). No runtime dependencies.
- Layout: `test/characterization/` holds behavior tests; `test/es5.test.js`
  enforces ES5 for `index.js`; `test/module-format.test.js` pins the module
  formats and entry point; `test/records.test.js` checks this repo's
  quirks log against the tests.

## D6. Library matrix (2026-11-02, decided for now)

Every behavior test runs against underscore and lodash, each with
`deepExtend` mixed in as the README describes. lodash uses an isolated
`runInContext()` instance; underscore has no equivalent, so its shared
instance is used. Differences between the two are pinned per library with
`perLibrary()`, which requires an expectation for every library in the matrix.

Open: whether to add older major versions that consumers may still use (for
example lodash 3 or underscore 1.8).

## D7. How ES5 is enforced (2026-11-02, decided)

`test/es5.test.js` parses `index.js` as an ES5 script, then walks it to reject
non-ES5 globals and post-ES5 built-in members. The list of post-ES5 members is
derived from the running Node.js version, so it grows as JavaScript does. The
check is static rather than run in a stripped-down engine, so engine internals
can't cause false results. It includes self-tests showing that it rejects
post-ES5 code.

## D8. Branch coverage (2026-11-02, decided)

`npm run test:coverage` fails unless the suite covers 100% of the lines,
branches and functions of `index.js`. It currently does. V8 counts `if`/`else`
blocks, not each operand of an `||` condition, so the condition-level branches
are listed here with the tests that cover them:

| Branch | Covered by (file: describe › test) |
| ------ | ---------------------------------- |
| CommonJS export | module-format: CommonJS |
| AMD `define` | module-format: AMD |
| Browser global | module-format: browser global |
| No environment → ReferenceError | module-format: browser global › throws a ReferenceError… |
| Assign: target value undefined (key missing) | dispatch: primitives › adds keys missing from the target |
| Assign: target value null | dispatch: null › anything replaces null in the target |
| Assign: target value is a function | dispatch: functions › a function in the target is replaced… |
| Assign: source value null | dispatch: null › null in the source overwrites anything… |
| Assign: source value is a Date | dispatch: dates |
| Placeholder: string parent / non-string parent | placeholder: substitution / non-string parents |
| Array: target is an array / source is an array | arrays; errors: type mismatches |
| Array: mismatch error (either side) | errors: array target, object source / object target, array source |
| Object: target is an object / source is an object | objects; errors: type mismatches |
| Object: mismatch error (either side) | errors: object target, number source / number target, object source |
| Fallback: primitive over primitive | dispatch: primitives |
| No sources / several sources | api: return value / sources |

## D9. Where project records live (2026-11-02, decided)

The quirks log is `docs/QUIRKS.md` and this decisions log is
`docs/DECISIONS.md`.

## D10. Test files in the npm package (2026-11-02, open)

`package.json` has no `files` field and there is no `.npmignore`, so the next
publish would include `test/` and `docs/`. Harmless, but it's an observable
packaging change, to be decided when preparing the next release.
