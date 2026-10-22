// tsconfig points the firebase/auth types at the React Native build, which has no popup sign-in;
// the browser build used here at runtime does.
// @ts-expect-error signInWithPopup is missing from the React Native typings only
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { auth } from '@/lib/auth';

// A first-time Google user has no users/{uid} yet; home then links to /complete-profile.
export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

/** The popup keeps no account choice of its own, so there's nothing to forget on web. */
export async function signOutOfGoogle() {}
