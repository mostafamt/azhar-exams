# خطة الصورة الشخصية: Profile Photo

This plan lets a signed-in student **add, change or remove a profile photo** from the «حسابي» tab. The photo then appears **everywhere we show an avatar**: the profile card, the Home header, the live match rows and the leaderboard.

| Screen | Design | Route |
|---|---|---|
| **6 · Profile**: identity card with a tappable avatar, the photo sheet and the crop screen | [`design/6 · Profile-html/Profile.dc.html`](<design/6 · Profile-html/Profile.dc.html>) | `src/app/(tabs)/profile.tsx` and the new `src/app/edit-photo.tsx` |

Status: **Phases 1–4 code done** (2026-11-05). Phase 3: picker, crop screen, upload, remove and toasts. Phase 1: rules and rules tests, `src/lib/cloudinary.ts`, `src/data/avatars.ts`, `src/hooks/use-avatar.ts`. Phase 2: `src/components/avatar.tsx`, the restyled profile card and the Home header. Still to do for Phase 1: create the Cloudinary preset, deploy the rules and try a real upload (§6). The image itself is stored on **Cloudinary**, and Firestore keeps only its URL.

The work is split into **four phases**. Each one can be built, tested and committed on its own (see [§6](#6-implementation-phases)):

1. **Backend & data layer:** Cloudinary preset, rules, `src/lib/cloudinary.ts`, `src/data/avatars.ts`
2. **`<Avatar>` component** used on the profile screen and in the Home header
3. **Photo sheet and crop screen:** pick, crop, upload, save, remove
4. **Avatars in matches and the leaderboard**, plus cleanup of orphaned images

Stack:

- **Cloudinary**, through the same account the dashboard uses for exam page images (`../azhar-exams-dashboard/src/lib/cloudinary.js`). It stores the image file.
- **Firebase JS SDK v13** (`firebase/firestore`). It stores the image's URL.
- **`expo-image-picker`** to take or choose a photo, and **`expo-image-manipulator`** to crop and shrink it.
- **`expo-image`** (already installed) to show it.

Firestore rules and the Cloudinary cleanup script live in **`../azhar-exams-dashboard`**, so those changes are made there.

---

## 1. What the design shows

### 1.1 Profile card (signed in)

- Title **«الملف الشخصي»** (22px, 800). The current screen says «حسابي». Use the design's title. The tab label stays «حسابي».
- Card: `#1E293B`, 1px `#334155`, radius 20, padding 20, row with gap 14.
  - **Avatar button** 76×76 (`aria-label` «تغيير الصورة الشخصية»):
    - circle with a 3px `#6366F1` border, background `#312E81`
    - shows the photo (`object-fit: cover`) or the **name's first letter** (28px, 800, `#C7D2FE`)
    - **camera badge** 30×30, `#4F46E5`, 3px `#1E293B` border, at the bottom-left (`left:-2; bottom:-2`), with a 14px camera icon
  - Name (18px, 800) and email (13px, `#94A3B8`, `dir="ltr"`).
  - **Edit button** 44×44, radius 12, border `#334155`, background `#0F172A`, pencil icon. It opens `/edit-profile`.
- The stats grid below the card (اختبار مكتمل / نسبة النجاح / الترتيب العام), the **Lv. 4** pill and the «الإعدادات» list (dark-mode switch, notifications) are **out of scope** (§2 #11).

### 1.2 Photo sheet («الصورة الشخصية»)

A bottom sheet over a `rgba(2,6,23,0.72)` backdrop. Tapping the backdrop closes it.

- Sheet: `#111A2E`, top border `#334155`, radius `24 24 0 0`, padding `10 20 28`, a 40×5 grab handle in `#334155`.
- Title **«الصورة الشخصية»** (19px, 800) and the hint **«ستظهر صورتك في الدوريات والمباريات · JPG أو PNG حتى 5 ميجابايت»** (13px, `#94A3B8`).
- Three rows (min-height 58, radius 14, `#1E293B`, border `#334155`, 38×38 icon tile):
  - **«التقاط صورة»**: camera icon, indigo tile `rgba(99,102,241,0.18)` / `#A5B4FC`
  - **«اختيار من المعرض»**: image icon, green tile `rgba(16,185,129,0.16)` / `#34D399`
  - **«إزالة الصورة»**: trash icon, red tile `rgba(239,68,68,0.14)`, text `#F87171`. **Only shown when a photo exists.**
- **«إلغاء»**: a text button, 50px high, `#94A3B8`.

### 1.3 Crop screen («تعديل الصورة»)

A full-screen view on `#020617`, padding `16 20 28`, gap 20.

- Top bar: **«إلغاء»** (text button), title **«تعديل الصورة»** (17px, 800), **«حفظ»** (h40, radius 12, `#4F46E5`, 800).
- A **300×300 circle**: 3px `#6366F1` ring, with everything outside the circle dimmed by `rgba(2,6,23,0.6)`. The image fills the circle (`cover`) and is scaled by the zoom.
- **«تكبير»** label with the percentage (`100%`–`300%`, `dir="ltr"`), a **slider from 1 to 3** with step 0.05 and accent `#6366F1`, and the hint **«ستظهر الصورة داخل الدائرة فقط»**.

The mock only zooms around the centre. We also let the student **drag the image** to choose what's inside the circle (§2 #6).

### 1.4 Toasts

A bar at the top: `#064E3B`, border `#10B981`, text `#D1FAE5`, 14px bold, with a ✓ icon. It hides after **2.5 s**.

- «تم تحديث صورتك الشخصية» after saving
- «تمت إزالة الصورة» after removing
- «الصورة أكبر من 5 ميجابايت» when the picked file is too big. The mock reuses the green toast for this. **We use a red variant** (`#7F1D1D` / `#EF4444` / `#FEE2E2`) for errors.

### 1.5 Guest

Guests keep today's card («أنت تتصفح كزائر» + sign-in button). They have no avatar button and no sheet.

---

## 2. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | **Where is the photo stored?** | **The image file goes to Cloudinary, and its URL goes to Firestore `avatars/{uid}`.** We reuse the dashboard's Cloudinary account (cloud **`dapspj9n8`**). The app uploads **straight from the device through an unsigned upload preset**, the same way the dashboard uploads exam pages. **No API secret ships in the app.** |
| 2 | **Which upload preset?** | **A new unsigned preset, `azhar-avatars`**, not the dashboard's `azhar-exams` preset. The preset name is visible in the app bundle, so it should allow as little as possible: **asset folder `azhar-avatars`**, allowed formats **jpg only**, max file size **1 MB**, overwrite off, unique filename off, **Return delete token on**. It also keeps avatars out of `azhar-exams/` (see the next row). |
| 3 | **Why not under `azhar-exams/`?** | `scripts/cleanup-cloudinary.mjs` in the dashboard **deletes every image under `azhar-exams/` that no exam uses**. Avatars stored there would be wiped the next time it runs. A separate root folder (`azhar-avatars/`) keeps them safe. The script gets its own avatars pass later (Phase 4). |
| 4 | **File name on Cloudinary** | `public_id = {uid}/{random id}`, so the full path is `azhar-avatars/{uid}/{random id}`. Unsigned presets can't overwrite, so **each new photo gets a new id**. The random part also busts caches: a new photo means a new URL, so `expo-image` and the CDN never show a stale one. |
| 5 | **What's stored in Firestore** | `avatars/{uid} = { url, publicId, updatedAt }`, about 200 bytes. **It's not stored on `users/{uid}`**, because that document is readable only by its owner and admins, and opponents and the leaderboard must see the photo. The rules only accept URLs that start with `https://res.cloudinary.com/dapspj9n8/image/upload/` and contain `/azhar-avatars/{uid}/`, so a student can't point their avatar at an arbitrary site or at someone else's image (§3.2). |
| 6 | **Cropping** | **Our own crop screen**, as in the design, the same on every platform. The picker is opened with `allowsEditing: false`. The native crop UI is square on iOS, oval only on Android and missing on web, and it has no zoom slider. The screen supports **pan** (drag), **pinch** and the **zoom slider**. On save we compute the crop rectangle (§5.2) and run `crop → resize 512 → saveAsync({ format: JPEG, compress: 0.8, base64: true })`, which gives about 40–80 KB. |
| 7 | **Upload format** | Send the base64 string as a **data URI in the `file` field** (`data:image/jpeg;base64,…`). Cloudinary accepts that directly. It works the same on iOS, Android and web, with no `Blob` or `{ uri, name, type }` differences between platforms. Use `fetch` with a `FormData` body. The file is small, so there's no progress bar, only a spinner on «حفظ». |
| 8 | **Display size** | Every avatar loads a **delivery transformation**: `c_fill,g_face,w_{px},h_{px},f_auto,q_auto`, where `px = size × PixelRatio.get()`, rounded up to 64/128/256/512. The function is `avatarUrl(url, size)` in `src/lib/cloudinary.ts`, mirroring the dashboard's `transformedUrl`. A 36 px leaderboard row then downloads a ~3 KB WebP or AVIF, not the 512 px original. |
| 9 | **Removing or replacing a photo** | **Removing** deletes `avatars/{uid}` in Firestore. **Replacing** overwrites it with the new URL. **Deleting the old file on Cloudinary needs the API secret, so the app can't do it.** The old file stays until the cleanup script removes it (Phase 4). **Rollback:** if the Firestore write fails after a successful upload, call `delete_by_token` with the token the preset returns. It's valid for about 10 minutes, the call is best effort, and the token is **never stored**. |
| 10 | **Size limit «حتى 5 ميجابايت»** | Checked on the **picked file** (`asset.fileSize`, or `asset.file.size` on web) before cropping, as in the design. The uploaded file is always the small 512 px JPEG, so the preset's 1 MB cap is never reached in normal use. PNG input is fine. We always upload JPEG. |
| 11 | **Stats grid, Lv. pill, dark-mode switch, notifications** | **Out of scope.** They need an activity/XP feature and a theme system that don't exist yet. This plan only restyles the identity card and adds the photo. The «تسجيل الخروج» button stays as it is today. |
| 12 | **Camera on web** | `launchCameraAsync` opens a file input on web. On phones it offers the camera, and on desktop it opens the file chooser. That's acceptable, so we keep both rows on web. |
| 13 | **Permissions** | Ask **just before** launching (`requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync`). If permission is denied and `canAskAgain` is false, show a `ConfirmModal`: «اسمح للتطبيق بالوصول إلى الكاميرا من الإعدادات» with «فتح الإعدادات» (`Linking.openSettings()`) and «إلغاء». Usage strings in Arabic go in the `expo-image-picker` config plugin in `app.json`. `microphonePermission: false` because we never record video. |
| 14 | **Google sign-in photo** | **Not used automatically.** `user.photoURL` from Google is only known on this device and can't pass the URL rule. A later option is a «استخدم صورة Google» row that downloads it and runs it through the same crop → upload flow. |
| 15 | **Abuse of the unsigned preset** | Anyone who pulls the cloud name and preset name out of the app can upload JPEGs into `azhar-avatars/`. This is accepted, as it is for the dashboard. The preset limits format, size and folder. Such uploads are never shown, because Firestore only accepts URLs under the uploader's own `{uid}` folder, written by that signed-in user. The cleanup script deletes them. Moderation (reporting a photo, admin review) is left for later. Admins can delete `avatars/{uid}`. |
| 16 | **Caching / reads** | `useAvatar(uid)` uses **`getDoc` once per uid per session**, with an in-memory `Map` cache, instead of `onSnapshot`. My own avatar is the exception: it uses `onSnapshot`, so a change shows up at once on the profile and Home screens. `expo-image` caches the image on disk (`cachePolicy="memory-disk"`). |
| 17 | **Toast component** | There's no toast today. Add `src/components/toast.tsx` (`success` / `error` variants, auto-hide after 2.5 s, `accessibilityLiveRegion="polite"` and `role="status"`). Matches and other screens can reuse it later. |

---

## 3. Data model & backend

### 3.1 Cloudinary

**Credentials** come from the dashboard's `.env`: `VITE_CLOUDINARY_CLOUD_NAME=dapspj9n8`. These identify the account. They aren't secrets.

The app reads them from `.env` here, next to the Firebase values:

```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dapspj9n8
EXPO_PUBLIC_CLOUDINARY_AVATAR_PRESET=azhar-avatars
```

Never copy `CLOUDINARY_API_KEY` or `CLOUDINARY_API_SECRET` into this repo. Anything named `EXPO_PUBLIC_*` is bundled into the app. Those two values stay in the dashboard's `.env` and are used only by its cleanup script.

**Create the preset once** in the Cloudinary console: *Settings → Upload → Upload presets → Add upload preset*.

| Setting | Value |
|---|---|
| Name | `azhar-avatars` |
| Signing mode | **Unsigned** |
| Asset folder | `azhar-avatars` |
| Overwrite / Use filename / Unique filename | off / off / off (the app sends `{uid}/{random id}`) |
| Allowed formats | `jpg` |
| Max file size | 1 MB |
| Max image width/height | 1024 (optional safety net) |
| Return delete token | **on** (for rollback, §2 #9) |

**Upload request:**

```
POST https://api.cloudinary.com/v1_1/dapspj9n8/image/upload
form: file=data:image/jpeg;base64,…  upload_preset=azhar-avatars  public_id={uid}/{randomId}
→ { public_id: "azhar-avatars/{uid}/{randomId}", secure_url, width, height, bytes, delete_token }
```

With an *asset folder* set on the preset, the returned `public_id` may or may not include the folder, depending on the account's folder mode. Check this with the first upload. The rule in §3.2 checks `secure_url`, which always contains the full path.

### 3.2 `avatars/{uid}` and its rules (in `../azhar-exams-dashboard/firestore.rules`)

```ts
// src/data/avatars.ts
export type AvatarDoc = {
  /** Cloudinary secure_url of the 512 px original; shown through avatarUrl(url, size). */
  url: string;
  /** Cloudinary public_id, so the cleanup script can match files to users. */
  publicId: string;
  updatedAt: Timestamp;
};
```

```
// Profile photos (azhar-exams app: docs/profile-photo-plan.md). The image lives on Cloudinary
// (unsigned preset `azhar-avatars`); this holds its URL. Public to signed-in users so opponents
// and the leaderboard can show it. Only URLs inside the owner's own Cloudinary folder.
function validAvatar(uid) {
  let d = request.resource.data;
  return d.keys().hasOnly(['url', 'publicId', 'updatedAt'])
    && d.url is string && d.url.size() <= 300
    && d.url.matches('^https://res[.]cloudinary[.]com/dapspj9n8/image/upload/(v[0-9]+/)?azhar-avatars/' + uid + '/[A-Za-z0-9_-]+[.]jpg$')
    && d.publicId is string && d.publicId.size() <= 200
    && d.updatedAt == request.time;
}

match /avatars/{uid} {
  allow read: if signedIn();
  allow create, update: if isOwner(uid) && validAvatar(uid);
  allow delete: if isOwner(uid) || isAdmin();
}
```

Rules tests (`tests/`, run with `npm run test:rules`):

- The owner can create, update and delete their own avatar.
- Another student can **read** it, but can't write or delete it.
- A signed-out user can't read it.
- These are rejected:
  - a URL on another host
  - another cloud name
  - another folder (`azhar-exams/…`)
  - **another uid's folder**
  - a non-`.jpg` URL
  - an extra key
  - a client-set `updatedAt`
- An admin can delete it.

No indexes are needed.

### 3.3 Client code

```ts
// src/lib/cloudinary.ts — mirrors ../azhar-exams-dashboard/src/lib/cloudinary.js
export async function uploadAvatar(base64Jpeg: string, uid: string):
  Promise<{ secureUrl: string; publicId: string; deleteToken?: string }>;
export async function deleteByToken(token?: string): Promise<void>;   // best effort, never throws
export function avatarUrl(url: string, size: number): string;          // c_fill,g_face,w_,h_,f_auto,q_auto

// src/data/avatars.ts
export async function setAvatar(base64Jpeg: string): Promise<void>;
//   upload → setDoc(avatars/{me}, { url, publicId, updatedAt: serverTimestamp() })
//   → on setDoc failure: deleteByToken(token) and rethrow
export async function removeAvatar(): Promise<void>;                   // deleteDoc avatars/{me}
export function loadAvatarUrl(uid: string): Promise<string | null>;   // getDoc once per uid, cached

// src/hooks/use-avatar.ts
export function useAvatar(uid: string | null | undefined): string | null;  // url or null (cached)
export function useMyAvatar(uid): { url: string | null; loading: boolean }; // onSnapshot on my doc
```

Errors from `uploadAvatar` throw with `code: 'cloudinary'`, as the dashboard does. `authErrorMessage` (or a small `photoErrorMessage`) turns them into the Arabic messages in §5.4.

---

## 4. Components and files

| File | What |
|---|---|
| `.env` / `.env.example` | **Add** `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_AVATAR_PRESET` (§3.1). |
| `src/lib/cloudinary.ts` | **New.** Upload, `delete_by_token` and the `avatarUrl` transformation (§3.3). |
| `src/data/avatars.ts` | **New.** Firestore reads and writes plus the cache (§3.3). |
| `src/components/avatar.tsx` | **New.** `<Avatar uid? url? name size ring? badge? />`: a circle that shows `expo-image` (`avatarUrl(url, size)`, `contentFit="cover"`, `cachePolicy="memory-disk"`, short `transition`) when there's a photo, otherwise the initial, otherwise `UserIcon`. If the image fails to load, it falls back to the initial. Colours are props, so matches can keep the amber opponent style. |
| `src/components/photo-sheet.tsx` | **New.** The bottom sheet (§1.2): `Modal` with `transparent`, the backdrop and a slide-up animation. It uses the same `rtl` workaround as `confirm-modal.tsx`. |
| `src/components/crop-view.tsx` | **New.** The 300 px circle with pan and pinch and the dimmed mask (§5.1). |
| `src/components/zoom-slider.tsx` | **New.** A custom slider built with `react-native-gesture-handler` and `react-native-reanimated`. It has a track, fill and thumb, `accessibilityRole="adjustable"`, and increment/decrement actions. `@expo/ui`'s slider is native-only, so it wouldn't run on web. |
| `src/components/toast.tsx` | **New** (§2 #17). |
| `src/lib/pick-photo.ts` | **New.** `pickPhoto('camera' \| 'library')`: permission request, launch, the 5 MB check. Returns `{ uri, width, height }`, or `null` when cancelled, or throws a `PhotoError` with an Arabic message. |
| `src/lib/crop-photo.ts` | **New.** `cropToAvatar(src, { zoom, offsetX, offsetY })`: `ImageManipulator.manipulate(uri).crop(...).resize({width:512,height:512})`, then `renderAsync()`, then `saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true })`. Returns the base64 string. |
| `src/app/edit-photo.tsx` | **New route.** The crop screen (§1.3). It takes `uri`, `width` and `height` as params, is presented as a `fullScreenModal` with the header hidden, and calls `setAvatar` on «حفظ» before `router.back()` with a result flag for the toast. |
| `src/app/_layout.tsx` | Register `edit-photo` under the signed-in group: `options={{ ...darkScreenOptions, presentation: 'fullScreenModal', headerShown: false }}`. |
| `src/app/(tabs)/profile.tsx` | Restyle the identity card (§1.1). The avatar button opens the sheet, the pencil opens `/edit-profile`, and the screen shows the toast. The grade/section card stays below. |
| `src/components/home/home-header.tsx` | Use `<Avatar>` with my photo. |
| `src/components/match/player-row.tsx`, `src/app/match/leaderboard.tsx`, `match-result.tsx`, `search-state.tsx`, `recent-match-row.tsx` | Use `<Avatar uid={…}>` (Phase 4). The `uid` is already the key of `players`, and the leaderboard rows come from `ratings/{uid}`. |
| `app.json` | Add the `expo-image-picker` plugin (§5.3). |
| `../azhar-exams-dashboard/firestore.rules`, `tests/` | The `avatars/{uid}` rules and tests (§3.2). |
| `../azhar-exams-dashboard/scripts/cleanup-cloudinary.mjs` | An avatars pass (Phase 4). |

Passing the picked image to the crop route: `router.push({ pathname: '/edit-photo', params: { uri, width, height } })`. Local `file://` URIs and web `blob:` URIs are short strings, so they fit in params. On web, a `blob:` URI stays valid for the life of the page.

---

## 5. Details

### 5.1 Crop view

- The image is laid out at the **cover size** of the 300 px circle: `base = 300 / min(w, h)`, so it's displayed at `w·base × h·base`.
- Shared values `zoom` (1–3), `tx` and `ty`. The transform is `[{ translateX: tx }, { translateY: ty }, { scale: zoom }]`.
- **Clamp** after every gesture and zoom change, so the image always covers the circle: `|tx| ≤ (w·base·zoom − 300) / 2`, and the same for `ty` with `h`.
- Gestures: `Gesture.Simultaneous(Gesture.Pan(), Gesture.Pinch())`. The slider and pinch write the same `zoom` value, so the percentage label follows both.
- The dimmed mask is a `react-native-svg` rect with a circular hole (`fillRule="evenodd"`) plus the 3px `#6366F1` ring. This works the same on web, where the design's huge `box-shadow` trick doesn't translate.
- **RTL:** gestures report physical x, and the root forces RTL. Use **physical** translateX values (not `start`/`end`) and test that dragging right moves the image right.

### 5.2 Crop rectangle (in source pixels)

```
scale   = base * zoom                  // displayed px per source px
side    = 300 / scale                  // the square's side, in source px
originX = w / 2 - tx / scale - side / 2
originY = h / 2 - ty / scale - side / 2
```

Round the values and clamp them to `[0, w − side]` / `[0, h − side]`. Use the **picker's `width`/`height`** (already EXIF-rotated) and check this with a portrait photo from an iPhone and from an Android device.

### 5.3 `app.json`

```json
[
  "expo-image-picker",
  {
    "photosPermission": "يحتاج التطبيق إلى الوصول إلى صورك لاختيار صورتك الشخصية.",
    "cameraPermission": "يحتاج التطبيق إلى الكاميرا لالتقاط صورتك الشخصية.",
    "microphonePermission": false
  }
]
```

`expo-image-picker` and `expo-image-manipulator` contain native code, so this needs a **new development build** (`bunx eas-cli build --profile development` or `npx expo run:android`). Expo Go is not enough. On Android, rebuild with the same signing key so Google sign-in keeps working (see the SHA-1 memory note).

### 5.4 Error messages (Arabic)

| Case | Message |
|---|---|
| File over 5 MB | «الصورة أكبر من 5 ميجابايت» |
| Not an image / unsupported type on web | «اختر صورة بصيغة JPG أو PNG» |
| Permission permanently denied | Modal: «اسمح بالوصول إلى الكاميرا/الصور من الإعدادات» |
| Crop/encode failed | «تعذّر تجهيز الصورة، جرّب صورة أخرى» |
| Cloudinary unreachable (offline) | «تعذّر رفع الصورة، تحقق من اتصالك بالإنترنت» |
| Cloudinary rejected it (preset limits) | «تعذّر رفع الصورة، جرّب صورة أخرى» |
| Cloudinary env vars missing (dev only) | «إعدادات Cloudinary غير موجودة» |
| Firestore write failed (after rollback) | «تعذّر حفظ الصورة، حاول مرة أخرى» |

The crop screen stays open after any of these errors, so the student can retry «حفظ».

### 5.5 Accessibility

- The avatar button has `accessibilityLabel="تغيير الصورة الشخصية"` and `accessibilityRole="button"`. The image itself is hidden from screen readers.
- The sheet has `accessibilityViewIsModal`, the title has `accessibilityRole="header"`, and every row is a button with a minimum height of 58.
- The slider is `adjustable`, with `accessibilityValue={{ min: 100, max: 300, now }}`, and each increment or decrement changes the zoom by 10%.
- The crop screen's «حفظ» shows a spinner and is disabled while uploading.

---

## 6. Implementation phases

### Phase 1 · Backend & data layer ✅ (code done; preset, deploy and a real upload pending)

Done: steps 2, 3 and 5. The `avatars/{uid}` rules are in the dashboard's `firestore.rules`, and `tests/avatars.test.js` is part of `npm run test:rules` (57/57 pass). The upload sends `folder=azhar-avatars/{uid}` and `public_id={auto id}`, the same way the dashboard sends `folder` for exam pages. If the preset also sets an asset folder and the first upload comes back as `azhar-avatars/azhar-avatars/…`, clear the preset's folder.


1. **Cloudinary:** create the `azhar-avatars` unsigned preset (§3.1).
2. Add the two `EXPO_PUBLIC_CLOUDINARY_*` values to `.env` and `.env.example`.
3. In the dashboard repo, add the `avatars/{uid}` rules (§3.2) and the rules tests. Run `npm run test:rules`.
4. Deploy the rules: `firebase deploy --only firestore:rules` from the dashboard repo.
5. Add `src/lib/cloudinary.ts` and `src/data/avatars.ts` (§3.3).
6. **Check:**
   - From a dev button, upload a test JPEG.
   - Confirm that `secure_url` is under `azhar-avatars/{uid}/` and that the rule's regex accepts it. Adjust the regex if the folder mode puts the path somewhere else.
   - Read it back, then delete the document.
   - Force a `setDoc` failure and confirm that `delete_by_token` removes the upload.

### Phase 2 · `<Avatar>` component ✅ (code done; needs a look on a device)

Done: `<Avatar>` (photo through `avatarUrl`, falls back to the initial if the image fails to load), `CameraIcon` / `PencilIcon` in `icons.tsx`, the profile card (title «الملف الشخصي», 76 px avatar with the indigo ring and camera badge, name, email, pencil → `/edit-profile`, shown only once the profile exists) and `HomeHeader` (now takes `uid`). The camera badge does nothing until Phase 3 wires the sheet. Guests keep the centred person icon.


1. Add `src/components/avatar.tsx` with `avatarUrl` transformations.
2. Restyle the profile identity card (§1.1): the 76 px avatar with the ring and camera badge, name, email and pencil button. Use it in `home-header.tsx` as well.
3. **Check:**
   - With no photo, both screens show the initial as before.
   - With an `avatars/{me}` document, the photo appears on both screens.
   - The network tab shows the transformed URL (`w_256…f_auto`), not the original.

### Phase 3 · Photo sheet & crop screen ✅ (code done; needs a dev build and device checks)

Done: `expo-image-picker` + `expo-image-manipulator` installed, plugin in `app.json`, `src/lib/pick-photo.ts`, `src/lib/crop-photo.ts` (`cropRect` + `cropToAvatar`), `src/components/photo-sheet.tsx`, `toast.tsx`, `zoom-slider.tsx`, `crop-view.tsx` (`useCrop` + `CropView`), the `edit-photo` route and the profile wiring. Notes on what was built:

- **Toasts live at the root** (`ToastProvider` in `_layout.tsx`, `useToast()`), so the crop screen can show «تم تحديث صورتك الشخصية» and go back.
- **Picker timing:** on iOS the picker opens from the sheet's `onDismiss` (it can't present over a closing modal). On web it opens in the tap itself, because browsers only open the file chooser from a user gesture, so `pickPhoto` awaits nothing before launching there. Android opens it right away.
- **Camera** opens the front camera (the design's `capture="user"`).
- **RTL:** the slider's minimum is on the right, like the design's range input in an RTL page. The slider and crop view position things with transforms only (physical on every platform), never `left`/`right`, which RTL may swap.
- `edit-photo` is a `fullScreenModal` with swipe-to-dismiss off. Without valid params (e.g. a web reload that drops the `blob:` URI) it goes back to the profile.
- Not handled: Android's `getPendingResultAsync()` (the system killing the app while the camera is open). Add it if it shows up on low-memory phones.


1. Run `npx expo install expo-image-picker expo-image-manipulator` and add the `app.json` plugin.
2. Add `pick-photo.ts`, `photo-sheet.tsx`, `toast.tsx`, `zoom-slider.tsx`, `crop-view.tsx`, `crop-photo.ts` and the `edit-photo` route.
3. Wire the profile screen together: avatar → sheet → camera/library → crop → upload → Firestore → toast. Removing deletes the document and shows a toast.
4. Make a new dev build.
5. **Check on Android, iOS and web:**
   - Take a photo and pick from the gallery. Both show the crop screen.
   - Pan, pinch and slide. The uploaded photo matches what was inside the circle.
   - Try a portrait photo, a landscape photo and a PNG.
   - A file over 5 MB shows the error toast.
   - Cancelling at the picker, at the crop screen or at the sheet uploads nothing.
   - Deny permission once (the request appears again next time), then deny it permanently (the «فتح الإعدادات» modal appears).
   - Replace the photo. The new one shows immediately (it has a new URL).
   - Remove the photo. The initial comes back.
   - Saving while offline shows the error and lets the student retry.
   - The upload in the Cloudinary media library is under `azhar-avatars/{uid}/` and is under 100 KB.

### Phase 4 · Avatars in matches & leaderboard, and cleanup ✅ (code done; needs the two-phone checks below)

Done:
- **`<Avatar>`** got a `radius` prop, so the match screens keep their rounded squares.
- **Screens:** it's now used in `PlayerRow` (both rows; `useMatch` now returns `oppId`), the `MatchResult` players, `SearchState` («أنت»; the pulsing «؟» stays), `RecentMatchRow` and the leaderboard. The bot gets `uid={null}`, so there's no read for `avatars/bot`.
- **Cleanup script:** `scripts/cleanup-cloudinary.mjs` has a second pass for `azhar-avatars/`. It runs only when `CLEANUP_EMAIL` / `CLEANUP_PASSWORD` are set, because the client SDK must sign in to read `avatars`. It uses the same `--min-age-hours`, `--delete` and `--allow-empty` flags and the same safety check. The exam pass is unchanged. Its prefix, `azhar-exams/`, can't match `azhar-avatars/`.


1. Use `<Avatar uid>` in `player-row.tsx` (both rows), `match-result.tsx`, `search-state.tsx`, `recent-match-row.tsx` and `leaderboard.tsx`.
2. Keep the existing colours: indigo for me, amber for the opponent, and the «؟» pulse while searching.
3. **Cleanup script** (`../azhar-exams-dashboard/scripts/cleanup-cloudinary.mjs`). Add a second pass:
   - List the images under the `azhar-avatars/` prefix.
   - Read every `avatars/{uid}` document with the **Admin SDK or an admin sign-in**. The documents need a signed-in reader, and the script reads exams without signing in today.
   - Delete files whose `publicId` no document references and that are older than `--min-age-hours`.
   - Keep the existing `azhar-exams/` pass unchanged. Its prefix doesn't match `azhar-avatars/`, but **check that before the first run**.
4. **Check with two phones:**
   - Each player sees the other's photo in the lobby, during the match and on the result screen.
   - A player without a photo still shows their initial.
   - Leaderboard reads: one small `getDoc` per row, cached for the session.
   - A dry run of the cleanup script lists only replaced or removed avatars.

### Cost

- **Saving:** 1 Cloudinary upload (about 60 KB) and 1 Firestore write.
- **Viewing:** 1 Firestore read per new uid per session, about 200 bytes. The image comes from Cloudinary's CDN as a small WebP or AVIF, and the device caches it.
- **Cloudinary free tier:** about 25 credits a month, shared by storage, bandwidth and transformations. Each avatar uses a few derived sizes (64/128/256), so a few thousand students fit comfortably. Watch usage in the console.
- **Leaderboard:** 50 rows add up to 50 tiny reads the first time it opens. If that grows, copy `photoUrl` into `ratings/{uid}` when the rating is settled, so rows need no extra read.

---

## 7. Later

- Delete replaced photos immediately through a Cloud Function that holds the API secret, once the project is on Blaze, instead of waiting for the cleanup script.
- «استخدم صورة Google» import (§2 #14).
- Report or hide an inappropriate photo, plus an admin review list in the dashboard.
- Copy `photoUrl` into match players and `ratings/{uid}` to save reads (§6 Cost).
- The rest of the 6 · Profile design: the stats grid, the level pill and the settings list (dark mode, notifications).
