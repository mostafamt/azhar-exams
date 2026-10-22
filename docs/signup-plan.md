# خطة شاشة إنشاء الحساب: Email Sign up

Plan for restyling the sign-up screen (`src/app/(auth)/sign-up.tsx`) to the design in [`docs/1b · Email Sign up-html/Signup.dc.html`](<1b · Email Sign up-html/Signup.dc.html>). It follows the welcome and sign-in screens already built from the same design set ([welcome-auth-plan.md](welcome-auth-plan.md), §11 for sign-in).

Status: **implemented** with these answers to [§3](#3-decisions-to-confirm):

1. **A:** grade/section picker kept on sign-up (dark `tone`), after «تأكيد كلمة المرور».
2. **Firebase's rule, not the design's:** 6+ characters, with the hint «٦ أحرف على الأقل» under the field.
3. **No strength meter.** §4.4 was not built.
4. **Terms checkbox hidden.** §4.6 was not built.
5. **Subtitle kept** as in the design.

Built as planned: `AuthScreen` (+ `OrDivider`, `AuthErrorText`) in `src/components/auth-screen.tsx`, with sign-in and welcome moved onto the shared pieces; `AuthTextField` `compact`/`hint`/`showToggle`; `AuthButton` `tall`; `UserIcon`; `tone="dark"` on `GradeSectionPicker` and `SegmentedControl`. All auth inputs are right-aligned explicitly, because on web an empty input otherwise follows its placeholder's direction.

## 1. What the design shows

Dark 390×844 RTL artboard. Outer padding `20 24 24`, gap **20** (sign-in uses 24).

| # | Block | Content | Key values |
|---|---|---|---|
| 1 | **Back button** | 44×44, chevron → welcome | same as sign-in |
| 2 | **Header** | **«إنشاء حساب جديد»** + **«احفظ نتائجك ونافس في الدوريات»** | 26/800; 15 `#94A3B8`; gap 6 |
| 3 | **الاسم الكامل** | person icon, placeholder «مثال: أحمد علي» | |
| 4 | **البريد الإلكتروني** | mail icon, `name@example.com`, LTR text aligned right | |
| 5 | **كلمة المرور** | lock icon, eye toggle, shown **focused** (indigo ring) | |
| 5a | **Strength meter** | 4 bars, 3 filled green `#10B981`, 1 idle `#334155`; `aria-hidden` | height 4, radius 2, gap 6, margin-top 2 |
| 5b | **Hint** | «قوية · 8 أحرف على الأقل، وتحتوي على رقم وحرف كبير» (`aria-describedby` of the input) | 12 `#94A3B8` |
| 6 | **تأكيد كلمة المرور** | lock icon, **no** eye toggle | |
| 7 | **Terms checkbox** | «أوافق على **شروط الاستخدام** و**سياسة الخصوصية**» (links `#A5B4FC`), unchecked, box aligned to the first text line | 13, line-height 1.7, gap 10, box margin-top 3 |
| 8 | **Submit** | **«إنشاء الحساب»** | h56, r16, `#4F46E5`, 16/700 |
| 9 | **Spacer** | `flex: 1` | |
| 10 | **Footer** | «لديك حساب بالفعل؟ **تسجيل الدخول**» | 15; link 700 `#A5B4FC` |

Field metrics differ slightly from sign-in. Fields are **52** high (sign-in 54), label↔field gap is **6** (sign-in 8), and the form gap is **14** (sign-in 16).

**Not in the design but in today's screen:**
- the **grade/section picker** (الصف / الشعبة)
- Firebase error messages
- per-field validation errors

**In the design but not in the app:**
- the password-strength rules (today: 6+ characters)
- the terms checkbox
- a Google button: neither has one. The design has none on sign-up, and Google is offered on welcome and sign-in.

## 2. What we already have

The work for sign-in built most of the parts:

| Need | Existing piece | Change |
|---|---|---|
| Back button, header, footer, spacer, dark layout | `sign-in.tsx` markup | Extract a shared **`AuthScreen`** layout (see §4.1) instead of copying it a third time |
| Fields with icon, focus ring, eye toggle, inline error | `src/components/auth-text-field.tsx` | Add `compact` (52 high, label gap 6). Add `describedBy`/`hint` support (§4.3) |
| Checkbox | `src/components/checkbox.tsx` | Label can be a node (with links), box aligns to the first line (`alignItems: 'flex-start'`, 3pt offset), 13pt text |
| Submit button | `src/components/auth-button.tsx` | Optional `tall` (56) for both sign-in and sign-up submits. Sign-in uses 54 today, while its design also says 56 |
| Icons | `src/components/icons.tsx` | Add **`UserIcon`** (`circle 12,8 r4` + `M4 21a8 8 0 0 1 16 0`) |
| Light status bar | `useLightStatusBar()` | none |
| Sign-up action, profile creation, verification email | `signUp()` in `src/lib/auth-actions.ts` | none, unless decision 1 = B |
| Grade/section picker | `src/components/grade-section-picker.tsx` (light) | Needs a dark variant if kept (decision 1 = A) |
| Back-with-no-history fallback | `goBack()` in sign-in | Moves into `AuthScreen` |

## 3. Decisions to confirm

| # | Question | Proposal |
|---|---|---|
| 1 | **Grade & section.** The design has no picker. But `firestore.rules` (dashboard repo, `validProfile()`) **requires** `gradeId` + `sectionId` when `users/{uid}` is created, and home uses them to open the student's own grade. | **A, keep the picker on sign-up**, restyled dark and placed after «تأكيد كلمة المرور». No rules change, same data as today. *B:* drop it from sign-up. `signUp` then creates only the Auth user, and right after, the user is sent to `/complete-profile` (dark, name prefilled), the same path new Google users take. That matches the design, but it's two steps and needs the redirect in §5. |
| 2 | **Password rules.** The design says «8 أحرف على الأقل، وتحتوي على رقم وحرف كبير». Today the minimum is 6 characters. | Require **8+ characters, at least one digit, at least one Latin uppercase letter**, checked in the client. *Optional:* also turn on Firebase Auth's **password policy** (console → Authentication → Settings) with the same rules, so they're enforced server-side. Its error code `auth/password-does-not-meet-requirements` gets an Arabic message. |
| 3 | **Strength meter.** What do the 4 bars and the label measure? | One bar per rule met: length ≥ 8, has a digit, has an uppercase letter, length ≥ 12 or has a symbol. Labels: 0–1 «ضعيفة» (red `#F87171`), 2 «متوسطة» (amber `#F59E0B`), 3 «قوية» (green `#10B981`), 4 «قوية جدًا» (green). Before typing, show the hint without a label: «8 أحرف على الأقل، وتحتوي على رقم وحرف كبير». The 4th bar is a bonus: the submit only needs the first three. |
| 4 | **Terms checkbox.** There are no terms or privacy pages yet (the welcome footer is hidden for the same reason). | Hide the checkbox until the pages exist. When they do, show it **required** (submit shows «يجب الموافقة على الشروط») and open the links with `expo-web-browser`. *Alternative:* show it now with links to placeholder pages. |
| 5 | **Subtitle** «احفظ نتائجك ونافس في الدوريات»: results and leagues don't exist yet (same issue as sign-in). | Keep the design's text, as on sign-in. |
| 6 | **Confirm field** has no eye toggle in the design. | Follow the design: no toggle. The eye on «كلمة المرور» shows the password, and that's enough to check it. |
| 7 | **Forgot-password** still has the old light look. | Out of scope here. Restyle when its design (`Forgot.dc.html`) arrives. |

## 4. Implementation

### 4.1 Shared layout: `src/components/auth-screen.tsx`

Pull the frame out of `sign-in.tsx` so all three screens (sign-in, sign-up, later forgot-password) share it:

```tsx
<AuthScreen title="إنشاء حساب جديد" subtitle="…" gap={20} footer={<AuthFooter … />}>
  {form}
</AuthScreen>
```

- `KeyboardAvoidingView` + `ScrollView` (`keyboardShouldPersistTaps="handled"`), safe-area padding, `maxWidth: 480`.
- Back button with the no-history fallback (`/welcome`, or `/` for guests).
- Header (`accessibilityRole="header"`).
- `flex: 1` spacer, then the footer.
- `useLightStatusBar()`.
- Sign-in is refactored onto it with **no visual change**. Re-check it against the 1a design afterwards.

### 4.2 Screen: `src/app/(auth)/sign-up.tsx`

Same state and refs as today (`name`, `email`, `password`, `confirm`, `place`, `errors`, `submitting`, `error`), plus `accepted` if decision 4 shows the checkbox. Field order and keyboard flow: name → email → password → confirm → (picker) → submit. `returnKeyType="next"` and `submitBehavior="submit"` move focus between fields as they do today.

| Field | Props |
|---|---|
| الاسم الكامل | `icon={UserIcon}`, `placeholder="مثال: أحمد علي"`, `autoComplete="name"`, `textContentType="name"` |
| البريد الإلكتروني | `icon={MailIcon}`, `keyboardType="email-address"`, `autoComplete="email"`, `textContentType="emailAddress"` |
| كلمة المرور | `icon={LockIcon}`, `password`, `autoComplete="new-password"`, `textContentType="newPassword"`, `hint={<PasswordStrength value={password} />}` |
| تأكيد كلمة المرور | `icon={LockIcon}`, `password`, `showToggle={false}`, `autoComplete="new-password"`, `placeholder="••••••••"` |

Validation (on submit, same as today, errors under each field):

| Field | Rule | Message |
|---|---|---|
| name | non-empty, ≤ 100 | أدخل اسمك / الاسم طويل جدًا |
| email | `EMAIL_PATTERN` | البريد الإلكتروني غير صالح |
| password | §3 decision 2 | كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على رقم وحرف كبير |
| confirm | equals password | كلمتا المرور غير متطابقتين |
| place | grade + section chosen (decision 1 = A) | اختر الصف والشعبة |
| terms | checked (if shown) | يجب الموافقة على الشروط |

Firebase errors (`authErrorMessage`) show as one red line under the submit, as on sign-in. Update `auth/weak-password` in `auth-errors.ts` to the new rule text, and add `auth/password-does-not-meet-requirements` with the same message.

On success nothing changes: the account is created, the profile written, the verification email sent (not awaited), and the `!user` guard leaves for home.

### 4.3 `AuthTextField` additions

- `compact?: boolean`: `minHeight: 52`, container gap 6.
- `hint?: ReactNode`: rendered under the field. When it's a string, the input gets `accessibilityHint` with it, the RN equivalent of `aria-describedby`.
- `showToggle?: boolean` (default `true` when `password`): lets the confirm field drop the eye.

### 4.4 New: `src/components/password-strength.tsx`

- `passwordChecks(value)` → `{ length, digit, upper, bonus }`, plus `meetsPasswordRules(value)` for the validator. Put them in `src/utils/password.ts` so they can be unit-tested without UI.
- Renders 4 equal bars (`flexDirection: 'row'`, `gap: 6`, each `flex: 1`, h4, r2) and the label line «{قوية} · 8 أحرف على الأقل، وتحتوي على رقم وحرف كبير». Bars are hidden from accessibility. The label is in the field's `accessibilityHint`.
- In RTL the first filled bar is on the right, as in the mockup. Nothing extra needed.

### 4.5 Dark grade/section picker (decision 1 = A)

`GradeSectionPicker` is light. Add a `tone="dark"` prop rather than a copy, so the Firestore loading, auto-pick and error logic stays in one place:

- Labels: `Fonts.semiBold` 14 `Brand.text`, the same as the field labels.
- Chips/segments: surface `#1E293B`, border `#334155`. Selected: border `#6366F1`, background `rgba(99,102,241,0.18)`, text `#A5B4FC`.
- `SegmentedControl` gets the same `tone` prop.
- Spinner `Brand.link`, errors `Brand.error`.

`complete-profile.tsx` (light) keeps the default tone.

### 4.6 Checkbox with links (decision 4)

`Checkbox` takes `label: ReactNode`. Pressing the row toggles the box, and the two links are nested `Text` with their own `onPress`, which open the URLs in `expo-web-browser`. Box `marginTop: 3` + row `alignItems: 'flex-start'` keep it on the first line when the text wraps.

## 5. Only if decision 1 = B (picker after sign-up)

1. `signUp()` stops calling `createProfile`. It creates the Auth user, sets `displayName` and sends verification.
2. Root layout: after sign-in, if `!initializing && user && !profile`, `router.replace('/complete-profile')` (today home only shows a link). This also improves the Google flow.
3. Restyle `complete-profile.tsx` dark (it'd become part of the sign-up flow) and use the dark picker there.
4. No rules change: the profile is still created with grade + section, just one screen later.

## 6. Order of work

1. `UserIcon`, `AuthTextField` (`compact`, `hint`, `showToggle`), `Checkbox` (node label), `AuthButton` (`tall`).
2. `AuthScreen`. Move sign-in onto it and compare with the 1a mockup.
3. `src/utils/password.ts` + `PasswordStrength`.
4. Dark `GradeSectionPicker` / `SegmentedControl` tone (decision 1 = A).
5. Rewrite `sign-up.tsx`. Update `auth-errors.ts`.
6. `_layout.tsx`: `(auth)/sign-up` uses `darkScreenOptions`.
7. `npx tsc --noEmit`, `npx expo lint`. Check it in a browser at phone width next to the mockup (`python3 -m http.server` in the design folder).

## 7. Test checklist

- [ ] Layout matches the 1b mockup at 390×844: field heights 52, gaps 20 / 14 / 6
- [ ] Strength meter: empty → hint only; `abc` → 1 red bar «ضعيفة»; `Exam2026` → 3 green «قوية» (the mockup's sample); `Exam2026!xyz` → 4
- [ ] Submit with an empty form → an error under every required field, nothing sent
- [ ] Weak password / mismatch / no grade → the right field message
- [ ] Email already registered → «هذا البريد مسجّل بالفعل» under the button
- [ ] Success → home with own grade; verification email arrives in Arabic
- [ ] Keyboard: «التالي» moves name → email → password → confirm; the screen scrolls so the focused field is visible (iOS + Android)
- [ ] Back from welcome → welcome. Direct `/sign-up` URL → back goes to welcome
- [ ] «تسجيل الدخول» footer replaces with sign-in, and sign-in's «إنشاء حساب» comes back
- [ ] Sign-in still matches its mockup after moving onto `AuthScreen`
- [ ] Screen reader: labels read, password hint read, bars skipped, checkbox state announced
