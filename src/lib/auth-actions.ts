import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { signOutOfGoogle } from '@/lib/google-sign-in';

/**
 * users/{uid} — one collection for students and dashboard admins. The app always writes
 * role 'student'; firestore.rules (in azhar-exams-dashboard) reject anything else and never let
 * a client change role, email or createdAt. Admins are promoted in the Firebase console.
 */
export type UserProfile = {
  name: string;
  email: string;
  role: 'student' | 'admin';
  gradeId?: string;
  sectionId?: string;
};

export type ProfileFields = { name: string; gradeId: string; sectionId: string };

export async function signUp({ email, password, ...fields }: ProfileFields & { email: string; password: string }) {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(user, { displayName: fields.name });
  // If this fails (e.g. the connection drops), the account exists without a profile and the
  // home screen sends the user to /complete-profile.
  await createProfile(fields);
  // Not awaited: verification isn't required, so a failure here shouldn't fail the sign-up.
  sendEmailVerification(user).catch(() => {});
}

/** Creates users/{uid} for the signed-in user. */
export async function createProfile({ name, gradeId, sectionId }: ProfileFields) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not signed in');
  await setDoc(doc(db, 'users', user.uid), {
    name: name.trim(),
    email: user.email,
    role: 'student',
    gradeId,
    sectionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

export async function signOut() {
  // Best effort: a failure here shouldn't keep the user signed in to the app.
  await signOutOfGoogle().catch(() => {});
  await firebaseSignOut(auth);
}
