# خطة ميزة: تسجيل الدخول وإنشاء الحساب

Feature plan for adding **Firebase Authentication** (email + password) to the app: sign up, log in, forgot password, email verification, and log out — plus moving the dashboard's admins into a single `users` collection.

Status: **implemented** (decisions in [§2](#2-decisions)). Code is done in both repos; the rollout in [§11](#11-rollout-order) (deploy rules → migrate admins → deploy function + dashboard → final rules) is still to do.

## 1. What we have today

| Item | Detail |
|---|---|
| Expo SDK | 57 (`expo ~57.0.27`), Expo Router 57, React Native 0.86, React 19.2 |
| Firebase | `firebase@13.0.0` (JS SDK), initialized in `src/lib/firebase.ts` (app + Firestore only) |
| Config | `EXPO_PUBLIC_FIREBASE_*` vars in `.env`, including `AUTH_DOMAIN` — nothing new needed |
| Data | `src/data/content.ts` reads `grades/**` with `onSnapshot`; `useGrades()` / `useSections(gradeId)` already exist |
| Navigation | Single root `Stack` in `src/app/_layout.tsx`; `index` → `/grades` → … → exam viewer |
| UI | Arabic, RTL forced (app.json + `+html.tsx`), colors in `src/constants/colors.ts` |
| Platforms | iOS, Android, web (`web.output: "static"`) |

**Dashboard (`../azhar-exams-dashboard`, same Firebase project)**

| Item | Detail |
|---|---|
| Sign-in | Email/Password is **already enabled** (`LoginPage.jsx` uses `signInWithEmailAndPassword`) |
| Admins | A document at `admins/{uid}` (created in the console) makes a user an admin |
| Admin checks | `firestore.rules` → `isAdmin()`; `functions/index.js` → `deleteNode`; `src/auth/AuthProvider.jsx` → `isAdmin` |
| Non-admins | Pages already hide edit controls when `!isAdmin`, but `LoginPage` shows «ليس لديه صلاحيات المشرف» and doesn't let a non-admin in |
| Tests | `tests/rules.test.js` (rules), `tests/deleteNode.test.js` (function) on the emulator |

## 2. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Login required to view exams? | **No.** Exams stay public. An account is optional, reachable from the home screen |
| 2 | Users storage | **One `users` collection** for students and admins, with a `role` field. Students can log in to the dashboard **read-only** |
| 3 | Email verification | **Yes**, sent after sign-up. Not blocking (see §7) |
| 4 | Extra profile fields | **Yes**, grade (الصف) and section (الشعبة) chosen at sign-up |

## 3. Scope

**In scope**

- Mobile app: sign up (name, email, password, confirm, grade, section), log in, forgot password, email verification (send + resend), log out
- Persistent session across app restarts
- Arabic error messages
- `users/{uid}` profile document with `role`
- Dashboard: switch admin checks from `admins/{uid}` to `users/{uid}.role == 'admin'`; let students log in read-only; migrate existing admins

**Out of scope (later)**

- Google / Apple / phone sign-in
- Editing the profile (grade/section) from the app — the rules below already allow it, only the screen is missing
- Change email/password, delete account
- Promoting users to admin from the dashboard UI (stays a console edit for now)
- Sign-up from the dashboard (students sign up in the mobile app)

## 4. User flow (mobile)

```
Home (index)  — always reachable, no login needed
  ├─ signed out:  «ابدأ المذاكرة الآن»  +  «تسجيل الدخول»
  │     └─ /sign-in                      «تسجيل الدخول»
  │           ├─ link → /sign-up         «إنشاء حساب جديد»
  │           │     name, email, password, confirm, grade, section
  │           │     → account created, verification email sent, signed in → back to home
  │           └─ link → /forgot-password «نسيت كلمة المرور؟»
  │                 → reset email sent → back to /sign-in
  └─ signed in:   «مرحبًا، {name}»
        ├─ banner if email not verified: «تحقق من بريدك الإلكتروني» [إعادة الإرسال] [تم التحقق]
        ├─ «ابدأ المذاكرة الآن» → /grades/{gradeId} (the student's own grade)
        └─ «تسجيل الخروج»

Grades → … → exam viewer: unchanged, open to everyone.
```

## 5. Firebase console

1. Email/Password sign-in: already enabled (the dashboard uses it). Nothing to do.
2. Authentication → Templates: set **password reset** and **email address verification** templates to Arabic; set the sender name and subject.
3. Authentication → Settings → Authorized domains: add the web hosting domain of the mobile app's web build.
4. Firestore rules, functions and data migration go through the dashboard repo, where the rules already live (§9).

## 6. Dependencies (mobile)

| Package | Why | Install |
|---|---|---|
| `@react-native-async-storage/async-storage` | Persist the auth session on iOS/Android | `npx expo install @react-native-async-storage/async-storage` |

`firebase/auth` already ships in `firebase`. AsyncStorage is in Expo Go, so **no development build is needed**.

## 7. Auth in the mobile app

### 7.1 Initialization — `src/lib/auth.ts` / `auth.web.ts`

On React Native, `getAuth()` keeps the session in memory only. Expo's guide ([expo.fyi/firebase-js-auth-setup](https://expo.fyi/firebase-js-auth-setup)) says to use `initializeAuth` with `getReactNativePersistence(AsyncStorage)`. Verified that `firebase@13.0.0` still exports both from its RN bundle (`@firebase/auth/dist/rn`).

```ts
// src/lib/auth.ts  (iOS / Android)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

import { app } from '@/lib/firebase';

// initializeAuth throws if called twice (Fast Refresh), so fall back to the existing instance.
function createAuth() {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
auth.languageCode = 'ar'; // reset + verification emails in Arabic
```

```ts
// src/lib/auth.web.ts  (web — IndexedDB persistence by default)
import { getAuth } from 'firebase/auth';

import { app } from '@/lib/firebase';

export const auth = getAuth(app);
auth.languageCode = 'ar';
```

`src/lib/firebase.ts` changes only to `export const app`.

**TypeScript:** the default `firebase/auth` types are the web ones and don't declare `getReactNativePersistence`. Usual fix, in `tsconfig.json`:

```json
"paths": {
  "@/*": ["./src/*"],
  "@firebase/auth": ["./node_modules/@firebase/auth/dist/index.rn.d.ts"]
}
```

To check with `npx tsc --noEmit` during implementation. If it causes trouble, use a one-line `// @ts-expect-error` on the import.

### 7.2 State — `src/hooks/use-auth.tsx`

```ts
type AuthState = {
  user: User | null;          // Firebase Auth user
  profile: UserProfile | null; // users/{uid}, live via onSnapshot
  initializing: boolean;       // true until the first onAuthStateChanged callback
};
```

- `AuthProvider` subscribes to `onAuthStateChanged`, and while signed in to `onSnapshot(users/{uid})`.
- `useAuth()` returns the state above. Screens that don't care about auth never wait for it. The splash screen is **not** held for auth, because browsing is public.

### 7.3 Actions — `src/lib/auth-actions.ts`

| Function | Firebase call(s) |
|---|---|
| `signUp({ name, email, password, gradeId, sectionId })` | `createUserWithEmailAndPassword` → `updateProfile({ displayName })` → `setDoc(users/{uid}, { …, role: 'student' })` → `sendEmailVerification` |
| `signIn(email, password)` | `signInWithEmailAndPassword` |
| `sendPasswordReset(email)` | `sendPasswordResetEmail` |
| `resendVerification()` | `sendEmailVerification(auth.currentUser)` |
| `refreshVerification()` | `auth.currentUser.reload()`, then re-read `emailVerified` |
| `signOut()` | `signOut` |

If `setDoc` fails after the account is created (e.g. network drops), the account exists without a profile. `AuthProvider` handles it: signed in + no profile document → show a «أكمل بياناتك» form (grade/section) instead of crashing. The same form is reused later for "edit profile".

### 7.4 Email verification

- Sent automatically after sign-up, in Arabic (`auth.languageCode`).
- **Not blocking**: an unverified student can use the app normally, because exams are public anyway. The home banner reminds them until `emailVerified` is true.
- «إعادة الإرسال» is disabled for 60 seconds after each send. `auth/too-many-requests` shows its message.
- «تم التحقق» calls `reload()`. Firebase doesn't push `emailVerified` changes to the app, so reloading is the only way to see them. Also call `reload()` when the app returns to the foreground (`AppState`).
- Later features (favorites, progress) can require `request.auth.token.email_verified` in rules if needed.

### 7.5 Errors — `src/lib/auth-errors.ts`

Reuse the dashboard's `AUTH_ERRORS` wording so both apps say the same thing:

| Code | Message |
|---|---|
| `auth/invalid-email` | البريد الإلكتروني غير صالح |
| `auth/invalid-credential` | البريد الإلكتروني أو كلمة المرور غير صحيحة |
| `auth/email-already-in-use` | هذا البريد مسجّل بالفعل |
| `auth/weak-password` | كلمة المرور ضعيفة (٦ أحرف على الأقل) |
| `auth/too-many-requests` | محاولات كثيرة، حاول مرة أخرى بعد قليل |
| `auth/network-request-failed` | تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت |
| anything else | حدث خطأ غير متوقع، حاول مرة أخرى |

With email-enumeration protection, `sendPasswordResetEmail` succeeds even for unknown emails, so the success message is always «إذا كان البريد مسجّلًا، ستصلك رسالة لإعادة تعيين كلمة المرور».

## 8. Data model — `users/{uid}`

```
users/{uid}
  name:      string                 // 1–100 chars
  email:     string                 // must equal the Auth email
  role:      'student' | 'admin'    // set to 'student' by the app; 'admin' only via console
  gradeId:   string                 // id under grades/
  sectionId: string                 // id under grades/{gradeId}/sections/
  createdAt: timestamp
  updatedAt: timestamp
```

- Store **ids**, not names, so renaming a grade in the dashboard doesn't break profiles.
- `role` is the only thing that grants dashboard write access. Clients can never set or change it (§9).

## 9. Firestore rules (in `azhar-exams-dashboard/firestore.rules`)

```
function signedIn() { return request.auth != null; }
function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

function userPath() { return /databases/$(database)/documents/users/$(request.auth.uid); }

// Admin = signed in and users/{uid}.role == 'admin'.
function isAdmin() {
  return signedIn()
    && exists(userPath())
    && get(userPath()).data.get('role', '') == 'admin';
}

function validProfile() {
  let d = request.resource.data;
  return d.name is string && d.name.size() > 0 && d.name.size() <= 100
    && d.gradeId is string && d.sectionId is string
    && exists(/databases/$(database)/documents/grades/$(d.gradeId)/sections/$(d.sectionId));
}

match /users/{uid} {
  allow read: if isOwner(uid) || isAdmin();

  allow create: if isOwner(uid)
    && request.resource.data.keys().hasOnly(
         ['name', 'email', 'role', 'gradeId', 'sectionId', 'createdAt', 'updatedAt'])
    && request.resource.data.role == 'student'
    && request.resource.data.email == request.auth.token.email
    && validProfile();

  // Students may edit their own name / grade / section — never role, email or createdAt.
  allow update: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['name', 'gradeId', 'sectionId', 'updatedAt'])
    && validProfile();

  allow delete: if false;
}
```

`grades/**` and `questions/**` keep their current rules (`allow read: if true`, writes need `isAdmin()`). Only `isAdmin()`'s body changes, so a student signed into the dashboard can read everything and write nothing. That is what makes it **read-only**, whatever the UI shows.

Cost: `isAdmin()` does one document read per admin write. Dashboard writes are rare, so this is fine. Firestore caches the `get()` within a single request.

**Transition:** during migration `isAdmin()` accepts **either** the old or the new source:

```
function isAdmin() {
  return signedIn() && (
    exists(/databases/$(database)/documents/admins/$(request.auth.uid))
    || (exists(userPath()) && get(userPath()).data.get('role', '') == 'admin')
  );
}
```

Remove the `admins` branch and the `match /admins/{uid}` block once §11 step 5 is done.

## 10. Dashboard changes (`../azhar-exams-dashboard`)

| File | Change |
|---|---|
| `firestore.rules` | `users` rules + new `isAdmin()` (transitional first, then final) |
| `functions/index.js` | `deleteNode`: replace `db.doc('admins/uid').get().exists` with `users/{uid}` `role === 'admin'` |
| `src/auth/AuthProvider.jsx` | Listen to `users/{uid}` instead of `admins/{uid}`; `isAdmin = data?.role === 'admin'`; also expose `profile` |
| `src/pages/LoginPage.jsx` | Title «تسجيل الدخول»; after sign-in redirect **any** user (not only admins); drop the «ليس لديه صلاحيات المشرف» branch |
| Header / nav | Show the user's name and role badge («مشرف» / «طالب») so students understand why there are no edit buttons |
| `tests/rules.test.js` | Cases: student can't write `grades/**` / `questions/**`; can't create with `role: 'admin'`; can't change `role`; can't read another user; admin can do all of these |
| `tests/deleteNode.test.js` | Admin seeded via `users/{uid}` with `role: 'admin'`; student gets `permission-denied` |
| `scripts/migrate-admins.mjs` | One-off: for each `admins/{uid}`, create/merge `users/{uid}` `{ role: 'admin', name, email, createdAt }` using the Admin SDK |

Existing admins have no `gradeId`/`sectionId`. That's fine: `validProfile()` only runs on client writes, and admin documents are written by the Admin SDK. If an admin edits their own profile later, the form must ask for those fields.

**Known, unchanged risk:** image uploads use an *unsigned* Cloudinary preset (`src/lib/cloudinary.js`), so the upload endpoint is open to anyone who reads the preset name. That is already true today. Students still can't attach an upload to an exam, because that's a Firestore write that needs `isAdmin()`. Signed uploads through a function would close it, but that's separate work.

## 11. Rollout order

The two apps share one project, so do the steps in this order. Nobody loses access at any point.

1. **Dashboard:** deploy the **transitional** rules (old `admins` OR new `role`) + `users` rules. Run rules tests first.
2. **Dashboard:** run `scripts/migrate-admins.mjs`. Check in the console that every admin has `users/{uid}.role == 'admin'`.
3. **Dashboard:** deploy the updated `deleteNode` function and the dashboard UI (AuthProvider, LoginPage).
4. **Mobile:** ship sign-up / login (this repo, §12).
5. **Dashboard:** deploy the **final** rules (drop the `admins` branch and `match /admins`). After a while, delete the `admins` collection in the console.

## 12. Mobile routes & UI

### Routes (`src/app/`)

| File | URL | Screen |
|---|---|---|
| `src/app/_layout.tsx` | — | Wrap in `AuthProvider`; register the `(auth)/*` screens under a `!user` guard and `complete-profile` under `user && !profile` (no nested `(auth)/_layout`, so the root header and back button apply) |
| `src/app/(auth)/sign-in.tsx` | `/sign-in` | Email, password, «دخول», links to sign-up / forgot-password |
| `src/app/(auth)/sign-up.tsx` | `/sign-up` | Name, email, password, confirm, grade, section, «إنشاء الحساب» |
| `src/app/(auth)/forgot-password.tsx` | `/forgot-password` | Email, «إرسال رابط إعادة التعيين», success message |
| `src/app/complete-profile.tsx` | `/complete-profile` | Grade + section form for signed-in users without a profile (§7.3) |
| `src/app/index.tsx` | `/` | Signed-out: sign-in button. Signed-in: greeting, verification banner, shortcut to own grade, sign-out |
| content screens | unchanged | No guard — public |

Only the auth screens are guarded (signed-in users shouldn't see them):

```tsx
<Stack>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen name="grades/index" options={{ title: 'الصفوف' }} />
  <Stack.Protected guard={!user}>
    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
  </Stack.Protected>
</Stack>
```

After sign-in or sign-up, `user` becomes non-null, the guard removes the `(auth)` screens and the router goes back to home. Screens never call `router.replace` themselves. Check the exact `Stack.Protected` API against the SDK 57 docs (`docs.expo.dev/router/advanced/protected/`) before coding.

### Grade & section pickers (sign-up)

- Grades from `useGrades()`, sections from `useSections(gradeId)`, both from `src/data/content.ts`. Live and sorted already, and they match whatever the dashboard has.
- Use the existing `segmented-control.tsx` for sections (few options: علمي / أدبي). For grades, use a list of selectable cards, or the segmented control if there are ≤ 3.
- Changing the grade clears the section. Both are required before submit.
- Loading / empty / error states use the existing `empty-state.tsx`.

### Components (`src/components/`)

| Component | Notes |
|---|---|
| `text-field.tsx` | Label + `TextInput` + inline error; `textAlign: 'right'`; email fields `keyboardType="email-address"`, `autoCapitalize="none"`; `autoComplete` / `textContentType` (`email`, `password`, `new-password`, `name`) for password managers |
| `password-field.tsx` | `text-field` + show/hide toggle |
| `primary-button.tsx` | Extracted from the button in `src/app/index.tsx`; `loading` prop (spinner + disabled) |
| `form-message.tsx` | Banner for mapped Firebase errors (`tone="error"`) and confirmations (`tone="success"`) |
| `form-screen.tsx` | Keyboard-aware scrollable layout shared by all account forms |
| `grade-section-picker.tsx` | Grade + section from Firestore; auto-selects when there's only one option |
| `verify-email-banner.tsx` | Home banner: message, «إعادة الإرسال» (60s cooldown), «تم التحقق» |

- Forms sit in `KeyboardAvoidingView` + `ScrollView` (`keyboardShouldPersistTaps="handled"`).
- `returnKeyType="next"` moves between fields; the last one submits.
- Validate on the client first: required fields, email format, password ≥ 6, confirm matches, grade + section chosen.
- Add `error: '#dc2626'` and `warningSoft` (banner background) to `Colors`.

## 13. Implementation steps

**Dashboard repo** — §10 and §11 steps 1–3, with rules and function tests passing on the emulator.

**This repo**

1. `npx expo install @react-native-async-storage/async-storage`
2. Export `app` from `src/lib/firebase.ts`; add `src/lib/auth.ts`, `auth.web.ts`; tsconfig path (§7.1)
3. `src/lib/auth-actions.ts`, `src/lib/auth-errors.ts`, `src/hooks/use-auth.tsx`
4. Components (§12)
5. `(auth)` routes, `complete-profile`, root layout guard
6. Home screen: signed-in/out states, verification banner, grade shortcut
7. `npx expo lint`, `npx tsc --noEmit`

## 14. Implementation notes

- `useSections(gradeId)` now accepts an empty id and skips the query (an empty id would build the invalid path `grades//sections`).
- The grade screen takes an optional `?section=` param, so the home shortcut opens the student's own section.
- Firebase 13 accepts AsyncStorage v2's default export (what `npx expo install` picked: 2.2.0). With AsyncStorage v3 it would be `createAsyncStorage('app')` instead.
- Dashboard: only the **rules** are transitional (they accept `admins/{uid}` too, since they go live before the migration). `deleteNode` and `AuthProvider` read `users/{uid}` only, so deploy them after `scripts/migrate-admins.mjs --write`.
- Home doesn't auto-redirect to `/complete-profile`. Right after sign-up the profile document doesn't exist for a moment, and a redirect would race the write. It shows a link instead.

## 15. Test checklist

**Mobile**

- [ ] Exams browsable while signed out, as before
- [ ] Sign up → `users/{uid}` has `role: 'student'`, correct `gradeId`/`sectionId`; verification email arrives in Arabic
- [ ] Banner shows while unverified; resend has cooldown; after clicking the link, «تم التحقق» hides the banner
- [ ] Home shortcut opens the student's own grade
- [ ] Existing email / weak password / mismatched confirm / missing grade → correct Arabic message
- [ ] Wrong password → Arabic error
- [ ] Kill and reopen → still signed in (iOS, Android, web)
- [ ] Sign out → home shows signed-out state; content still works
- [ ] Signed in → `/sign-in` deep link redirects away
- [ ] Forgot password → Arabic email, reset works, new password logs in
- [ ] Network drop between account creation and profile write → complete-profile form appears
- [ ] Airplane mode → network error message
- [ ] RTL layout and keyboard handling on small Android screens; password-manager autofill

**Dashboard / rules**

- [ ] Existing admins can still edit at every rollout step
- [ ] A student logs in to the dashboard, sees everything, no edit controls, and direct writes are rejected by rules
- [ ] A student can't create a profile with `role: 'admin'` or change `role` later
- [ ] A student can't read another user's profile; an admin can
- [ ] `deleteNode` rejects students with `permission-denied`
