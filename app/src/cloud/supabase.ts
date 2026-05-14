import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Pull credentials from Expo public env vars. They're shipped to the client
// bundle, so the anon key MUST stay an anon key (never service_role). RLS on
// the saves table is what actually protects user data.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);

let cached: SupabaseClient | null = null;

// Lazy client. Returns null until the env vars are filled in, so the rest of
// the app can compile and run with cloud sync simply disabled.
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      // AsyncStorage on native; the SDK falls back to localStorage on web.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // picks up the magic-link hash on web load
    },
  });
  return cached;
}
