import { useState } from 'react';

import { authErrorMessage, isCancelledSignIn } from '@/lib/auth-errors';
import { signInWithGoogle } from '@/lib/google-sign-in';

/**
 * «المتابعة باستخدام Google» buttons. On success the root layout's guards leave the screen;
 * closing the account picker isn't an error.
 */
export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isCancelledSignIn(e)) setError(authErrorMessage(e));
    } finally {
      // Also after a closed account picker, which resolves without signing in.
      setLoading(false);
    }
  }

  return { signIn, loading, error };
}
