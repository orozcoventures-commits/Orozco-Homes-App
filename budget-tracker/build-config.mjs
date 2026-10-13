// Writes config.js from Netlify environment variables so the page can reach
// Supabase without committing project values to the repo. Same variable names
// as the main app (see .env.example). Missing values => the tracker runs in
// this-device-only mode.
import { writeFileSync } from 'node:fs';

// Tolerate values pasted with spaces, quotes, a trailing slash or the "/rest/v1/" API path
const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '').trim();
const url = clean(process.env.VITE_SUPABASE_URL).replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const anonKey = clean(process.env.VITE_SUPABASE_ANON_KEY);

writeFileSync(
  new URL('./config.js', import.meta.url),
  `window.BUDGET_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: anonKey })};\n`,
);
console.log(url && anonKey
  ? `config.js written with Supabase settings (url=${url}, key starts ${anonKey.slice(0, 15)}…)`
  : 'config.js written WITHOUT Supabase settings (device-only mode)');
