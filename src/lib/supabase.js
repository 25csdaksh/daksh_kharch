import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env) ? process.env : {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;


// Check if credentials are valid and not default placeholders
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('your-project-id.supabase.co') || url.includes('placeholder')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

const isValidKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('your-supabase-anon') || key.includes('placeholder')) return false;
  return key.trim().length > 10;
};

export const isSupabaseConfigured = Boolean(isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey));

// Create client if configured, otherwise create a mock-safe fallback to prevent runtime crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: (typeof window !== 'undefined' && window.localStorage?.getItem('paisatrack_auth_session'))
          ? 'paisatrack_auth_session'
          : 'hisabsetu_auth_session'
      }
    })
  : null;
