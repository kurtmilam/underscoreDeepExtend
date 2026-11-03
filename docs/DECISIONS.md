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

## D4. Published versions and their commits (2026-11-02, decided; tags and releases decided 2026-11-03)

Each published version's npm package was compared, file by file, with every
commit in the repo (line endings normalized; npm's own `package.json` fields
such as `_id` ignored). Re-checked independently on 2026-11-03 with the same
result. For 1.0.1 through 1.1.5 the `gitHead` npm recorded at publish time
names the same commit.

| Version | Published (UTC)  | Matching commit                    | Tag                                      |
| ------- | ---------------- | ---------------------------------- | ---------------------------------------- |
| 0.0.1   | 2014-03-28 15:24 | `54ce7fa`                          | `v0.0.1` → `54ce7fa` (new)               |
| 0.0.2   | 2014-03-28 15:53 | `079519a`                          | `v0.0.2` → `079519a` (new)               |
| 0.0.3   | 2014-03-28 22:17 | `709a56e`                          | `v0.0.3` → `9907a84` (existing, kept)    |
| 0.0.4   | 2014-07-17 21:11 | can't be matched: removed from npm | `v0.0.4` → `18906fe` (existing, kept)    |
| 0.0.5   | 2014-07-17 21:22 | `62f9cf7`                          | `v0.0.5` → `62f9cf7` (existing, correct) |
| 1.0.1   | 2016-04-12 20:07 | `be98a23`                          | `v1.0.1` → `be98a23` (new)               |
| 1.0.4   | 2016-04-12 21:31 | `de36d43`                          | `v1.0.4` → `de36d43` (new)               |
| 1.1.4   | 2016-05-11 14:53 | `4063d93`                          | `v1.1.4` → `4063d93` (new)               |
| 1.1.5   | 2016-05-13 09:11 | `eb09674`                          | `v1.1.5` → `eb09674` (new)               |

- New tags are annotated, created by the maintainer, and their messages say
  they are retroactive. The three existing tags (lightweight, 2014) are left
  as they are.
