import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!url && !!anonKey;

// null until .env.local has real credentials — every caller must handle that.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;

// Module-level (not per-hook-instance) so near-simultaneous mounts of
// different hooks that both need a signed-in session — e.g. useFriends and
// useTaskBoard mounting together in App, or React StrictMode's dev-only
// double effect invocation — converge on the same sign-in instead of each
// independently calling signInAnonymously(), which would leave the client's
// actual session (last write to its localStorage) mismatched from whichever
// uid a given caller happened to read, causing every write to fail RLS.
let sessionPromise: Promise<string | null> | null = null;

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!supabase) return null;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user.id) return session.user.id;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return data.user?.id ?? null;
    })();
  }
  return sessionPromise;
}
