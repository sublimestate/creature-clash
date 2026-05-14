import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type AuthStatus =
  | 'idle'           // booted, not yet checked
  | 'signed_out'
  | 'awaiting_link' // magic link sent, waiting for user to click it
  | 'signed_in';

interface AuthState {
  configured: boolean;
  status: AuthStatus;
  user: User | null;
  email: string | null;
  errorMessage: string | null;
  init: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

let listenerSubscribed = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  configured: isSupabaseConfigured,
  status: isSupabaseConfigured ? 'idle' : 'signed_out',
  user: null,
  email: null,
  errorMessage: null,

  init: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ configured: false, status: 'signed_out' });
      return;
    }
    if (!listenerSubscribed) {
      supabase.auth.onAuthStateChange((_event, session) => {
        applySession(set, session);
      });
      listenerSubscribed = true;
    }
    const { data } = await supabase.auth.getSession();
    applySession(set, data.session);
  },

  sendMagicLink: async (email) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: 'Supabase not configured.' };
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      return { ok: false, error: 'Enter a valid email.' };
    }
    // Redirect target after the user clicks the link. Linking.createURL handles
    // both web (origin + path) and native (scheme://path).
    const redirectTo = Linking.createURL('/auth/callback');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      set({ errorMessage: error.message });
      return { ok: false, error: error.message };
    }
    set({
      status: 'awaiting_link',
      email: trimmed,
      errorMessage: null,
    });
    return { ok: true };
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ status: 'signed_out', user: null, email: null });
  },
}));

function applySession(
  set: (
    partial:
      | Partial<AuthState>
      | ((s: AuthState) => Partial<AuthState>),
  ) => void,
  session: Session | null,
) {
  if (session?.user) {
    set({
      status: 'signed_in',
      user: session.user,
      email: session.user.email ?? null,
      errorMessage: null,
    });
  } else {
    // Don't clobber 'awaiting_link' just because there's no session yet.
    set((s) =>
      s.status === 'awaiting_link'
        ? {}
        : { status: 'signed_out', user: null },
    );
  }
}
