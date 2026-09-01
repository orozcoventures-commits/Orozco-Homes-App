import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const urlMissing = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';
const keyMissing = !supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key';

// Exported so main.js can disable the forms instead of failing silently.
export const supabaseConfigError =
  urlMissing || keyMissing
    ? 'Supabase environment variables are not configured. ' +
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to this site\'s ' +
      'Netlify environment variables (Site → Settings → Environment variables), ' +
      'then trigger a new deploy.'
    : null;

// Always create a client so the module never throws at import time.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);
