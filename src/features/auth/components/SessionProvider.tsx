import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { logger } from '@/lib/logger';
import { useCardioRecording } from '@/features/cardio/recordingStore';
import { useActiveWorkout } from '@/features/workout/activeWorkoutStore';
import { clearCachedData } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

import { loadInitialSession, toSignedInUser, type SignedInUser } from '../api/loadInitialSession';

type SessionContextValue = {
  user: SignedInUser | null;
  isLoading: boolean;
  // A correct password-reset code signs the user in before they have chosen
  // the new password. While this is true, navigation keeps them on the reset
  // screen instead of switching to the signed-in screens.
  isResettingPassword: boolean;
  setResettingPassword: (resetting: boolean) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    loadInitialSession()
      .then((initialUser) => {
        if (active) setUser(initialUser);
      })
      .catch((error: unknown) => logger.error('load session', error))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // The initial session is handled by loadInitialSession, which also
      // covers starting offline; this event would report no user in that case.
      if (event === 'INITIAL_SESSION') return;
      // Covers both signing out and the server ending the session, so the
      // next person on this phone never sees the previous user's data.
      if (event === 'SIGNED_OUT') {
        void clearCachedData();
        useActiveWorkout.getState().clear();
        useCardioRecording.getState().clear();
      }
      setUser(session ? toSignedInUser(session.user) : null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading, isResettingPassword, setResettingPassword }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}
