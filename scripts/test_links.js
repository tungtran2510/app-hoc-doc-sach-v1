const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      results = results.concat(walk(p));
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const matches = line.matchAll(/href=["'](\/[^"']*)["']/g);
        for (const m of matches) {
          results.push({ file: p, line: idx + 1, href: m[1] });
        }
      });
    }
  }
  return results;
}

const links = walk('src');
console.log('Found internal links:', links.length);
links.forEach(l => console.log(`${l.file}:${l.line} -> ${l.href}`));
