import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Supabase project URL + anon key are PUBLIC by design (Row Level Security
// on the server is what actually protects data). Hardcoding here is fine and
// works around Metro's flaky `process.env.EXPO_PUBLIC_*` inlining on Windows
// for `expo export --platform web`. To override per-deploy or per-project,
// set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in `.env.local` for dev — those
// take precedence when Metro picks them up, otherwise these constants apply.
const FALLBACK_SUPABASE_URL = 'https://bykfgecvimbnufwwscgr.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a2ZnZWN2aW1ibnVmd3dzY2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTU5MDUsImV4cCI6MjA5MzA3MTkwNX0.KxRM61Z7yR-QArbVjmXy7W0WFZ7wSghTQdRnK5p-NCc';

const extra =
  (Constants.expoConfig?.extra as
    | { supabaseUrl?: string; supabaseAnonKey?: string }
    | undefined) ?? {};

// Use `||` not `??` so empty strings (which Metro inlines from app.config.js
// when env vars aren't set on CI) fall through to the fallback constants.
const rawUrl =
  extra.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;
const rawKey =
  extra.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Auth and data calls will fail until you configure .env.local.',
  );
}

// Fall back to harmless placeholders so createClient doesn't throw at import
// time before env vars are set. Real network calls will still fail until
// configured — gate them on `isSupabaseConfigured`.
const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
