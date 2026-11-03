# Changelog

Every version published to npm, newest first. Each entry is also the text of
that version's GitHub release.

Dates are when the version was published to npm (UTC). Behavior quirks of the
current code are listed in [docs/QUIRKS.md](docs/QUIRKS.md); "Q" numbers below
refer to that log.

The entries for 0.0.1 through 1.1.5 were written in 2026, years after those
releases. No changelog was kept at the time, so they were reconstructed from
the commit history and checked by running each version's code with underscore
and lodash. The version numbers 1.0.0, 1.0.2, 1.0.3 and 1.1.0 through 1.1.3
were never published.

## [1.1.5] - 2016-05-13

The merge function was rewritten as a set of small helpers, to make it easier
to read and less complex. That rewrite changed some behavior, although this
was released as a patch.

### Changed

- Only a source's own enumerable properties are merged (`Object.keys`), not
  inherited ones, as before 1.0.1.
- A `null` or `undefined` source now throws a `TypeError`. Earlier versions
  skipped it (Q14).
- A `#{_}` placeholder is now filled in when the parent value isn't a string,
  using its string form: a parent `5` and a source `"x #{_} y"` give
  `"x 5 y"`. Earlier versions left the non-string parent unchanged (Q1).
- When a source's object or array merges into one the target already has,
  the target's own object or array is updated in place again, as before
  1.0.1, instead of a copy. For arrays, the target then gets a new array
  without the `null`s, so the original array is both changed and replaced
  (Q10).

## [1.1.4] - 2016-05-11

### Changed

- A `null` value in the target is now replaced by the source's value, even
  when that value is an object or an array. Earlier versions threw
  "Trying to combine an object with a non-object". Reported in
  [xioup/underscoreDeepExtend#16](https://github.com/xioup/underscoreDeepExtend/issues/16)
  and in a gist comment (Xflofoxx, 2015).
- Values copied onto keys the target lacks are now shallow copies made with
  the injected library's `_.clone`, so changing the result no longer changes
  the source at the first level (reported in a gist comment by pavelthq,
  2015). Nested values are still shared (Q7).
- Side effects of using `_.clone`: a function copied onto a new key becomes an
  empty object (Q5), and with underscore, Dates and RegExps become empty
  objects (Q6). lodash copies Dates and RegExps correctly.

### Internal

- Removes a function created inside a loop, as suggested in a gist comment
  (cancerberoSgx, 2016).

## [1.0.4] - 2016-04-12

Package metadata only. `index.js` is unchanged from 1.0.1.

### Changed

- `package.json`'s `repository.url` uses the `git://` form.
- `bower.json` gains a `repository` field, and `component.json` now names
  `kurtmilam/underscoreDeepExtend` and the version 1.0.4 (it still said 0.0.5).

## [1.0.1] - 2016-04-12

The first release from the `kurtmilam/underscoreDeepExtend` repository.

### Changed

- Errors are now thrown as `Error` objects, with messages such as
  "Trying to combine an array with a non-array (a)". Earlier versions threw
  plain strings that began with "Error: ". Code that compared the thrown value
  with a string needs updating.
- Inherited enumerable properties of a source are now merged too (the own
  property check was removed;
  [xioup/underscoreDeepExtend#9](https://github.com/xioup/underscoreDeepExtend/pull/9)).
- Objects and arrays the target already has are copied before a source is
  merged into them, and the target gets the merged copy. So in
  `_.deepExtend({}, a, b)`, merging `b` no longer changes `a`
  ([xioup/underscoreDeepExtend#11](https://github.com/xioup/underscoreDeepExtend/pull/11);
  reported in a gist comment by vbarbosh, 2014).
- `package.json`'s homepage, bug tracker and repository now point to
  `kurtmilam/underscoreDeepExtend`.

## [0.0.5] - 2014-07-17

The same code as 0.0.4, published again because the 0.0.4 package had a
problem on npm. 0.0.4's package is no longer available from npm, so this is
the earliest version with Date support that can still be installed.

### Changed

- The README's list of methods an underscore-compatible library must provide
  now includes `_.isDate` and `_.isNull`.

## [0.0.4] - 2014-07-17

This version's package is no longer available from npm, so its contents can't
be checked. Judging by the commit history, it contains the changes below; its
git tag points at the commit right after the one it was most likely published
from, which only updates the version in `bower.json` and `component.json`.

### Added

- Dates: a Date in a source replaces the target's value instead of being
  merged into it (reported in a gist comment by tkalfigo, 2014).

### Fixed

- A typo in the repository URL in the copyright header
  ([xioup/underscoreDeepExtend#7](https://github.com/xioup/underscoreDeepExtend/pull/7)).

## [0.0.3] - 2014-03-28

README formatting only; `index.js` is unchanged from 0.0.2. Published so the
README on npm would be updated.

The `v0.0.3` tag predates this changelog and points at a commit made about two
hours after the publish. That commit adds `bower.json` and `component.json`,
which aren't part of the npm package; every file in the package is identical
there.

## [0.0.2] - 2014-03-28

### Changed

- License: MIT (was GPL v3).
- A function in the target is now replaced by the source's value instead of
  being merged into.
- A `null` in a source now replaces the target's value. Earlier, `null`
  replacing an object or array threw. From the gist (wulftone and kapooostin,
  2013).
- The README now installs from npm (`npm install underscore-deep-extend`).

## [0.0.1] - 2014-03-28

First release on npm, packaging the gist
[1868955](https://gist.github.com/1868955) as a module for Node.js (CommonJS),
AMD and browser globals. Licensed under the GPL v3.

[1.1.5]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v1.0.4...v1.1.4
[1.0.4]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v1.0.1...v1.0.4
[1.0.1]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v0.0.5...v1.0.1
[0.0.5]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/kurtmilam/underscoreDeepExtend/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/kurtmilam/underscoreDeepExtend/releases/tag/v0.0.1