- 0.0.3: three commits have identical contents for the published files.
  `709a56e` ("Version bump for NPM") was committed nine seconds before the
  publish (22:17:04 UTC). The two later commits, which add `component.json`
  and `bower.json` (files the published package doesn't contain), were made
  about two hours after it. So the existing `v0.0.3` tag points at
  `9907a84`, a commit that didn't exist yet when 0.0.3 was published, but
  every file in the npm package is the same there. Kept, not moved: the tag
  has been public since 2014, git doesn't update a moved tag in existing
  clones, and Bower (below) resolves `0.0.3` through it. `9907a84` is the
  commit that added `bower.json`, so moving the tag to `709a56e` would give
  Bower installs of 0.0.3 a tree without `bower.json`. Keeping it follows
  instruction VI.E.2 as revised on 2026-11-03: a tag that predates the
  instructions is kept when every file in the published package is identical
  at its commit.
- 0.0.4: the version is in npm's history but its package is gone from the
  registry (HTTP 404), so it can't be compared. Commit timing suggests it was
  published from `098948e` (21:09 UTC, sets `package.json` to 0.0.4), and
  that `18906fe` (21:14 UTC, after the publish) only updated the versions in
  `bower.json` and `component.json`; `index.js` and `package.json` are
  identical in both. This is inferred, not verified, so the existing tag is
  kept as the only record.
- 0.0.5: `62f9cf7` was committed 12 seconds after the publish (authored 42
  seconds before it); its contents match the package.
- Bower resolves versions from git tags. Before these tags, the highest tag
  was `v0.0.5`, so an unpinned `bower install underscore-deep-extend` got
  0.0.5, although `bower.json` on the default branch says 1.1.5. With
  `v1.1.5` it gets 1.1.5, the code npm serves as `latest`. Bower installs
  saved with a 0.0.x range (`~0.0.5`, `^0.0.5`) don't move. Every future
  release gets a tag anyway (VI.E.1), so this change would have come with
  the next release. Bower's registry entry points to this repository
  (checked 2026-11-03).
- GitHub releases: every tag in the table gets a GitHub release (VI.E.1),
  created by the maintainer, whose notes are that version's `CHANGELOG.md`
  entry (D13). The entries were reconstructed in 2026 from the commit history
  and checked by running each version's code with underscore and lodash; the
  0.0.4 entry says its package is gone from npm. Only `v1.1.5` is marked as
  the latest release. None of these commits contains `publish.yml` (D12), so
  publishing their releases runs no publish workflow.

## D5. Test tooling (2026-11-02, decided)

- Runner: `node:test` (`npm test`). Developed and verified on Node.js 22.
- Dev dependencies, pinned to exact versions so pinned behavior can't shift
  under us: `underscore` 1.13.8, `lodash` 4.18.1, `acorn` 8.19.0 (for the ES5
  syntax check). No runtime dependencies. Older library versions for the
  matrix are installed under npm aliases (D6).
- Layout: `test/characterization/` holds behavior tests; `test/es5.test.js`
  enforces ES5 for `index.js`; `test/module-format.test.js` pins the module
  formats and entry point; `test/records.test.js` checks this repo's
  quirks log against the tests.

## D6. Library matrix (2026-11-02; older versions decided 2026-11-03)

Every behavior test runs against each library version below, each with
`deepExtend` mixed in as the README describes. lodash uses an isolated
`runInContext()` instance; underscore has no equivalent, so each installed
copy's shared instance is used.

| Family | Versions | Why |
| ------ | -------- | --- |
| underscore | 1.13.8, 1.8.3, 1.2.1 | newest; current when 1.1.5 shipped (2016); oldest that passes |
| lodash | 4.18.1, 3.10.1, 3.0.0 | newest; last of the 3.x line; oldest that passes |

- The newest versions are the plain `underscore` and `lodash` dev dependencies
  (D5). Older ones are npm aliases named after their version, e.g.
  `"lodash-3.10.1": "npm:lodash@3.10.1"`, so they're pinned in
  `package-lock.json` like any other dev dependency and cost no runtime
  dependency. Each matrix entry's name includes the version it loaded
  ("lodash 3.10.1").
- Differences are pinned with `perLibrary()`, keyed by family. Every family
  needs an expectation, so adding a family forces a decision at each place
  behavior differs. An exact entry name ("lodash 3.0.0") may override its
  family for one version. No override is needed today: within each family,
  every version above behaves identically for the whole suite.
- `test/library-matrix.test.js` pins the matrix, the aliases and the
  `perLibrary()` rules.

How the range was chosen (2026-11-03): the characterization suite was run
against the last release of every minor line of both libraries, then bisected
at each boundary. Every difference found comes from what the injected
library's `_.clone` returns; `index.js` itself behaves the same.

| Versions | Result |
| -------- | ------ |
| underscore 1.2.1 – 1.13.8 | every test passes |
| underscore 1.2.0 and older | `_.clone` of a primitive returns `{}`, so every primitive assignment becomes an empty object (44 tests fail). Unsupported. |
| underscore 1.0.x | `require()` returns an object without `_.mixin`, so the README setup fails. Unsupported. |
| lodash 3.0.0 – 4.18.1 | every test passes |
| lodash 2.2.0 – 2.4.2 | `_.clone` returns functions unchanged, so functions are copied by reference instead of becoming `{}` (Q5; 4 tests differ) |
| lodash 2.1.0 and older | as above, and Dates and RegExps become `{}`, as with underscore (Q6; 9 tests differ) |
| lodash 1.0.x and older | as above, and no `runInContext()` (the harness needs it; not library behavior) |

lodash 2 and older aren't in the matrix: their behavior is recorded here
rather than declared supported. Revisit if a consumer reports using them.

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

## D10. Package contents (2026-11-02, decided)

The npm package keeps the file set it has always had. `package.json` lists
`"files": ["index.js", "bower.json", "component.json"]`; npm always adds
`package.json`, `README.md` and `LICENSE.md`. That is exactly what 1.1.5
published, minus its `.npmignore` (a leftover list of ignore patterns that no
consumer reads).

- Why: without a `files` field, the next publish would also ship `test/`,
  `docs/`, `.github/` and `SECURITY.md`. None of them is useful to consumers,
  and an unchanged file set keeps the package's shape the same for anyone who
  inspects or vendors it.
- Enforced by `test/package-contents.test.js`, which asks npm for the file
  list with `npm pack --dry-run` and compares it to the list above. A new
  file in the repo can't reach the package without changing that test.
- Checked with npm 10 (bundled with Node.js 22) and npm 11; both produce the
  same list.
- The only difference from 1.1.5 is the missing `.npmignore`. Nothing loads
  or reads that file from an installed package, so its absence isn't treated
  as a breaking packaging change and doesn't require a major version.

## D11. Continuous integration (2026-11-02, decided)

GitHub Actions runs `npm ci` and `npm run test:coverage` on every pull request
to `master`, every push to `master`, and on demand
(`.github/workflows/test.yml`).

- Node.js matrix: every release line still supported upstream, 22 or later
  (the coverage flags need 22). As of 2026-11-02 that is 22, 24 and 26. The ES5
  check (D7) derives its list of post-ES5 members from the running Node.js
  version, so newer lines also tighten that check. Update the matrix when a
  line reaches end of life or a new LTS line ships.
- Required check: the single "All tests pass" job, which fails unless every
  Node.js job passed. Requiring it, rather than each Node.js job, means the
  ruleset doesn't need editing when the matrix changes.
- Hardening: the workflow's token is read-only, checkout doesn't keep
  credentials, third-party actions are pinned to full commit SHAs, and there
  is no dependency cache (three dev dependencies install in seconds, and a
  cache shared with pull request runs could be poisoned).
- Dependabot (`.github/dependabot.yml`) proposes updates to those pinned SHAs
  in one grouped pull request a month, waiting 7 days after a release. npm
  dependencies are excluded, since they are pinned on purpose (D5).

## D12. Publishing from CI with staged trusted publishing (2026-11-03, decided)

New versions are built and staged on npm by GitHub Actions
(`.github/workflows/publish.yml`), and made live by the maintainer with
two-factor authentication. Publishing stays the maintainer's action; CI only
prepares it.

- Flow: create the tag `vX.Y.Z` and publish a GitHub release for it. The
  workflow runs the full test suite on the tagged commit (it calls
  `test.yml`, D11), checks that the tag matches `package.json`'s version,
  isn't a prerelease and is on `master`, then runs `npm stage publish`. The
  staged version isn't installable until the maintainer runs
  `npm stage approve <id>` or approves it on npmjs.com (Staged Packages tab),
  both of which require two-factor.
- Authentication: npm trusted publishing (OIDC). There is no npm token in the
  repository or its secrets. The trusted publisher on npmjs.com names the
  repository `kurtmilam/underscoreDeepExtend`, the workflow file
  `publish.yml` and the environment `npm`, and allows `npm stage publish`
  only, not `npm publish`. The package's publishing access stays at "Require
  two-factor authentication and disallow tokens"; trusted publishing isn't a
  token and still works under it.
- GitHub environment `npm`: deployments allowed from `v*` tags only, so a
  branch can't obtain a token npm would accept. No required reviewers: the
  two-factor approval on npm is the human gate, and a second click in GitHub
  would only lengthen the time between merging and publishing.
- Provenance: generated automatically, since the repository and package are
  public. It records which workflow run built the tarball from which commit.
- `package.json`'s `repository.url` changed from
  `git://github.com/kurtmilam/underscoreDeepExtend.git` to
  `git+https://github.com/kurtmilam/underscoreDeepExtend.git`, the form npm
  itself writes. npm requires the field to match the repository that ran the
  workflow, and a mismatch shows only at publish time, so the less common
  `git://` form wasn't left to chance. Both name the same repository, and
  npm's package page links to the same place. Not a breaking change.
- Enforced by `test/publishing.test.js`: the repository field, the
  workflow's file name, and that the workflow stages but never runs
  `npm publish` and uses no npm token.
- npm version: the stage job installs a pinned npm (12.2.1 as of
  2026-11-03; staged publishing needs 11.15.0 or later) on Node.js 24.
  Dependabot doesn't update it; bump it deliberately.
- Prereleases (`X.Y.Z-tag`) are refused by the workflow for now. Revisit when
  one is planned, since they need a dist-tag other than `latest`.
- Limits: npm doesn't validate a trusted publisher when it is saved, and a
  new one expires if nothing is published through it within 2 days. So it is
  created on release day, shortly before the release (`npm trust github`).
  An OIDC publish can't be rehearsed without publishing. If staging fails,
  the fallback is an interactive `npm publish` with two-factor from the
  maintainer's machine, which "disallow tokens" doesn't block.

## D13. Changelog and release notes (2026-11-03, decided)

`CHANGELOG.md` at the repository root lists every published version, newest
first, under headings of the form `## [X.Y.Z] - YYYY-MM-DD` (the npm publish
date, UTC), with a link reference to the version's changes. Each entry is the
text of that version's GitHub release.

- Release notes are generated, not retyped:
  `node scripts/changelog-entry.js X.Y.Z` prints the entry's body, with
  hard-wrapped lines joined (GitHub shows every newline in release notes as a
  line break), followed by the publish date and the changes link. It can be
  piped into `gh release create vX.Y.Z --notes-file -`.
- Every release adds its entry in the same pull request as the version bump,
  so the tagged commit already contains it. A new entry's date is the planned
  publish date; correct it in a later change if publishing slips.
- Not part of the npm package: `files` (D10) leaves out `CHANGELOG.md` and
  `scripts/`, and `test/package-contents.test.js` still passes unchanged.
- Enforced by `test/changelog.test.js`: an entry exists for `package.json`'s
  version and for every version in D4; entries are unique, newest first, with
  non-increasing dates, and each has a body and a link naming its own version;
  the script's output format.
