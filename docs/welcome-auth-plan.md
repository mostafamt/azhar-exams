# خطة شاشة الترحيب: Welcome & Auth

Plan for replacing the current home (`src/app/index.tsx`) with the **Welcome & Auth** screen from the design in [`docs/1 · Welcome & Auth-html/Main.dc.html`](<1 · Welcome & Auth-html/Main.dc.html>). This is the screen a signed-out user sees first when they open the app.

Status: **implemented** with the proposals in [§2](#2-decisions-to-confirm) (legal footer hidden, slides 2–3 copy written for current features). Google sign-in is coded for web and native, but the console and build steps in [§6](#6-google-sign-in) are still to do.

## 1. What the design shows

One 390×844 dark, RTL artboard with Cairo font. From top to bottom:

| # | Block | Content | Key values |
|---|---|---|---|
| 1 | **Brand header** | 80×80 logo tile (indigo, radius 24, 8px indigo glow ring) holding a white "cap" arc and an amber star. Then the title **«نوابغ»** and the tagline **«تنافس، تعلّم، وتصدّر القمة»** | tile `#4F46E5`, ring `rgba(99,102,241,0.15)`; title 32/800; tagline 16/700 `#F59E0B` |
| 2 | **Feature card** (centered vertically in the remaining space) | 3 icon chips (document indigo, bolt amber, bar chart green), title **«تدرّب على اختبارات كل مادة»**, body **«بنوك أسئلة مع حلول مفصّلة خطوة بخطوة، ونتيجتك فور انتهائك.»** | card `#1E293B`, border `#334155`, radius 20, padding 20; chips 48×48 r14; title 19/700; body 14 `#94A3B8` lh 1.7 |
| 3 | **Pager dots** | 3 dots, the first active (24×8 pill) | active `#6366F1`, idle `#334155` |
| 4 | **Primary CTA** | **«المتابعة باستخدام Google»** with a white circle "G" | h54, r16, `#4F46E5`, 16/700 |
| 5 | **Divider** | «أو» between two lines | 13 `#94A3B8`, lines `#334155` |
| 6 | **Secondary CTA** | Mail icon + **«إنشاء حساب بالبريد الإلكتروني»** → sign-up | h54, r16, `#1E293B`, 1.5px border `#334155`, 16/600 |
| 7 | **Sign-in line** | «لديك حساب بالفعل؟» + link **«تسجيل الدخول»** → sign-in | 15 `#94A3B8`; link 700 `#A5B4FC`, min height 44 |
| 8 | **Guest link** | **«التصفح كزائر»** (underlined) → home | 14/600 `#94A3B8`, min height 44 |
| 9 | **Legal footer** | «بالمتابعة أنت توافق على **شروط الاستخدام** و**سياسة الخصوصية**» | 12 `#94A3B8` lh 1.8, links `#A5B4FC` |

Outer layout: padding `48 24 24`, gap 22 between the blocks, background `#0F172A`, text `#F8FAFC`.

The mockup links point at `Home.dc.html`, `Signup.dc.html` and `Login.dc.html`. The `1 ·` prefix suggests those screens will come as later designs. This plan only restyles the welcome screen. Sign-in and sign-up keep their current look until their designs arrive.

## 2. Decisions to confirm

| # | Question | Proposal |
|---|---|---|
| 1 | **App name.** The design calls the app **«نوابغ»**. Today it is «امتحانات الأزهر» (`app.json`). | Use «نوابغ» on this screen only. Renaming the app (`app.json` `name`, icon, splash) is a separate change. |
| 2 | **Google sign-in** is the primary button, but the auth plan listed it as *out of scope*. It needs a native library, so the app **stops working in Expo Go** and needs a development build (§6). | **Phase 2.** Ship the screen first with the Google button wired up only on web (`signInWithPopup` needs no native code). On iOS and Android, hide the button and the «أو» divider until phase 2. *Alternative:* do it all now and switch to dev builds. |
| 3 | **Who sees the welcome screen?** | Signed-out users who haven't chosen «التصفح كزائر». The guest choice is remembered (AsyncStorage) so guests aren't asked on every launch. Signed-in users never see it. Signing out shows it again. |
| 4 | **Pager dots** imply 3 slides, but the design only has slide 1. | Build a swipeable carousel with 3 slides. Slides 2 and 3 need copy (proposal in §5.3). *Alternative:* one static card, no dots. |
| 5 | **Theme.** The design is dark. The rest of the app is light (`Colors`, `userInterfaceStyle: "light"`). | Add a separate `Brand` palette for the new design and use it only on this screen. Move other screens over as their designs arrive. Don't switch the whole app to dark yet. |
| 6 | **Terms / Privacy** links | We have no pages for them. Hide the footer until URLs exist, or link to placeholder pages opened with `expo-web-browser` (already installed). |
| 7 | **Font: Cairo** | Load Cairo 400/600/700/800 with `useFonts` from `@expo-google-fonts/cairo` (works in Expo Go and on web). Use Cairo on this screen first. Other screens can adopt it later. |
| 8 | **Logo tile accent** (the design has a prop for it: `#6366F1 / #4F46E5 / #F59E0B / #10B981`) | Use the default `#4F46E5`. |

## 3. Routing changes

Today `index` is both the landing page and the signed-in home. Split it:

```
src/app/
  _layout.tsx           guard: welcome when signed out and not a guest
  welcome.tsx           NEW — this design
  index.tsx             home (existing screen, minus the sign-in/sign-up buttons)
  (auth)/sign-in.tsx    unchanged
  (auth)/sign-up.tsx    unchanged
  ...
```

In `_layout.tsx`, use `Stack.Protected` the same way the auth screens already do:

```tsx
const showWelcome = !initializing && !user && !isGuest;

<Stack.Protected guard={showWelcome}>
  <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
</Stack.Protected>
<Stack.Protected guard={!showWelcome}>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  ...grades
</Stack.Protected>
```

When `index` is blocked by its guard, Expo Router falls back to the first allowed screen, so `welcome` is listed first. Check this against the SDK 57 `Stack.Protected` docs when implementing.

- **Flash on launch:** `initializing` stays true until Firebase restores the session. Keep the native splash (already held by `SplashScreen.preventAutoHideAsync()`) until both `initializing` and the guest flag are known, so users don't see welcome → home flicker. `AnimatedSplashOverlay` keeps working on top.
- **sign-in / sign-up from welcome** push on top of `welcome`. On success, the existing `!user` guard removes them, the welcome guard turns false, and the router lands on `index`. No extra code needed.
- **Google users without a profile** (no grade/section yet): the existing `complete-profile` guard already handles this. After a Google sign-in, the user goes to «أكمل بياناتك».
- **Deep links** to `/grades/...` while signed out: decide whether guests should be gated. *Proposal:* keep the grade screens in **neither** guard group so links still work for everyone, because exams are public (auth plan decision 1). Only `index` sits behind `!showWelcome`.

### Guest flag — `src/hooks/use-guest.ts` (or inside `AuthProvider`)

| | |
|---|---|
| Storage | AsyncStorage key `welcome.guest = "1"` (already a dependency) |
| Set | «التصفح كزائر» pressed |
| Cleared | on `signOut()`, so the next signed-out launch shows welcome again |
| Loading | `isGuest` is `undefined` until read. Treat that as "initializing". |

Putting it into `AuthProvider` keeps one `initializing` flag for the layout. Recommended.

## 4. Theme and font

### 4.1 `src/constants/colors.ts`: add a `Brand` palette next to `Colors`

```ts
export const Brand = {
  background: '#0F172A',   // slate-900
  surface: '#1E293B',      // slate-800 (card, secondary button)
  border: '#334155',       // slate-700 (card border, dividers, idle dots)
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#4F46E5',      // indigo-600 (CTA, logo tile)
  primaryBright: '#6366F1',// indigo-500 (active dot)
  link: '#A5B4FC',         // indigo-300
  accent: '#F59E0B',       // amber (tagline, star)
  success: '#34D399',
  google: '#4285F4',
};
```

Tinted chip backgrounds (`rgba(99,102,241,0.18)` etc.) stay inline in the component that uses them.

### 4.2 Cairo font

- `npx expo install expo-font @expo-google-fonts/cairo`
- In `_layout.tsx`: `useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold })`. Hide the splash only after fonts **and** auth are ready (see §3).
- Add `src/constants/fonts.ts` mapping weights to families (`Fonts.bold = 'Cairo_700Bold'` …). On Android, `fontWeight` doesn't pick a face of a custom family, so set `fontFamily` per weight and don't use `fontWeight` together with Cairo.
- Later we can move to the `expo-font` config plugin to embed the fonts (no async load), once we're on dev builds anyway.

### 4.3 Status bar / system UI

The screen is dark on a light app, so render `<StatusBar style="light" />` (`expo-status-bar`, already installed) inside `welcome.tsx`.

## 5. Components

All live outside `src/app/` (per AGENTS.md).

| File | What | Notes |
|---|---|---|
| `src/app/welcome.tsx` | The screen | `SafeAreaView` + `ScrollView` (`contentContainerStyle={{ flexGrow: 1 }}`) so small phones scroll instead of clipping. `maxWidth: 480`, centered, for tablets and web. |
| `src/components/brand-logo.tsx` | Logo tile + SVG | Ring = an outer view with `padding: 8` and the 15% indigo background, not a `box-shadow` (RN shadows can't make spread rings). |
| `src/components/feature-carousel.tsx` | Cards + dots | See §5.3 |
| `src/components/feature-card.tsx` | One card | Props: `icons`, `title`, `body` |
| `src/components/auth-button.tsx` | 54h, r16 buttons | Variants `primary` (filled indigo) and `outline` (surface + border). Supports `icon`, `loading`, `disabled`. Separate from `PrimaryButton` because the shapes/colors differ and the light screens still use the old one. |
| `src/components/or-divider.tsx` | «أو» line | Tiny, could stay inline in the screen |
| `src/components/icons.tsx` | SVG icons (doc, bolt, chart, mail, logo) | Copy the paths from the mockup as they are |

### 5.1 Icons: `react-native-svg`

The mockup icons are plain SVG paths. Port them 1:1 with `react-native-svg` (`npx expo install react-native-svg`; it's in Expo Go). The "G" is a styled text circle in the design. Keep it as text, or swap in the official multicolor Google "G" SVG (Google's branding guidelines prefer the official mark).

### 5.2 RTL

The app forces RTL (`expo-localization` plugin + `+html.tsx`), so `flexDirection: 'row'` already runs right-to-left like the mockup's `direction: rtl`. Check two things:
- The active pager dot is the **first** one in reading order, so it appears on the **right**.
- Carousel swipe direction: in RTL the first slide is on the right, so the next slide comes in from the left. Check `FlatList` `horizontal` + `pagingEnabled` under forced RTL on Android, which has known quirks there. If it misbehaves, use `inverted` or compute the index from `I18nManager.isRTL`.

### 5.3 Carousel

- `FlatList` horizontal, `pagingEnabled`, each item the width of the container (measured with `onLayout`, not `Dimensions`, so web/tablet `maxWidth` works).
- Dots follow `onMomentumScrollEnd` (or a Reanimated scroll handler to animate the 8→24 pill width). Dots stay `aria-hidden`. Each slide gets `accessibilityLabel` = title + body.
- Optional autoplay every ~5s, paused while the user is touching it. *Proposal: no autoplay* (it's simpler and more accessible).
- Proposed copy for the missing slides (to confirm):
  1. 📄⚡📊 «تدرّب على اختبارات كل مادة» — «بنوك أسئلة مع حلول مفصّلة خطوة بخطوة، ونتيجتك فور انتهائك.» *(from design)*
  2. ⚡ «تنافس مع زملائك» — «...» *(needs copy)*
  3. 📊 «تابع تقدّمك» — «...» *(needs copy)*

  Note: slides 2–3 suggest features (competition, progress) that the app doesn't have yet. Either write copy for what exists today, or show one static card until those features ship.

## 6. Google sign-in

**Code: done.** Web uses `signInWithPopup` (`src/lib/google-sign-in.web.ts`). iOS/Android use `@react-native-google-signin/google-signin` 16 (free "original" API) in `src/lib/google-sign-in.ts`: `configure({ webClientId })` → `hasPlayServices()` → `signIn()` → `GoogleAuthProvider.credential(idToken)` → `signInWithCredential(auth, …)`.

- The library is imported lazily, so **Expo Go still runs**. The button is always visible; when the `RNGoogleSignin` native module is missing (Expo Go), tapping it shows «تسجيل الدخول باستخدام Google غير متاح في هذه النسخة…». (`Constants.executionEnvironment` can't tell Expo Go from a dev build: both report `storeClient`.)
- `signOut()` also calls `GoogleSignin.signOut()`, so the next sign-in shows the account picker again.
- Cancelling the picker shows no error. A missing or outdated Play Services shows an Arabic message.
- `app.json`: plugin added with no options (the Firebase setup reads the files below), `ios.bundleIdentifier = com.azharexams.app` (same as the Android package), `ios.googleServicesFile` and `android.googleServicesFile`.

**Still to do (needs your accounts):**

| # | Where | Step |
|---|---|---|
| 1 | Firebase console → Authentication → Sign-in method | Enable **Google**. Copy the **Web client ID** it shows under "Web SDK configuration". |
| 2 | `.env` | Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>`. Without it Google returns no idToken. |
| 3 | Firebase console → Project settings | Add an **iOS app** (`com.azharexams.app`) and an **Android app** (`com.azharexams.app`). Download `GoogleService-Info.plist` and `google-services.json` to the repo root. They hold no secrets, so committing them is fine (Expo guide). Prebuild fails until they exist. |
| 4 | EAS | `npx eas-cli@latest credentials -p android`: copy the keystore **SHA-1** into the Firebase Android app. After the first Play upload, also add the Play **app-signing** SHA-1. Re-download `google-services.json` after adding fingerprints. |
| 5 | Build | `npx eas-cli@latest build --profile development --platform android` (and `ios`). Install it and run `npx expo start` (it opens in the dev build instead of Expo Go). |
| 6 | Firebase → Authentication → Settings | Authorized domains: make sure `localhost` (web dev) and the hosted web domain are listed. |

## 7. Changes to existing screens

| File | Change |
|---|---|
| `src/app/index.tsx` | Remove the signed-out «تسجيل الدخول» button + hint (welcome owns that now). For guests, show a small «تسجيل الدخول / إنشاء حساب» link that clears the guest flag → back to welcome. Keep greeting, verify banner and sign-out. |
| `src/app/_layout.tsx` | New guard groups (§3), font loading, splash hide after auth + guest flag + fonts are ready. |
| `src/hooks/use-auth.tsx` | Add `isGuest`, `continueAsGuest()`, `leaveGuest()`. Fold the guest load into `initializing`. |
| `src/lib/auth-actions.ts` | `signOut()` also clears the guest flag. (Phase 2: add `signInWithGoogle` re-export.) |
| `src/app/(auth)/sign-up.tsx`, `sign-in.tsx` | No visual change now. Their footer links use `replace`, which still works when pushed from welcome. |

## 8. Accessibility & mobile details

- All pressables ≥ 44pt (design already sets `min-height: 44`). Use `hitSlop` on the inline «تسجيل الدخول» link.
- `accessibilityRole="button"` on the CTAs, `"link"` on sign-in/guest/legal links. Decorative SVGs get `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`.
- Contrast: `#94A3B8` on `#0F172A` ≈ 7:1 ✓. `#A5B4FC` links ✓. White on `#4F46E5` ≈ 6.3:1 ✓.
- Respect font scaling: no fixed heights on text containers. Buttons use `minHeight: 54`, not `height`.
- Pressed state: opacity 0.85 (same as `PrimaryButton`). Loading spinner on the Google button while signing in.
- Small screens (e.g. 320×568): the whole screen scrolls. The carousel area uses `flex: 1` + `justifyContent: 'center'` only when there's room.

## 9. Implementation order

1. Dependencies: `npx expo install react-native-svg expo-font @expo-google-fonts/cairo`.
2. `Brand` palette + `fonts.ts`. Font loading in `_layout.tsx`.
3. Guest flag in `AuthProvider` + routing guards + splash timing (§3). Test the cold start for signed-out, guest and signed-in users.
4. Components (§5) + `welcome.tsx` with the static card. Match the mockup side by side (serve the HTML folder with `python3 -m http.server` and compare at 390×844).
5. Carousel + dots (if decision 4 = carousel).
6. Update `index.tsx` (§7).
7. Google: web popup now. Native in phase 2 (§6).
8. `npx expo lint` + `npx tsc --noEmit`. Manual test on iOS, Android (RTL carousel!) and web.

## 10. Test checklist

- [ ] Fresh install, signed out → welcome, no flicker of home
- [ ] «التصفح كزائر» → home. Kill + reopen → home (guest remembered)
- [ ] Guest taps «تسجيل الدخول» on home → welcome / sign-in
- [ ] «إنشاء حساب بالبريد الإلكتروني» → sign-up → success → home with own grade
- [ ] «تسجيل الدخول» → sign-in → success → home
- [ ] Sign out → welcome
- [ ] Signed-in cold start → home directly
- [ ] Google (web): new account → complete-profile → home. Existing account → home. Popup closed → no error
- [ ] Carousel swipes the right way in RTL on Android and iOS. Dots stay in sync
- [ ] Small phone + large font size: everything reachable by scrolling
- [ ] Deep link to `/grades/...` while signed out still opens the exam

## 11. Sign-in screen (design `1a · Email Login`)

**Done.** `src/app/(auth)/sign-in.tsx` follows [`docs/1a · Email Login-html/Login.dc.html`](<1a · Email Login-html/Login.dc.html>): own back button (no native header), «أهلاً بعودتك», email + password fields with icons and a focus ring, «تذكّرني», «نسيت كلمة المرور؟», «تسجيل الدخول», «أو», Google (outline), «ليس لديك حساب؟ إنشاء حساب».

| Piece | Where |
|---|---|
| Dark input with icon, focus ring, show/hide password | `src/components/auth-text-field.tsx` |
| Checkbox | `src/components/checkbox.tsx` |
| Google badge, lock/eye/back/check icons | `src/components/icons.tsx` |
| Google button logic (shared with welcome) | `src/hooks/use-google-sign-in.ts` |
| Light status bar on dark screens (shared with welcome) | `src/hooks/use-light-status-bar.ts` |

- **«تذكّرني»** (checked by default): when unchecked, `signIn` stores `auth.forgetSession`. On the next launch `AuthProvider` calls `forgetSessionIfAsked()` *before* subscribing to auth state, so the user starts signed out without home flashing. `signOut()` clears the flag. This works the same on all platforms (Firebase's own persistence switch is web-only).
- **Back** with no history (opened by URL) replaces with `/welcome` (or `/` for guests). `router.replace` to a screen whose guard is false is silently ignored.
- Sign-up and forgot-password keep the old light look until their designs arrive.
