'use strict';

// Prints one version's CHANGELOG.md entry as GitHub release notes
// (docs/DECISIONS.md, D13). Usage:
//
//   node scripts/changelog-entry.js 1.1.5
//   node scripts/changelog-entry.js 1.1.5 | gh release create v1.1.5 --notes-file -
//
// The notes are the entry's body, followed by its npm publish date and the
// link to its changes, taken from the entry's heading and link reference.

const fs = require('node:fs');
const path = require('node:path');

const CHANGELOG = path.join(__dirname, '..', 'CHANGELOG.md');
const HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/;

function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const links = lines.reduce(function (acc, line) {
    const m = /^\[(\d+\.\d+\.\d+)\]: (\S+)$/.exec(line);
    return m ? Object.assign({}, acc, { [m[1]]: m[2] }) : acc;
  }, {});
  const starts = lines.reduce(function (acc, line, i) {
    const m = HEADING.exec(line);
    return m ? acc.concat({ version: m[1], date: m[2], line: i }) : acc;
  }, []);
  const end = lines.findIndex(function (line) { return /^\[\d+\.\d+\.\d+\]: /.test(line); });
  return starts.map(function (s, i) {
    const stop = i + 1 < starts.length ? starts[i + 1].line : (end === -1 ? lines.length : end);
    const body = lines.slice(s.line + 1, stop).join('\n').trim();
    return { version: s.version, date: s.date, body: body, link: links[s.version] };
  });
}

// GitHub renders every newline in release notes as a line break, so the
// changelog's hard-wrapped paragraphs and list items are joined into one line
// each. Blank lines, headings and new list items still start a new line.
function unwrap(text) {
  return text.split('\n').reduce(function (acc, line) {
    const prev = acc.length ? acc[acc.length - 1] : '';
    const continues = line.trim() !== '' && prev.trim() !== '' &&
      !/^#/.test(prev) && !/^(#|- |\d+\. )/.test(line);
    return continues
      ? acc.slice(0, -1).concat(prev + ' ' + line.trim())
      : acc.concat(line);
  }, []).join('\n');
}

function releaseNotes(entry) {
  const changes = /\/compare\//.test(entry.link || '')
    ? ' ([changes](' + entry.link + '))'
    : '';
  const footer = 'Published to npm on ' + entry.date + changes + '.';
  return (entry.body ? unwrap(entry.body) + '\n\n' : '') + footer + '\n';
}

function main(argv) {
  const version = String(argv[0] || '').replace(/^v/, '');
  const entry = parse(fs.readFileSync(CHANGELOG, 'utf8')).find(function (e) {
    return e.version === version;
  });
  if (!entry) {
    process.stderr.write('No CHANGELOG.md entry for version "' + version + '".\n');
    return 1;
  }
  process.stdout.write(releaseNotes(entry));
  return 0;
}

module.exports = { parse: parse, unwrap: unwrap, releaseNotes: releaseNotes };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
