# خطة الاختبار السريع: Exam Runner

Plan for the **«اختبار سريع»** feature: the student gets **10 random, unique questions** from the question bank in Firestore and answers them on the **Exam Runner** screen from [`docs/3 · Exam Runner-html/Exam.dc.html`](<3 · Exam Runner-html/Exam.dc.html>).

Status: **phase 1 implemented** (2026-10-27) with the proposals in [§2](#2-decisions-to-confirm). It differs from the plan in two places:
- «اختبار جديد» reloads the questions in place (`retry()`) rather than calling `router.replace('/quick-test')`.
- The timer is read on a 1-second interval inside `use-quiz.ts`, not through a separate `useNow` hook.

`usePreventRemove` is imported from `expo-router/react-navigation`. It has to come from there and not from `@react-navigation/native`, because expo-router bundles its own copy of React Navigation.

## 1. What exists and what the design shows

### 1.1 The question bank (already live, managed in the dashboard)

The dashboard's «بنك الأسئلة» page writes the questions, see `../azhar-exams-dashboard/docs/question-bank-plan.md`. It holds 20 questions today, seeded from the 2026 booklets.

```
questions/mcq-questions/items/{q01, q02, …}
```

| Field | Type | Notes |
|---|---|---|
| `body` | string | Question text, 1–1000 chars |
| `choices` | string[4] | Exactly 4 non-empty strings |
| `correctIndex` | int 0–3 | Index into `choices` |
| `source` | map, optional | `{ gradeId, sectionId, subjectId, examId, imageId, subjectName, examName, page, url, thumbUrl, width, height }`: the exam page the question was copied from |
| `createdAt`, `updatedAt` | Timestamp | |

Rules: **`allow read: if true`** (guests too), and only admins can write. So the app needs **no rules change** to read questions. The dashboard shows choices as **أ ب ج د** in stored order, without shuffling.

### 1.2 The design

One 390×844 dark, RTL artboard (padding `20 20 24`, gap 18). From top to bottom:

| # | Block | Content | Key values |
|---|---|---|---|
| 1 | **Top bar** | ✕ button «إنهاء الاختبار» (44×44), **«السؤال 5 من 20»**, timer pill **`00:14:52`** (LTR) | ✕ `#1E293B`, 1px `#334155`, r12, icon `#94A3B8`; counter 15/700; timer `#1E293B`/`#334155`, 15/700, clock icon `#A5B4FC` |
| 1b | **Low-time timer** | The same pill turns red and pulses (`opacity 1 → .45`, 1 s loop) | `rgba(239,68,68,0.16)`, border `#EF4444`, text `#F87171` 15/800 |
| 2 | **Progress bar** | 8 high, 25 % filled | track `#1E293B`, fill `#6366F1`, r4 |
| 3 | **Question card** | Chip **«الرياضيات · الجبر»**, **«درجة واحدة»**, question text, and a 150-high **image box** («صورة السؤال (Cloudinary)») with a 44×44 zoom button | card `#1E293B`, 1px `#334155`, r20, padding 18, gap 14; text 18/700 lh 1.7; image box `#0F172A`, 1px dashed `#334155`, r14 |
| 4 | **4 choices** | Letter tile (**أ ب ج د**) + text. One can be selected | min height 58, r16, padding `10 14`, gap 10; idle: `#1E293B`, 2px `#334155`, letter `#0F172A`/`#94A3B8`; **selected**: `rgba(99,102,241,0.16)`, 2px `#6366F1`, 4px glow ring `rgba(99,102,241,0.18)`, letter `#6366F1`/white; letter tile 34×34 r10 15/800; text 16/600 |
| 5 | **Footer** | **«السابق»** (outline), **flag** toggle «تمييز السؤال للمراجعة» (54×54), **«التالي»** (filled, flex 1) | all h54 r16; outline `#1E293B`/`#334155` 15/600; flag on: `rgba(245,158,11,0.16)`, `#F59E0B`, icon `#FBBF24`; next `#4F46E5` 16/700 |

The design shows **no right/wrong feedback** while answering. «التالي» on the last question links to `Result.dc.html`, a later design that we don't have yet.

## 2. Decisions to confirm

| # | Question | Proposal |
|---|---|---|
| 1 | **How to pick 10 random questions.** Firestore has no "random" query. | **Read the whole bank once per quiz** (`getDocs`), shuffle it on the device (Fisher–Yates) and take the first 10. Every question then has the same chance, the 10 are guaranteed unique, and it needs no dashboard changes. It costs one read per question: 20 now, still fine at a few hundred. When the bank passes ~500, switch to the scalable approach in [§4.2](#42-later-when-the-bank-is-large). |
| 2 | **Which questions?** The bank mixes all grades and subjects, and `source` says where each came from. | **Phase 1: the whole bank**, since it's small and all from the same booklets. **Phase 2:** filter by the student's section (`where('source.sectionId', '==', …)`), and optionally by subject. Guests get the whole bank. |
| 3 | **Fewer than 10 questions** in the pool | Use all of them («السؤال ٣ من ٧»). With 0, show «لا توجد أسئلة بعد». |
| 4 | **Timer** | **1 minute per question**, so 10:00 for 10 questions. It turns red and pulses in the **last 2 minutes** (the mockup shows red at 01:38). At 0 the test ends by itself and unanswered questions count as wrong. It counts toward a fixed deadline, not with a decrementing counter, so it stays right when the app is in the background. |
| 5 | **Question image box.** Questions have no image of their own. `source.url` is the **whole exam page** the question was copied from. | **Hide the box** in phase 1. Showing the whole page would be confusing and could show neighbouring questions. Phase 2: add an optional `image` field in the dashboard (the `validMcq()` rule needs `'image'` in `hasOnly`), then show it with the existing `zoomable-image`/`page-viewer-modal`. On the result screen, offer «عرض صفحة الامتحان» from `source.url`. |
| 6 | **Chip «المادة · الوحدة» and «درجة واحدة»** | The chip shows `source.subjectName`, or «عام» without a source; we have no unit or topic. Every question is worth **1 point**, so «درجة واحدة» stays as fixed text. |
| 7 | **Shuffle the choices?** | **No.** The order stays أ ب ج د as stored, the same as the dashboard. Choices like «كل ما سبق» depend on their position. |
| 8 | **Result screen.** The design links to `Result.dc.html`, which doesn't exist yet. | A **simple interim result screen**: the score «٧ / ١٠», the percentage, time taken, and a list of every question with the student's answer and the correct one (green ✓ / red ✗), plus «اختبار جديد» and «العودة للرئيسية». It gets restyled when the Result design arrives. |
| 9 | **Leaving mid-test** (✕, Android back button, swipe back) | Ask first: «إنهاء الاختبار؟ ستفقد إجاباتك.» with «متابعة الاختبار» / «إنهاء». This uses a custom dark modal, because `Alert.alert` does nothing on web. |
| 10 | **Finishing with unanswered or flagged questions** | On the last question, «التالي» becomes **«إنهاء الاختبار»**. If any are unanswered or flagged, confirm first: «لديك ٢ بدون إجابة و١ مميّز للمراجعة», with «مراجعة» (jumps to the first one) or «إنهاء». |
| 11 | **Saving results** for «سجل النتائج» | **Out of scope here.** Phase 2 is `users/{uid}/attempts/{id}`, which needs rules in the dashboard. Note that `correctIndex` is public, so scores are graded on the device and can't be trusted for **leagues**. Leagues will need grading in a Cloud Function and the answers hidden from the client. |
| 12 | **Who can take it** | Everyone, guests included, since the questions are public. Only saving results (phase 2) needs an account. |

## 3. Routing

One new root-stack route that opens **above the tabs** with no header. The runner and the result are two phases of the same screen, so the answers never have to be passed between routes:

```
src/app/
  quick-test.tsx        NEW: loading → running → finished (result)
```

In `src/app/_layout.tsx`, not guarded (guests too):

```tsx
<Stack.Screen
  name="quick-test"
  options={{ ...darkScreenOptions, gestureEnabled: false, animation: 'slide_from_bottom' }}
/>
```

- `gestureEnabled: false` stops an iOS swipe from ending the test by accident. The Android back button and ✕ go through the confirm modal (decision 9), using React Navigation's `usePreventRemove`. I'll check how SDK 57's expo-router exposes it before using it.
- Entry point: the home screen's «اختبار سريع» tile → `router.push('/quick-test')`. Today that tile opens the student's grade, and «عرض الكل» still does that.
- «اختبار جديد» on the result screen calls `router.replace('/quick-test')` to get a fresh set.

## 4. Data

### 4.1 `src/data/questions.ts` (new)

```ts
export const MCQ_ITEMS_PATH = 'questions/mcq-questions/items';
export const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د'];

export type QuestionSource = { subjectName?: string; examName?: string; url?: string; thumbUrl?: string; width?: number | null; height?: number | null; /* + ids */ };
export type Question = { id: string; body: string; choices: string[]; correctIndex: number; source?: QuestionSource | null };

/** `count` random, unique questions (fewer if the bank is smaller). */
export async function fetchRandomQuestions(count: number): Promise<Question[]> {
  const snapshot = await getDocs(collection(db, MCQ_ITEMS_PATH));
  const valid = snapshot.docs.map(toQuestion).filter(isValid); // 4 choices, correctIndex 0–3
  return shuffle(valid).slice(0, count);
}
```

- `getDocs`, not a live listener. A question edited mid-test must not change on screen.
- `isValid` skips malformed documents rather than crashing. The rules already enforce the shape, so this is only a safety net.
- `shuffle` goes in `src/utils/random.ts`: Fisher–Yates on a copy, using `Math.random()`, which is enough for practice tests.

### 4.2 Later, when the bank is large

Reading the whole bank costs one read per question. Past ~500 questions:
- The dashboard writes a `random: number` (0–1) field on every question, which means a rules and backfill change there.
- The app picks `r = Math.random()` and queries `where('random', '>=', r).orderBy('random').limit(10)`, wrapping around to `random < r` if it got fewer than 10. Results are unique by construction, at 10 reads per quiz.

### 4.3 Session state: `src/hooks/use-quiz.ts` (new)

A `useReducer` holding:

```ts
type Quiz = {
  status: 'loading' | 'error' | 'empty' | 'running' | 'finished';
  questions: Question[];
  index: number;                 // current question
  answers: (number | null)[];    // chosen choice per question
  flagged: boolean[];
  deadline: number;              // Date.now() + 60_000 × questions.length
  finishedAt: number | null;
};
// actions: loaded, failed, select(choice), toggleFlag, go(index), finish
```

- `score = answers.filter((a, i) => a === questions[i].correctIndex).length`
- A `useNow(1000)` tick drives the timer text, and `remaining = deadline − now`. At ≤ 0 it dispatches `finish`.
- Selecting an answer does **not** move to the next question (as in the design). The student taps «التالي».

## 5. Components

New, all on `Brand` + `Fonts`:

| File | What |
|---|---|
| `src/components/quiz/quiz-header.tsx` | ✕ button, «السؤال ٥ من ١٠» (Arabic digits), `TimerPill`, progress bar (`accessibilityRole="progressbar"`) |
| `src/components/quiz/timer-pill.tsx` | `mm:ss` in a pill, always LTR. The low-time variant pulses with Reanimated (`withRepeat(withTiming(0.45, 500), -1, true)`). Mockup shows `00:14:52`, but `14:52` is enough for a 10-minute test |
| `src/components/quiz/question-card.tsx` | Subject chip (reuses `Chip`), «درجة واحدة», body text. The image slot stays out until decision 5 phase 2 |
| `src/components/quiz/choice-button.tsx` | Letter tile + text; idle / selected styles. On the result screen it gets correct / wrong styles. `accessibilityRole="radio"` + `checked` |
| `src/components/quiz/quiz-footer.tsx` | «السابق» (disabled on Q1), flag toggle (`accessibilityState.selected`), «التالي» / «إنهاء الاختبار» |
| `src/components/quiz/quiz-result.tsx` | Interim result: score ring or number, stats, the per-question review list, two buttons |
| `src/components/confirm-modal.tsx` | Dark modal with a title, body and two buttons, used for decisions 9 and 10 |
| `src/components/icons.tsx` | Add `CloseIcon` (✕), `ClockIcon`, `BookmarkIcon`, `ForwardIcon` (points left, «التالي»). `BackIcon` already points right for «السابق» |

Layout: the screen is a column. The header is fixed, the question card and choices sit in a `ScrollView` (long questions), and the footer is fixed at the bottom with the safe-area inset. On web, content width is capped at 480 and centered. The light status bar comes from `useLightStatusBar()`.

## 6. Phases

1. **Runner + interim result:**
   - `questions.ts`, `random.ts`, `use-quiz.ts`
   - the quiz components and confirm modal
   - the `quick-test` route, with the home tile pointing to it
2. **Next:**
   - filter by the student's section or subject (decision 2)
   - question images (decision 5, dashboard first)
   - save attempts for «سجل النتائج» (decision 11, rules first)
   - avoid repeating the last quiz's questions (remember seen ids in AsyncStorage and prefer unseen ones)
3. **When designs arrive:** the Result screen, then leagues, which need server-side grading.

## 7. Verification

- `npx tsc --noEmit` and `npx expo lint` pass.
- On the Android dev build:
  - 10 different questions each time, and no repeats within a quiz.
  - Selecting, previous/next and flags keep their state when moving between questions.
  - The timer turns red at 2:00 and ends the test at 0:00. Putting the app in the background for a minute and returning shows the right time.
  - ✕ and the Android back button ask before leaving. Finishing with unanswered questions asks first.
  - The score matches the answers, and the review list shows the right correct choice.
  - Offline: the error state «تعذّر تحميل الأسئلة» shows with a retry button.
- Web: the confirm modals work (no `Alert`), and the layout holds at phone and desktop width.
- RTL: «السابق» is on the right, the chevrons point the right way, and the timer reads LTR.
