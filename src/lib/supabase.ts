import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';
import { SecureSessionStorage } from './secure-session-storage';

export const sessionStorage = new SecureSessionStorage();

// Named explicitly so the app can read the stored session itself when it
// starts offline (see features/auth/api/loadInitialSession.ts).
export const sessionStorageKey = 'fittracker-session';

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    storageKey: sessionStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    // Email verification uses codes typed into the app, never links.
    detectSessionInUrl: false,
  },
});

// Refresh the access token only while the app is in the foreground, as
// Supabase recommends for React Native. When the app comes back, the client
// refreshes straight away if the token expired in the meantime.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
