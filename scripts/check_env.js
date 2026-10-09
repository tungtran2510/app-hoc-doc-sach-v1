const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const lines = content.split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/^(ADMIN_PASSWORD|ADMIN_SECRET)=(.*)$/);
  if (match) {
    const k = match[1].trim();
    let v = match[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    console.log(`${k}: length=${v.length}, prefix=${v.substring(0, 3)}***`);
  }
}
