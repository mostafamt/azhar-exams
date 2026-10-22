import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { UserProfile } from '@/lib/auth-actions';
import { auth } from '@/lib/auth';
import { db } from '@/lib/firebase';

type AuthState = {
  user: User | null;
  /** users/{uid}; null when signed out or when the document doesn't exist yet. */
  profile: UserProfile | null;
  /** True until Firebase reports the first auth state and, if signed in, the profile has loaded. */
  initializing: boolean;
  emailVerified: boolean;
  /** Reloads the user from Firebase; the only way to notice a verification done in the browser. */
  refreshUser: () => Promise<void>;
  /** True until the stored session and guest choice are known; doesn't wait for the profile (network). */
  restoring: boolean;
  /** Signed out but chose «التصفح كزائر» on the welcome screen. Remembered across launches. */
  isGuest: boolean;
  continueAsGuest: () => void;
  /** Back to the welcome screen, e.g. a guest who wants to sign in. */
  leaveGuest: () => void;
};

const GUEST_KEY = 'welcome.guest';

function storeGuest(isGuest: boolean) {
  (isGuest ? AsyncStorage.setItem(GUEST_KEY, '1') : AsyncStorage.removeItem(GUEST_KEY)).catch(() => {});
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = not known yet, null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [account, setAccount] = useState<{ uid: string | null; profile: UserProfile | null }>({
    uid: null,
    profile: null,
  });
  const [emailVerified, setEmailVerified] = useState(false);
  // undefined = not read from storage yet
  const [guest, setGuest] = useState<boolean | undefined>(undefined);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setEmailVerified(next?.emailVerified ?? false);
        // A signed-in user is no longer a guest, so signing out later shows the welcome screen again.
        if (next) {
          setGuest(false);
          storeGuest(false);
        }
      }),
    []
  );

  useEffect(() => {
    // Don't overwrite a value the auth listener already set while this was loading.
    AsyncStorage.getItem(GUEST_KEY)
      .then((value) => setGuest((current) => current ?? value === '1'))
      .catch(() => setGuest((current) => current ?? false));
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuest(true);
    storeGuest(true);
  }, []);

  const leaveGuest = useCallback(() => {
    setGuest(false);
    storeGuest(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) =>
        setAccount({ uid: user.uid, profile: snapshot.exists() ? (snapshot.data() as UserProfile) : null }),
      () => setAccount({ uid: user.uid, profile: null })
    );
  }, [user]);

  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    setEmailVerified(current.emailVerified);
  }, []);

  // Students verify from their mail app, so check again whenever they come back.
  useEffect(() => {
    if (!user || emailVerified) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUser().catch(() => {});
    });
    return () => subscription.remove();
  }, [user, emailVerified, refreshUser]);

  const profileKnown = !user || account.uid === user.uid;
  const value: AuthState = {
    user: user ?? null,
    profile: user && account.uid === user.uid ? account.profile : null,
    initializing: user === undefined || !profileKnown,
    emailVerified,
    refreshUser,
    restoring: user === undefined || guest === undefined,
    isGuest: !user && !!guest,
    continueAsGuest,
    leaveGuest,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
