const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1].trim()] = v;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

async function check() {
  const res = await sb.from('settings').select('admin_password, block_styles').eq('workspace_id', 'default').single();
  console.log('Error:', res.error);
  console.log('admin_password in DB length:', res.data?.admin_password?.length);
  console.log('admin_password in DB is scrypt:', res.data?.admin_password?.startsWith('scrypt$'));
  console.log('admin_password in DB prefix:', res.data?.admin_password?.slice(0, 10));
  console.log('ADMIN_PASSWORD in env length:', env.ADMIN_PASSWORD?.length);
  console.log('ADMIN_PASSWORD in env prefix:', env.ADMIN_PASSWORD?.slice(0, 3));

  // Check if verifyPassword matches either
  const crypto = require('crypto');
  function safeEqualStrings(a, b) {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  }
  function verifyPassword(input, stored) {
    if (typeof input !== 'string' || !stored) return false;
    if (stored.startsWith('scrypt$')) {
      const [, salt, hash] = stored.split('$');
      if (!salt || !hash) return false;
      try {
        const test = crypto.scryptSync(input, salt, 64);
        const expected = Buffer.from(hash, 'hex');
        return test.length === expected.length && crypto.timingSafeEqual(test, expected);
      } catch {
        return false;
      }
    }
    return safeEqualStrings(input, stored);
  }

  console.log('Match with DB admin_password using env.ADMIN_PASSWORD:', verifyPassword(env.ADMIN_PASSWORD, res.data?.admin_password));
  console.log('Match with DB admin_password using Tung@2510:', verifyPassword('Tung@2510', res.data?.admin_password));
  console.log('Match with DB admin_password using 0974248716:', verifyPassword('0974248716', res.data?.admin_password));
}

check();
