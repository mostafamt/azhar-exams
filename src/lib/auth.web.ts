import { getAuth } from 'firebase/auth';

import { app } from '@/lib/firebase';

// The browser default (IndexedDB) already keeps users signed in.
export const auth = getAuth(app);
auth.languageCode = 'ar';
