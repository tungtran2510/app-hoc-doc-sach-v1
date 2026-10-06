const { execSync } = require('child_process');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split(/\r?\n/);

const vars = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (key && val && key !== 'VERCEL_OIDC_TOKEN') {
    vars[key] = val;
  }
}

console.log('Adding environment variables to Vercel production:');
for (const [key, val] of Object.entries(vars)) {
  try {
    execSync(`cmd.exe /c npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
  } catch {}
  try {
    execSync(`cmd.exe /c npx vercel env add ${key} production`, {
      input: val + '\n',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    console.log('✓ Added', key);
  } catch (err) {
    console.error('Error adding', key, err.message);
  }
}
console.log('All env vars synced to Vercel production!');
