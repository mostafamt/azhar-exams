# خطة الشاشة الرئيسية: Home

Plan for replacing the current home (`src/app/index.tsx`) with the **Home** design in [`docs/2 · Home-html/Home.dc.html`](<2 · Home-html/Home.dc.html>). This is the screen signed-in users and guests see after the welcome screen.

Status: **phases 1–2 implemented** with the proposals in [§2](#2-decisions-to-confirm). It differs from the plan in three places:
- The «الامتحانات» tab is its own dark grade list (`(tabs)/exams.tsx`). It isn't a `GradeList` shared with the light `grades/index.tsx`.
- The verify-email banner switched to the dark palette outright, since it only appears on dark screens now.
- The announcements copy describes real features, not the mockup's placeholders (`src/data/announcements.ts`).

## 1. What the design shows

One 390×844 dark, RTL artboard in the Cairo font, the same `Brand` palette as the welcome screen. Outer padding is `24 20 16`, with a gap of 22 between blocks. From top to bottom:

| # | Block | Content | Key values |
|---|---|---|---|
| 1 | **Header** | 46×46 round avatar with the name's first letter, **«مرحباً، أستاذ أحمد»** and **«جاهز لاختبار اليوم؟»**. On the other side are two pills: 🔥 streak **5** and ⭐ **Lv. 4** | avatar `#312E81` / `#C7D2FE` 18/700; name 18/700; sub 13 `#94A3B8`; streak pill `rgba(245,158,11,0.14)` / `#FBBF24`; level pill `rgba(99,102,241,0.18)` / `#A5B4FC`; pills 13/700, r999, padding `6 10` |
| 2 | **Announcements carousel** | 3 slides, 150 high: «دوري الأبطال — الموسم الجديد» (amber badge «قريباً»), «سلسلة مراجعة نهاية الفصل» (green badge «سلسلة مميّزة»), and «[عنوان الإعلان]» (indigo badge «إعلان»). Each slide has a big faded icon in the corner. Pager dots below | card `#312E81`, r20, padding 20; title 19/800; body 14 `#C7D2FE` lh 1.6, max width 240; watermark icon 130px `rgba(245,158,11,0.22)` at left −18 / bottom −22; dots as on welcome (active 24×8 `#6366F1`, idle 8×8 `#334155`, 40×24 hit area). There's an autoplay prop (4 s), off by default |
| 3 | **Quick actions** | 3 equal tiles: 🎯 **اختبار سريع**, 🏆 **الدوري الحالي**, 📊 **سجل النتائج** | tile `#1E293B`, 1px `#334155`, r16, padding `14 8`; icon box 42×42 r12 (indigo / amber / green soft); label 14/700; gap 10 |
| 4 | **Section header** | **«الاختبارات المتاحة»** and the link **«عرض الكل»** | 18/800; link 14/600 `#A5B4FC` |
| 5 | **Exam cards** | Subject chip (الرياضيات) and difficulty chip (متوسط), title «الجبر — المعادلات التربيعية», meta «٢٠ سؤال · ٣٠ دقيقة» and the button **«ابدأ الآن»** | card `#1E293B`, 1px `#334155`, r16, padding 16, gap 12; chips 12/700 r999; title 16/700; meta 13 `#94A3B8` with 15px icons; button `#4F46E5`, r12, min height 44, 14/700 |
| 6 | **Bottom tab bar** | **الرئيسية** (active), **الدوريات**, **الامتحانات**, **حسابي** | height 72, `#1E293B`, top border `#334155`; label 12; active `#A5B4FC` 700, idle `#94A3B8` 600; icons 22 |

The links in the mockup point at `Exam.dc.html`, `Leagues.dc.html`, `Result.dc.html` and `Profile.dc.html`. These are later designs that don't exist yet.

## 2. Decisions to confirm

The design shows a **gamified, question-based** app (streaks, levels, leagues, timed quizzes with difficulty levels). Today's app is a **library of scanned past exams** (`grades → sections → subjects → exams` with page images, managed in the dashboard). Most of the questions below come from that gap.

| # | Question | Proposal |
|---|---|---|
| 1 | **Streak and level pills.** We store no activity, so there's nothing to count. | **Hide them** until a results/activity feature exists. The header keeps the avatar and greeting. *Alternative:* show them with fake numbers (not recommended, because students would see wrong data). |
| 2 | **Greeting «أستاذ أحمد»** | Use `profile.name` (or `user.displayName`) with no title, like «مرحباً، أحمد». Guests see «مرحباً بك» with a generic avatar. Subtitle: «جاهز لاختبار اليوم؟». |
| 3 | **Announcements carousel.** There is no announcements data. | **Phase 1:** a hardcoded list in `src/data/announcements.ts` with real copy (no `[placeholders]`). **Phase 2:** an `announcements` collection managed from the dashboard (needs rules in `../azhar-exams-dashboard`). *Alternative:* skip the carousel until phase 2. |
| 4 | **Quick actions.** None of the three features exist. | **اختبار سريع** opens the student's own grade and section, as today's «ابدأ المذاكرة الآن» does (or the grade picker for guests and incomplete profiles). **الدوري الحالي** and **سجل النتائج** are shown dimmed with a small «قريباً» badge and do nothing. *Alternative:* replace them with things we have, such as «امتحانات صفي», «كل الصفوف» and «حسابي». |
| 5 | **Exam cards.** Our exams have no questions, difficulty or duration, only a year, a term and page images. | Map the card to real data: subject chip = **subject name**, second chip = **term** («الفصل الأول» / «الدور الثاني»), title = `examTitle(exam)`, meta = **«٤ صفحات · ٢٠٢٥»** (page count and year), button **«افتح»** opens the exam viewer. |
| 6 | **Which exams go under «الاختبارات المتاحة»?** | The **latest 5 exams in the student's section** (newest year first). This needs one listener per subject (fine for about 10 subjects), or a new `collectionGroup` query if the dashboard stores `gradeId`/`sectionId` on each exam. «عرض الكل» opens the section page (`/grades/[gradeId]?section=`). Guests and users without a grade see a card «اختر صفك لعرض الامتحانات» instead. |
| 7 | **Tab bar.** It has 4 tabs, but leagues and the profile page don't exist. | Use 3 tabs now: **الرئيسية**, **الامتحانات** (the grade/section browser) and **حسابي** (a small new profile screen with name, email, grade, the verify-email banner and sign-out). **الدوريات** waits for its design. *Alternative:* all 4 tabs, with a «قريباً» screen for leagues. |
| 8 | **Theme.** Home and the tab bar become dark, but the grades and exam screens are still light. | Accept the mix for now: pushed screens open above the tabs with their own light header. Restyle them when their designs (`Exam`, `Result`) arrive. |
| 9 | **Where do sign-out and «أكمل بياناتك» go?** Today they're on home. | Sign-out moves to **حسابي**. The verify-email banner and the «أكمل بياناتك» link stay at the top of home (restyled dark), because students need to see them. |
| 10 | **Carousel autoplay** | Off, as in the design's default. Swipe and dots only. |

## 3. Routing changes

Expo Router SDK 57 includes JavaScript tabs (`Tabs` from `expo-router`). A `(tabs)` group holds the tab screens. Everything else stays in the root stack and opens **above** the tab bar.

```
src/app/
  _layout.tsx                  guard changes from "index" to "(tabs)"
  welcome.tsx                  unchanged
  (tabs)/
    _layout.tsx                NEW: <Tabs> with the dark tab bar
    index.tsx                  NEW home (moved from src/app/index.tsx, rebuilt)
    exams.tsx                  NEW: grade/section browser (reuses grades/index content)
    profile.tsx                NEW: account details + sign-out
  grades/...                   unchanged, pushed over the tabs
  (auth)/..., complete-profile unchanged
```

In `src/app/_layout.tsx`:

```tsx
<Stack.Protected guard={!showWelcome}>
  <Stack.Screen name="(tabs)" options={darkScreenOptions} />
</Stack.Protected>
```

`(tabs)/_layout.tsx`:

```tsx
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: Brand.link,
    tabBarInactiveTintColor: Brand.textMuted,
    tabBarStyle: { backgroundColor: Brand.surface, borderTopColor: Brand.border, height: 72 + insets.bottom },
    tabBarLabelStyle: { fontFamily: Fonts.semiBold, fontSize: 12 },
    sceneStyle: { backgroundColor: Brand.background },
  }}>
  <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color }) => <HomeIcon color={color} size={22} /> }} />
  <Tabs.Screen name="exams" options={{ title: 'الامتحانات', tabBarIcon: ... }} />
  <Tabs.Screen name="profile" options={{ title: 'حسابي', tabBarIcon: ... }} />
</Tabs>
```

Notes:
- The active label is bold (700) in the design. I'll switch `fontFamily` per tab with `tabBarLabel: ({ focused, color }) => <Text …/>`.
- RTL: the tab order follows the layout direction, so «الرئيسية» appears on the right. I'll check this on Android, web and iOS.
- Links to `/` keep working because `(tabs)/index.tsx` is still the `/` route.
- `grades/index.tsx` stays as a route. The «الامتحانات» tab renders the same content by moving it into a shared component (`GradeList`).

## 4. Data

| Need | Source | Work |
|---|---|---|
| Name, grade, section | `useAuth().profile` | none |
| Section's subjects | `useSubjects(gradeId, sectionId)` | none |
| Latest exams in the section | new `useLatestExams(gradeId, sectionId, limit)` in `src/data/content.ts`: one `useExams`-style listener per subject, merged and sorted by `year` desc then `order` | new hook |
| Announcements | `src/data/announcements.ts` (static, phase 1) | new file |

If decision 6 goes with `collectionGroup`, the dashboard must also write `gradeId`/`sectionId` on exams, and `firestore.rules` there must allow the group query. That's a separate change in `../azhar-exams-dashboard`.

## 5. Components

All of these use `Brand` and `Fonts` (Cairo, one family per weight, as today). New files:

| File | What |
|---|---|
| `src/components/home/home-header.tsx` | Avatar initial + greeting. Stat pills stay out until decision 1 changes |
| `src/components/carousel.tsx` | **Generic** swipe carousel + pager dots, taken from `feature-carousel.tsx` (same Reanimated/gesture code, RTL swipe direction, tallest-slide height). `FeatureCarousel` becomes a thin wrapper, so welcome is unchanged |
| `src/components/home/announcement-card.tsx` | One slide: badge, title, body, watermark icon |
| `src/components/home/quick-action.tsx` | Tile with icon box and label; `disabled` + «قريباً» badge variant |
| `src/components/home/exam-card.tsx` | Chips, title, meta row, «افتح» button |
| `src/components/chip.tsx` | Small rounded label (indigo / amber / green / neutral tones), shared by the cards and badges |
| `src/components/icons.tsx` | Add from the mockup: `HomeIcon`, `TrophyIcon`, `TargetIcon`, `BellIcon`, `ClockIcon`, `QuestionIcon`, `UserCircleIcon` (+ `FlameIcon`, `StarIcon` for later). `ChartIcon` and `DocumentIcon` already exist |

Changes to existing files:
- `verify-email-banner.tsx`: add a dark variant (or switch it to `Brand`, since every screen that shows it will be dark).
- `src/app/index.tsx`: removed. Its logic (`start()`, sign-out, guest link) moves to the home and profile tabs.

Screen layout: `ScrollView` with the header, carousel, quick actions and exam list. The tab bar is outside the scroll. Top padding uses the safe-area inset. Use `useLightStatusBar()` as on welcome.

## 6. Phases

1. **Tabs + routing**: `(tabs)` group, dark tab bar, move home there, add the profile tab with sign-out, `exams` tab reusing the grade list.
2. **Home UI**: header, carousel (static announcements), quick actions, «الاختبارات المتاحة» with real latest exams, guest and empty states.
3. **Later, with new designs/features**: streak and level, leagues tab, results history, announcements from the dashboard, dark restyle of the grade/exam screens.

## 7. Verification

- `npx tsc --noEmit` and `npx expo lint` pass.
- On the Android dev build:
  - signed-in student with a grade
  - signed-in user without a profile
  - guest
  - unverified email
- Tab order and swipe direction are correct in RTL.
- The safe area is right on a notched device and with gesture navigation.
- Web (`npx expo start --web`): the layout holds at phone width and on desktop (content max width 480, centered, as on today's home).
- The welcome screen carousel still works after the `Carousel` extraction.
