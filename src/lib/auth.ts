import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

import { app } from '@/lib/firebase';

// getAuth() alone keeps the session in memory on iOS/Android; AsyncStorage keeps users signed in.
// initializeAuth throws when Fast Refresh re-runs this module, so reuse the existing instance then.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
// Password reset and verification emails in Arabic.
auth.languageCode = 'ar';
