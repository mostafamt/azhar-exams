import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { TurboModuleRegistry } from 'react-native';

import { auth } from '@/lib/auth';

// iOS / Android: the native Google account picker gives an idToken, which signs in to Firebase.
// The library's native module exists only in development and store builds, not in Expo Go, so it
// is imported lazily; in Expo Go the button stays visible and explains that it isn't available.
const available = TurboModuleRegistry.get('RNGoogleSignin') != null;

let configured = false;

async function loadGoogleSignin() {
  const lib = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    // The web client id is what makes Google return an idToken that Firebase accepts.
    lib.GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  return lib;
}

export async function signInWithGoogle() {
  if (!available) {
    throw Object.assign(new Error('RNGoogleSignin native module is missing (Expo Go?)'), {
      code: 'google/unavailable',
    });
  }
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await loadGoogleSignin();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    // Anything else means the user closed the account picker.
    if (!isSuccessResponse(response)) return;
    const { idToken } = response.data;
    if (!idToken) throw new Error('Google returned no idToken; is EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set?');
    // A first-time Google user has no users/{uid} yet; home then links to /complete-profile.
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS || error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw Object.assign(new Error(error.message), { code: 'google/play-services-not-available' });
      }
    }
    throw error;
  }
}

/** Forgets the chosen Google account, so the next sign-in shows the account picker again. */
export async function signOutOfGoogle() {
  if (!available) return;
  const { GoogleSignin } = await loadGoogleSignin();
  await GoogleSignin.signOut();
}
