import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const urlMissing  = !supabaseUrl  || supabaseUrl  === 'https://placeholder.supabase.co';
const keyMissing  = !supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key';

console.log('[Supabase] init', {
  url:  urlMissing  ? '(missing or placeholder)' : supabaseUrl,
  key:  keyMissing  ? '(missing or placeholder)' : '(set)',
});

// Exported so App can render a visible diagnostic instead of a blank screen.
export const supabaseConfigError =
  urlMissing || keyMissing
    ? 'Supabase environment variables are not configured. ' +
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Netlify ' +
      'environment variables (Site → Settings → Environment variables), ' +
      'then trigger a new deploy.'
    : null;

// Always create a client so the module never throws at import time.
// If env vars are wrong the client will fail gracefully at runtime
// and the ErrorBoundary / config-error screen will catch it.
export const supabase = createClient(
  supabaseUrl     || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);
