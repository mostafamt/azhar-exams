# خطة المباريات: 1v1 Live Match

Plan for **real-time 1v1 quiz matches**. Two students get the **same random questions** from the question bank and answer them **together, one question at a time**. A question stays on screen until **both** players have answered or its timer runs out. Then both see the answers, and both move to the next question at the same moment. The screens come from three designs:

| Screen | Design | Route |
|---|---|---|
| **7a · Match Lobby**: pick a preset, search for an opponent | [`design/7a · Match Lobby-html/MatchLobby.dc.html`](<design/7a · Match Lobby-html/MatchLobby.dc.html>) | `src/app/match/index.tsx` |
| **7b · Live Match**: the shared question, its timer, the opponent's answer | `design/7b · Live Match-html.zip` → `Match.dc.html` | `src/app/match/[id].tsx` (phase `playing`) |
| **7c · Match Result**: win / loss / draw, stats, rematch | [`design/7c · Match Result-html/MatchResult.dc.html`](<design/7c · Match Result-html/MatchResult.dc.html>) | `src/app/match/[id].tsx` (phase `finished`) |

Status: **Phase 1 implemented** (2026-11-03): rules, rules tests, indexes and `src/data/matches.ts`. Phases 2–5 are not started. Revised the same day so that both players **move through the questions together (lockstep)**. The first draft had each player on their own clock.

Implementation is split into **five phases** that can each be built, tested and committed on their own. See [§8](#8-implementation-phases):

1. **Backend & data layer:** rules, indexes, `src/data/matches.ts`
2. **Room code:** two friends get into the same match
3. **Live match (lockstep):** play a full match
4. **Result, rematch & history**
5. **Random matchmaking**

Stack: **Firebase JS SDK v13** (`firebase/firestore`, already used by `src/lib/firebase.ts`), not `@react-native-firebase`. Firestore rules, indexes and Cloud Functions live in **`../azhar-exams-dashboard`** (`firestore.rules`, `functions/index.js`), so every rules change in this plan is made there.

---

## 1. What the designs show

### 1.1 Lobby (7a)

- Header: back button, **«مباراة جديدة»**, rating pill `1,240`.
- **«المادة»** chips: متنوع, رياضيات, فيزياء, كيمياء, لغة عربية.
- **«مدة المباراة»**: three cards, **3 دقائق / 10 أسئلة**, **5 دقائق / 15 سؤال**, **10 دقائق / 25 سؤال**.
- **«ابدأ المباراة»** (h60, `#4F46E5`, 6px bottom shadow `#3730A3`).
- Rows: **«البطولات»** (badge «مباشر»), **«تحدَّ صديقاً»**, **«تدرّب ضد الروبوت»** («بدون تأثير على تصنيفك»).
- **«آخر المباريات»**: opponent, subject, score `8 – 6`, badge فوز.
- **Searching state**: you vs a pulsing «؟» avatar, «جارٍ البحث عن منافس…», summary «رياضيات · 5 دقائق · مباراة مصنّفة», elapsed `00:07`, «إلغاء البحث».

### 1.2 Live match (7b)

- Top bar (`#111A2E`): leave ✕, «رياضيات · مباراة مصنّفة», «السؤال 7 من 15», **score pill** `4 – 3` (me `#A5B4FC`, opponent `#FBBF24`).
- **Question strip**: one 38×44 tile per question, each with two marks (me / opponent): ✓ `#34D399`, ✗ `#F87171`, – `#475569`. The current tile is indigo.
- **Opponent row** (top): amber avatar, name + rating, status **«يفكّر…»** (pulsing) → **«أجاب · تظهر إجابته بعد إجابتك»** → **«اختار ج (6) · خاطئة»**, plus **their clock**.
- Question card, then a **2×2 grid of choices** (h72). After confirming, the correct one turns green and a wrong pick turns red. Small avatar badges show **which choice each player picked**.
- Feedback bar: «إجابة صحيحة · +10 نقاط (الأسرع)» / «إجابة خاطئة · الإجابة الصحيحة 5».
- **My row** (bottom): «أنت», «دورك للإجابة», **my clock**. It turns red when time is low.
- Bottom bar: «خيارات», **«تأكيد الإجابة»** → **«السؤال التالي»**, «تفاعل».

The mock gives each player a whole-match clock (5:00) that stops when that player answers. **In lockstep we keep the two clock boxes but drive them from one shared question timer** (§5.3). Both boxes count down the same seconds, and each one **freezes when its player answers**. The boxes then show how much time each player had left at the moment they answered, which keeps the design's look. «السؤال التالي» becomes an **automatic countdown** («السؤال التالي خلال ٢…»), because the match advances for both players together.

### 1.3 Result (7c)

- «رياضيات · 5 دقائق · مصنّفة», hero **«فوز!» / «خسارة» / «تعادل»** with a subtitle, the two avatars and a big **`10 – 8`**.
- Rating chip `+12 → 1,252` and XP chip `+60 XP`.
- Stats table (أنت / المنافس): **إجابات صحيحة** `10 / 15`, **متوسط زمن الإجابة** `14s`, **أطول سلسلة صحيحة** `5`, **الوقت المتبقي** `0:42`.
- **«إعادة التحدّي»**, **«مباراة جديدة»**, **«مراجعة الأسئلة والحلول»**.

The score shown is the **number of correct answers** (`10 – 8` = `10 / 15` vs `8 / 15`).

---

## 2. Decisions (MVP)

| # | Question | Decision |
|---|---|---|
| 1 | **How do the players progress?** | **Lockstep.** The match document has one `current` question index for both players. A question ends when **both have answered** or its **timer runs out**. Then both see the reveal for **2.5 s**, and the match moves to the next question for both. |
| 2 | **Timer** | **One timer per question, shared by both players.** It starts when `current` changes. Its length is `secondsPerQuestion` (20 s by default). The client shows the countdown from a local anchor ([§5.3](#53-the-question-timer)). **The rules enforce it with server time**: an answer that arrives later than 2 s after the deadline is rejected. |
| 3 | **Who moves the match to the next question?** | **Both clients try; a transaction makes sure it happens once.** The rules allow it only when the question is over (both answered, or past the deadline). There is no host role and no Cloud Function. If one player disappears, the other's timeouts keep the match moving to the end. |
| 4 | **Scoring** | **1 point per correct answer.** The live «+10 / +5 نقاط» speed points are left out. The feedback still says «(الأسرع)» when you were correct and faster than the opponent. **Equal scores = draw** («نفس عدد الإجابات الصحيحة»). Leaving the match = loss. |
| 5 | **Presets.** The bank holds ~20 questions today, and the design's presets go up to 25 questions. | Three cards, labelled by question count instead of minutes: **«5 أسئلة» · 20 ثانية للسؤال** (default), **«10 أسئلة» · 20 ثانية**, **«15 سؤال» · 30 ثانية**. Counts live in one `PRESETS` constant and are capped at the bank size. |
| 6 | **Subject chips** | **MVP: «متنوع» only** (the whole bank), and the chip row is hidden. Every extra subject splits the few online players into separate queues. Phase 6: subjects from `source.subjectId`, filtered by the student's section. |
| 7 | **Rating `1,240`, «مصنّفة», `+12`, XP, «البطولات»** | **Out of MVP.** Client-graded results can't be trusted (§2 #11). Matches are **«ودية»** (friendly), and the rating pill and chips are hidden. Phase 6: Elo + XP in a Cloud Function. |
| 8 | **How to find an opponent** | Two ways: **random matchmaking** («ابدأ المباراة») and a **room code** («تحدَّ صديقاً»). No separate queue collection: **a `waiting` match document is the queue entry** ([§4.1](#41-random-matchmaking)). |
| 9 | **«تدرّب ضد الروبوت»** | **Phase 6.** It can run fully on the device with no Firestore. Hidden for now, or shown greyed with «قريباً». |
| 10 | **Who can play** | **Signed-in students only** (`user && profile`). A match needs a `uid` and a name. Guests see the Home entry, and tapping it offers sign-in. |
| 11 | **Cheating** | The bank is public (`allow read: if true`), so `correctIndex` is public anyway. For the MVP **each client grades itself**. The rules check that a player writes only **their own** answer, only for the **current** question, only **once** and only **in time**. They also check that the grade matches the question's `correctIndex` and that the score rises by exactly that grade. Good enough for friendly matches. Ranked matches need server grading (Phase 6, [§9](#9-phase-6-later-after-the-mvp)). |
| 12 | **Opponent's answer while the question is open** | Shows **«أجاب · تظهر إجابته بعد إجابتك»** until I answer (design `reveal: afterMe`). Then it shows their choice. Once the question ends (both answered or time's up), everything is revealed. |
| 13 | **Leaving mid-match** (✕, Android back, swipe) | Confirm with the custom dark modal («مغادرة المباراة؟ ستُحتسب خسارة.»), as in quick-test. `Alert.alert` does nothing on web. Leaving is **a single write** that marks me `left` and finishes the match with the opponent as the winner. |
| 14 | **Opponent disappears** (app killed, no network) | My client keeps moving the match forward when each question times out, and their missing answers count as wrong. The match ends normally after at most `count × (seconds + 2.5)` seconds. |
| 15 | **Nobody to play** | After **60 s** of searching show «لا يوجد منافسون الآن» with «استمر في البحث» / «تحدَّ صديقاً». Waiting matches older than 2 min are ignored by search and removed by a TTL policy. |

---

## 3. Firestore schema

One collection, **one document per match**. Both players listen to that single document with `onSnapshot`. Everything about a match (players, questions, answers, current question, status) arrives in one snapshot, which is exactly what lockstep needs.

```
matches/{matchId}
```

```ts
{
  // ── setup ─────────────────────────────────────────────
  mode: 'random' | 'code',
  code: 'K7P2QX' | null,          // room code, only for mode 'code'
  queueKey: 'mix:short' | null,   // `${subjectId ?? 'mix'}:${presetId}`, only for mode 'random'
  subjectId: string | null,       // null = متنوع
  preset: 'short' | 'medium' | 'long',
  secondsPerQuestion: 20,
  questions: [                    // fixed when the match is created (§4.3)
    { id: 'q07', body: '…', choices: ['…','…','…','…'], correctIndex: 2, subjectName: 'رياضيات' | null },
  ],

  // ── shared progress (the lockstep) ───────────────────
  status: 'waiting' | 'playing' | 'finished',
  current: 0,                     // the question both players are on (0-based)
  questionStartedAt: Timestamp | null, // server time `current` started; the rules time answers against it

  // ── bookkeeping ───────────────────────────────────────
  hostId: 'uidA',
  playerIds: ['uidA', 'uidB'],    // array, for `array-contains` (history) and rules
  createdAt: Timestamp,
  startedAt: Timestamp | null,
  finishedAt: Timestamp | null,
  winnerId: 'uidA' | null,        // null + finished = draw
  rematchId: string | null,       // §6.6
  expireAt: Timestamp | null,     // TTL: only set while waiting

  // ── per player (each player writes only their own key) ─
  players: {
    uidA: {
      name: 'أحمد علي',
      answers: {                  // keyed by question index; missing = no answer (wrong)
        '0': { choice: 1, correct: true,  ms: 8200 },
        '1': { choice: 3, correct: false, ms: 15400 },
      },
      score: 1,                   // = number of correct answers (increment())
      left: false,
    },
    uidB: { … },
  },
}
```

Why this shape:

- **`current` + `questionStartedAt` at the top level are the lockstep.** Neither player stores their own position. The screen always shows `questions[current]`.
- **Answers as a map keyed by index**, not an array, so an answer is a single **dotted-path update** (`players.uidA.answers.3`) with no read-modify-write. The rules can also check that the key equals `current`.
- **Moving to the next question is a transaction** on `current` (§5.4), so two clients trying at once can't skip a question.
- **Questions are copied into the match.** Both players see exactly the same questions even if an admin edits the bank mid-match, and the screen needs no extra reads. 15 questions ≈ 10–20 KB, far below the 1 MiB document limit.
- **Status lifecycle:** `waiting` → (second player joins: `current = 0`, timer starts) → `playing` → (last question over, or someone leaves) → `finished`. A host who cancels while waiting **deletes** the document.

### 3.1 Security rules (in `../azhar-exams-dashboard/firestore.rules`)

**Implemented in Phase 1.** The source of truth is the `matches` block in the dashboard's `firestore.rules`, tested by `tests/matches.test.js` (`npm run test:rules`). In summary:

| Rule | Who | Allowed when |
|---|---|---|
| **read** | signed in | The match is `waiting` (matchmaking, room codes) or you're one of its players |
| **create** | signed in | You're the host and the only player, with a fresh player entry (`score 0`, no answers). It's `waiting` with `current 0`, has 1–25 questions and 5–60 s per question, and `createdAt` is server time. Only the known fields are allowed |
| **join** | a second user | `waiting` with one player. You add only yourself, with a fresh entry. `status → playing`, and `startedAt` = `questionStartedAt` = server time |
| **answer** | a player | `playing`. Only your own `answers.{current}` and `score` change. You haven't answered yet, it's within `seconds + 2` of `questionStartedAt`, `choice` is 0–3 and `ms` is within the limit. **`correct` must equal `choice == questions[current].correctIndex`, and `score` must rise by exactly that**, so grades and scores can't be faked |
| **advance** | a player | `current + 1` (not past the last question), `questionStartedAt` = server time. The question is over: both answered, or past `seconds` |
| **finish** | a player | On the last question, once it's over. `winnerId` is a player or `null` |
| **forfeit** | a player | Only your own `left → true`. `status → finished`, and `winnerId` = the opponent |
| **rematch link** | a player | `finished`, `rematchId` still `null` |
| **delete** | the host | Only while `waiting` |

### 3.2 Indexes and TTL

Add `firestore.indexes.json` to the dashboard and reference it in `firebase.json` (`"indexes": "firestore.indexes.json"`):

```json
{
  "indexes": [
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "queueKey", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "playerIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "finishedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

The room-code lookup (`code ==`, `status ==`) uses only equality filters, so the automatic single-field indexes cover it.

**TTL policy** on `matches.expireAt` (Console → Firestore → TTL). A waiting match gets `expireAt = now + 1 h`, and joining clears it (`deleteField()`), so abandoned searches clean themselves up. Finished matches are kept for «آخر المباريات».

---

## 4. Game flow

```
Lobby ──ابدأ المباراة──► search waiting matches (same queueKey, < 2 min old)
                           ├─ found → transaction: join (status → playing, current 0, timer starts) ─┐
                           └─ none  → create own waiting match, listen to it ────────────────────────┤
                                       ├─ someone joins ──────────────────────────────────────────────┤
                                       └─ every 4 s: an OLDER waiting match? join it, delete mine ────┤
                                                                                                      ▼
                                                         router.replace('/match/[id]') ── Live match
                                                                                                      │
     ┌──────────────────────────────── for each question (both players together) ───────────────────┤
     │  questions[current] shown, shared timer runs                                                  │
     │  each player: pick → «تأكيد» → write own answer → «بانتظار المنافس…»                          │
     │  both answered OR timer at 0 → reveal (2.5 s) → transaction: current + 1 (or finish)          │
     └───────────────────────────────────────────────────────────────────────────────────────────────┤
                                                                                                      ▼
                                                                       status finished → Result
```

### 4.1 Random matchmaking

The waiting match **is** the queue entry:

1. Query `matches` where `queueKey == key`, `status == 'waiting'`, `createdAt > now − 2 min`, `orderBy('createdAt')`, `limit(5)`.
2. For each result not hosted by me, **try to join it in a transaction**: re-read it, and if it's still `waiting` with one player, add me and set `status: 'playing'`, `startedAt` and `questionStartedAt` to `serverTimestamp()`. The transaction makes sure that **only one player can join**, even when several try at once.
3. If none could be joined, **create my own** waiting match and listen to it.
4. **Race fix:** two players who search at the same moment can both create a waiting match and wait forever. While waiting, every 4 s look for a waiting match that is **older than mine**. If one exists, join it and delete mine (only if mine is still waiting). Because the **newer one always joins the older one**, two players can never swap into each other's match.
5. «إلغاء البحث», or leaving the screen, deletes my waiting match.

### 4.2 Room code («تحدَّ صديقاً»)

There is no design for this. A small dark sheet opens from the lobby row:

- **«أنشئ غرفة»** creates a match with `mode: 'code'` and a 6-character code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L). It shows the code large, a «مشاركة» button (`Share.share` from `react-native`) and the same «جارٍ انتظار صديقك…» state as the search.
- **«انضم بكود»** is a text field. It queries `where('code', '==', CODE), where('status', '==', 'waiting'), limit(1)` and then joins with the same transaction as §4.1.
- Phase 6: deep link `azharexams://match/join?code=K7P2QX` (the scheme already exists in `app.json`).

### 4.3 Picking the questions

The **creator** picks the questions when creating the match. It reuses `fetchRandomQuestions(count)` from `src/data/questions.ts`: read the bank once, Fisher–Yates shuffle, take `count`. See `docs/quick-test-plan.md` §2 #1 for why reading the whole bank is fine below ~500 questions. Choices keep their stored order (أ ب ج د), as in quick-test.

Firestore has no "random" query. Once the bank is large, switch to the `random` field + `where('random', '>=', r)` approach from quick-test-plan §4.2. Only `fetchRandomQuestions` changes.

---

## 5. Live match logic (lockstep)

### 5.1 The phases of one question

Each client derives the phase from the snapshot and its local clock. Nothing about the phase is stored.

| Phase | When | My UI |
|---|---|---|
| **answering** | I haven't answered and the timer is above 0 | Choices enabled, «تأكيد الإجابة» |
| **waiting** | I answered, the opponent hasn't, the timer is above 0 | Choices locked with my result (green/red). The opponent row shows «يفكّر…» and the button «بانتظار المنافس…» (disabled) |
| **reveal** | Both answered, **or** the timer hit 0 | Everything is revealed: the correct answer, both badges, the feedback bar and the strip marks. The button counts down «السؤال التالي خلال ٢…» (disabled). After `REVEAL_MS` = 2.5 s the client advances |

### 5.2 Writes

| Moment | Who | Write |
|---|---|---|
| **Join** | joiner | `status: 'playing'`, `startedAt` and `questionStartedAt` = `serverTimestamp()` (transaction) |
| **Confirm** | me | `players.me.answers.{current} = {choice, correct, ms}`, `players.me.score += correct` |
| **Advance** (reveal over) | **both try** | Transaction: if `current` is still `i`, set `current: i + 1, questionStartedAt: serverTimestamp()`. On the last question, set `status: 'finished', finishedAt, winnerId` instead |
| **Leave** | me | `players.me.left = true`, `status: 'finished'`, `winnerId: opponent`, `finishedAt` |

Answers are plain `updateDoc` calls with dotted paths. The SDK fires the local snapshot **immediately** (latency compensation, `hasPendingWrites`), so «بانتظار المنافس…» appears instantly. If the rules reject a late answer, the SDK rolls the local change back and the UI simply shows the reveal with my answer missing.

### 5.3 The question timer

```
remaining = secondsPerQuestion·1000 − (now − shownAt)
```

- **`shownAt`** is the **local** `Date.now()` when the snapshot with the new `current` arrived (or the snapshot that changed `status` to `playing`). Each phone measures from **its own** arrival time. This avoids comparing clocks between phones, which can differ by seconds. The cost is a skew of about one network latency (~100–300 ms) between the two players, which doesn't matter for a 20-second question.
- **The server is the referee.** `questionStartedAt` is server time. The rules reject an answer more than `seconds + 2` after it, and reject advancing before `seconds` have passed unless both answered. Each phone's local deadline is a little *later* than the server's, because the snapshot arrives after the server wrote it. So when a phone advances on a timeout, the server agrees. If a phone's advance is rejected anyway, it retries on the next tick.
- **`ms`** for an answer = `min(now − shownAt, seconds·1000)`, measured on that phone. It feeds «(الأسرع)», the result screen's average time, and the frozen clock boxes.
- **Clock boxes:** both show `remaining` while their player hasn't answered. Once a player answers, their box freezes at `seconds − ms`. They turn red in the last **5 s**: mine `#EF4444`/white, the opponent's text `#F87171`.
- A `setInterval` of 250 ms re-renders the timer while `status === 'playing'`.
- **Recovery:** if the app restarts mid-question, the first snapshot uses `questionStartedAt.toMillis()` as `shownAt` and accepts the clock skew. The match itself never stalls, because the opponent's client advances on timeout either way.

### 5.4 Advancing and finishing

- When the reveal ends (`revealStart + REVEAL_MS`), each client runs **`advance(matchId, current)`**. It is a **transaction** that re-reads the match, and **does nothing if `current` has already moved** (the other phone got there first). Otherwise it moves to the next question, or on the last one finishes with `winnerId`.
- Both phones see the new `current` in the same snapshot fan-out, so they start the next question within a network latency of each other. **That is the synchronisation.**
- **Winner:** a player who `left` loses. Otherwise the higher `score` wins, and an equal score is a draw (`winnerId: null`).
- **One player vanishes:** their answers never arrive, so every question ends on the timer and the remaining phone advances. **Both vanish:** the match stays `playing`. That's harmless, because history only lists `finished` matches, and a scheduled function can sweep these up in Phase 6.

---

## 6. Code

### 6.1 Files

```
src/
  app/match/
    index.tsx                 Lobby: idle → searching / room code (7a)
    [id].tsx                  Live match → result (7b, 7c)
  data/matches.ts             Types, PRESETS, toMatch, create/join/answer/advance/leave
  hooks/use-matchmaking.ts    Search, race fix, cancel
  hooks/use-match.ts          onSnapshot, question timer, phases, actions
  components/match/
    player-row.tsx            Avatar, name, status line, clock box (both rows in 7b)
    match-clock.tsx           104×46 clock box, red in the last 5 s
    question-strip.tsx        The 38×44 tiles with me/opponent marks
    match-choice.tsx          72-high choice with letter tile and me/opponent badges
    score-pill.tsx            4 – 3
    search-state.tsx          You vs ؟, spinner, elapsed time (7a searching)
    room-code-sheet.tsx       Create / join by code
    match-result.tsx          Hero, big score, stats table, actions (7c)
```

In `src/app/_layout.tsx`, inside the signed-in guard:

```tsx
<Stack.Protected guard={!!user && !!profile}>
  <Stack.Screen name="edit-profile" options={{ title: 'تعديل البيانات' }} />
  <Stack.Screen name="match/index" options={darkScreenOptions} />
  {/* No swipe back: leaving a live match goes through its confirm dialog. */}
  <Stack.Screen name="match/[id]" options={{ ...darkScreenOptions, gestureEnabled: false }} />
</Stack.Protected>
```

Entry point: a «مباراة» quick action on Home next to «اختبار سريع» (`router.push('/match')`). For guests it opens sign-in.

### 6.2 `src/data/matches.ts`

**Implemented in Phase 1.** The file is the source of truth. It also has `setRematch` (§6.6) and exports `pickWinner`. The listing below is the design it was built from.

```ts
import {
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { fetchRandomQuestions, type Question } from '@/data/questions';
import { db } from '@/lib/firebase';

export const PRESETS = {
  short: { label: '5 أسئلة', count: 5, seconds: 20 },
  medium: { label: '10 أسئلة', count: 10, seconds: 20 },
  long: { label: '15 سؤال', count: 15, seconds: 30 },
} as const;
export type PresetId = keyof typeof PRESETS;

/** Waiting matches older than this are ignored by search. */
const SEARCH_WINDOW_MS = 2 * 60_000;

export type MatchAnswer = { choice: number; correct: boolean; ms: number };

export type MatchPlayer = {
  name: string;
  answers: Record<string, MatchAnswer>;
  score: number;
  left: boolean;
};

export type MatchQuestion = Pick<Question, 'id' | 'body' | 'choices' | 'correctIndex'> & {
  subjectName: string | null;
};

export type Match = {
  id: string;
  mode: 'random' | 'code';
  code: string | null;
  status: 'waiting' | 'playing' | 'finished';
  preset: PresetId;
  secondsPerQuestion: number;
  questions: MatchQuestion[];
  current: number;
  questionStartedAt: Timestamp | null;
  hostId: string;
  playerIds: string[];
  players: Record<string, MatchPlayer>;
  createdAt: Timestamp | null;
  winnerId: string | null;
  rematchId: string | null;
};

export type Me = { uid: string; name: string };

const matches = collection(db, 'matches');

export function toMatch(snapshot: DocumentSnapshot): Match {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Match, 'id'>) };
}

export function opponentId(match: Match, uid: string) {
  return match.playerIds.find((id) => id !== uid) ?? null;
}

/** Both players answered the current question. */
export function bothAnswered(match: Match) {
  return match.playerIds.length === 2 && match.playerIds.every((id) => match.players[id].answers[match.current]);
}

function newPlayer(name: string): MatchPlayer {
  return { name, answers: {}, score: 0, left: false };
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

function queueKey(preset: PresetId) {
  return `mix:${preset}`;
}

export async function createMatch(me: Me, mode: Match['mode'], preset: PresetId) {
  const { count, seconds } = PRESETS[preset];
  const questions = await fetchRandomQuestions(count);
  if (questions.length === 0) throw new Error('empty-bank');

  const ref = doc(matches);
  await setDoc(ref, {
    mode,
    code: mode === 'code' ? newCode() : null,
    queueKey: mode === 'random' ? queueKey(preset) : null,
    subjectId: null,
    preset,
    secondsPerQuestion: seconds,
    questions: questions.map(({ id, body, choices, correctIndex, source }) => ({
      id,
      body,
      choices,
      correctIndex,
      subjectName: source?.subjectName ?? null,
    })),
    status: 'waiting',
    current: 0,
    questionStartedAt: null,
    hostId: me.uid,
    playerIds: [me.uid],
    players: { [me.uid]: newPlayer(me.name) },
    createdAt: serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    winnerId: null,
    rematchId: null,
    expireAt: Timestamp.fromMillis(Date.now() + 60 * 60_000),
  });
  return ref.id;
}

/** Joins a waiting match and starts question 0; false if someone else got there first. */
export function tryJoin(ref: DocumentReference, me: Me) {
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return false;
    const match = toMatch(snapshot);
    if (match.status !== 'waiting' || match.playerIds.length !== 1 || match.hostId === me.uid) return false;
    tx.update(ref, {
      status: 'playing',
      playerIds: [...match.playerIds, me.uid],
      [`players.${me.uid}`]: newPlayer(me.name),
      startedAt: serverTimestamp(),
      questionStartedAt: serverTimestamp(),
      expireAt: deleteField(),
    });
    return true;
  });
}

/** Waiting random matches in the same queue, oldest first; `olderThan` limits it to those before mine. */
export async function findWaiting(preset: PresetId, olderThan?: Timestamp) {
  const since = Timestamp.fromMillis(Date.now() - SEARCH_WINDOW_MS);
  const snapshot = await getDocs(
    query(
      matches,
      where('queueKey', '==', queueKey(preset)),
      where('status', '==', 'waiting'),
      where('createdAt', '>', since),
      ...(olderThan ? [where('createdAt', '<', olderThan)] : []),
      orderBy('createdAt'),
      limit(5),
    ),
  );
  return snapshot.docs;
}

/** Joins the oldest waiting match, or creates one. `joined` tells the caller whether it's already playing. */
export async function findOrCreate(me: Me, preset: PresetId) {
  for (const waiting of await findWaiting(preset)) {
    if (waiting.data().hostId === me.uid) continue;
    if (await tryJoin(waiting.ref, me)) return { matchId: waiting.id, joined: true };
  }
  return { matchId: await createMatch(me, 'random', preset), joined: false };
}

export async function joinByCode(me: Me, code: string) {
  const snapshot = await getDocs(
    query(matches, where('code', '==', code.trim().toUpperCase()), where('status', '==', 'waiting'), limit(1)),
  );
  const waiting = snapshot.docs[0];
  if (!waiting || !(await tryJoin(waiting.ref, me))) return null;
  return waiting.id;
}

/** Deletes my waiting match; does nothing once someone has joined. */
export function cancelWaiting(matchId: string) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists() && snapshot.data().status === 'waiting') tx.delete(ref);
  });
}

/** My answer to the current question. The rules reject it if it's late or not for `current`. */
export function submitAnswer(matchId: string, uid: string, index: number, answer: MatchAnswer) {
  return updateDoc(doc(matches, matchId), {
    [`players.${uid}.answers.${index}`]: answer,
    [`players.${uid}.score`]: increment(answer.correct ? 1 : 0),
  });
}

function pickWinner(match: Match) {
  const [a, b] = match.playerIds.map((id) => ({ id, ...match.players[id] }));
  if (a.left !== b.left) return a.left ? b.id : a.id;
  if (a.score === b.score) return null;
  return a.score > b.score ? a.id : b.id;
}

/**
 * Moves both players from question `from` to the next one, or finishes after the last.
 * Both clients call it; whoever comes second finds `current` already moved and does nothing.
 */
export function advance(matchId: string, from: number) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return;
    const match = toMatch(snapshot);
    if (match.status !== 'playing' || match.current !== from) return;
    if (from + 1 >= match.questions.length) {
      tx.update(ref, { status: 'finished', finishedAt: serverTimestamp(), winnerId: pickWinner(match) });
    } else {
      tx.update(ref, { current: from + 1, questionStartedAt: serverTimestamp() });
    }
  });
}

/** Forfeit: one write that marks me as left and gives the opponent the win. */
export function leaveMatch(matchId: string, uid: string, opponent: string) {
  return updateDoc(doc(matches, matchId), {
    [`players.${uid}.left`]: true,
    status: 'finished',
    finishedAt: serverTimestamp(),
    winnerId: opponent,
  });
}
```

### 6.3 `src/hooks/use-matchmaking.ts`

The lockstep change doesn't affect matchmaking.

```ts
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cancelWaiting, findOrCreate, findWaiting, toMatch, tryJoin, type Me, type PresetId } from '@/data/matches';
import { db } from '@/lib/firebase';

const RETRY_MS = 4000;

type Search =
  | { status: 'idle' }
  | { status: 'searching'; startedAt: number }
  | { status: 'found'; matchId: string }
  | { status: 'error' };

/** Random matchmaking: join the oldest waiting match, or wait in our own (docs/match-plan.md §4.1). */
export function useMatchmaking(me: Me | null) {
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  // The waiting match we created, deleted again on cancel/unmount.
  const ownId = useRef<string | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const cleanUp = useCallback(() => {
    stop.current?.();
    stop.current = null;
    if (ownId.current) cancelWaiting(ownId.current).catch(() => {});
    ownId.current = null;
  }, []);

  const start = useCallback(
    async (preset: PresetId) => {
      if (!me) return;
      setSearch({ status: 'searching', startedAt: Date.now() });
      try {
        const { matchId, joined } = await findOrCreate(me, preset);
        if (joined) return setSearch({ status: 'found', matchId });

        ownId.current = matchId;
        // Someone joins ours…
        const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (snapshot) => {
          if (snapshot.exists() && toMatch(snapshot).status === 'playing') {
            ownId.current = null; // it's a real match now; don't delete it
            cleanUp();
            setSearch({ status: 'found', matchId });
          }
        });
        // …or we join an older waiting match (the race fix).
        const retry = setInterval(async () => {
          const mine = ownId.current;
          if (!mine) return;
          const createdAt = (await findWaiting(preset)).find((d) => d.id === mine)?.data().createdAt;
          for (const older of await findWaiting(preset, createdAt)) {
            if (older.id === mine || !(await tryJoin(older.ref, me))) continue;
            cleanUp(); // deletes our own waiting match
            return setSearch({ status: 'found', matchId: older.id });
          }
        }, RETRY_MS);

        stop.current = () => {
          unsubscribe();
          clearInterval(retry);
        };
      } catch {
        cleanUp();
        setSearch({ status: 'error' });
      }
    },
    [me, cleanUp],
  );

  const cancel = useCallback(() => {
    cleanUp();
    setSearch({ status: 'idle' });
  }, [cleanUp]);

  useEffect(() => cleanUp, [cleanUp]);

  return { search, start, cancel };
}
```

The lobby screen navigates when a match is found:

```tsx
useEffect(() => {
  if (search.status === 'found') router.replace({ pathname: '/match/[id]', params: { id: search.matchId } });
}, [search]);
```

### 6.4 `src/hooks/use-match.ts`

```ts
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  advance,
  bothAnswered,
  leaveMatch,
  opponentId,
  submitAnswer,
  toMatch,
  type Match,
} from '@/data/matches';
import { db } from '@/lib/firebase';

/** How long both players see the answers before the next question. */
const REVEAL_MS = 2500;
const LOW_TIME_MS = 5000;

/**
 * The snapshot plus local times (docs/match-plan.md §5.3):
 * shownAt  = when the current question appeared on this phone,
 * bothAt   = when this phone learned both had answered (null until then).
 */
type Live = { match: Match; shownAt: number; bothAt: number | null };

export function useMatch(matchId: string, uid: string) {
  const [live, setLive] = useState<Live | null>(null);
  const [missing, setMissing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The question index we've already tried to advance from, so it's sent once per question.
  const advancedFrom = useRef(-1);

  // One listener for everything. The local anchors change only when the question changes.
  useEffect(() => {
    let previous: Live | null = null;
    return onSnapshot(
      doc(db, 'matches', matchId),
      (snapshot) => {
        if (!snapshot.exists()) return setMissing(true);
        const match = toMatch(snapshot);
        const at = Date.now();
        const sameQuestion =
          previous !== null && previous.match.status === match.status && previous.match.current === match.current;
        const next: Live = {
          match,
          shownAt: sameQuestion
            ? previous!.shownAt
            : // First snapshot after a restart: fall back to server time (skew accepted).
              previous === null && match.questionStartedAt
              ? Math.min(at, match.questionStartedAt.toMillis())
              : at,
          bothAt: sameQuestion && previous!.bothAt !== null ? previous!.bothAt : bothAnswered(match) ? at : null,
        };
        if (!sameQuestion) setPicked(null);
        previous = next;
        setLive(next);
      },
      () => setMissing(true),
    );
  }, [matchId, uid]);

  const match = live?.match;
  const status = match?.status;

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [status]);

  const oppId = match ? opponentId(match, uid) : null;
  const me = match?.players[uid];
  const opp = match && oppId ? match.players[oppId] : undefined;
  const index = match?.current ?? 0;
  const total = match?.questions.length ?? 0;
  const question = match?.questions[index];
  const myAnswer = me?.answers[index];
  const oppAnswer = opp?.answers[index];

  const limitMs = (match?.secondsPerQuestion ?? 0) * 1000;
  const deadline = (live?.shownAt ?? 0) + limitMs;
  const remaining = Math.max(0, deadline - now);

  // Reveal starts when both answered, or when the time is up, whichever comes first.
  const revealStart = live ? Math.min(live.bothAt ?? Infinity, deadline) : Infinity;
  const revealing = status === 'playing' && now >= revealStart;
  const nextIn = Math.max(0, revealStart + REVEAL_MS - now);

  const phase =
    !match ? null
    : match.status === 'finished' ? 'finished'
    : revealing ? 'reveal'
    : myAnswer ? 'waiting'
    : 'answering';

  // Reveal over: move both players on. Retries on the next tick if the rules said "too early".
  useEffect(() => {
    if (phase !== 'reveal' || nextIn > 0 || advancedFrom.current === index) return;
    advancedFrom.current = index;
    advance(matchId, index).catch(() => (advancedFrom.current = -1));
  }, [phase, nextIn, index, matchId]);

  const confirm = useCallback(() => {
    if (phase !== 'answering' || !question || picked === null || !live) return;
    const ms = Math.min(Date.now() - live.shownAt, limitMs);
    submitAnswer(matchId, uid, index, { choice: picked, correct: picked === question.correctIndex, ms });
  }, [phase, question, picked, live, limitMs, matchId, uid, index]);

  const leave = useCallback(() => (oppId ? leaveMatch(matchId, uid, oppId) : Promise.resolve()), [matchId, uid, oppId]);

  // The opponent's answer to the current question shows once I've answered or the question is over.
  const oppVisible = !!myAnswer || phase === 'reveal';
  // Their score counts past questions plus the current one once it's visible (no spoilers).
  const oppScore = opp
    ? Object.entries(opp.answers).filter(([k, a]) => a.correct && (Number(k) < index || oppVisible)).length
    : 0;

  /** A player's clock box: the shared countdown, frozen at the moment they answered. */
  const clockFor = (answer: typeof myAnswer) => (answer ? limitMs - answer.ms : remaining);

  return {
    loading: !match && !missing,
    missing,
    match,
    me,
    opp,
    phase,
    index,
    total,
    question,
    picked,
    pick: (choice: number) => phase === 'answering' && setPicked(choice),
    confirm,
    leave,
    myAnswer,
    /** null = thinking; 'hidden' = answered but not shown yet; otherwise their answer. */
    oppAnswer: !oppAnswer ? null : oppVisible ? oppAnswer : ('hidden' as const),
    fastest: !!myAnswer?.correct && !(oppAnswer?.correct && oppAnswer.ms < myAnswer.ms),
    score: { me: me?.score ?? 0, opp: oppScore },
    clocks: {
      me: clockFor(myAnswer),
      opp: clockFor(oppAnswer),
      meLow: !myAnswer && remaining < LOW_TIME_MS,
      oppLow: !oppAnswer && remaining < LOW_TIME_MS,
    },
    /** Seconds until the next question, during the reveal. */
    nextIn: Math.ceil(nextIn / 1000),
    result:
      match?.status === 'finished'
        ? match.winnerId === null ? 'draw' : match.winnerId === uid ? 'win' : 'loss'
        : null,
  };
}
```

### 6.5 The live match screen (simplified)

```tsx
// src/app/match/[id].tsx
import { router, useLocalSearchParams } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/confirm-modal';
import { MatchChoice } from '@/components/match/match-choice';
import { MatchResult } from '@/components/match/match-result';
import { PlayerRow } from '@/components/match/player-row';
import { QuestionStrip } from '@/components/match/question-strip';
import { CHOICE_LETTERS } from '@/data/questions';
import { useAuth } from '@/hooks/use-auth';
import { useMatch } from '@/hooks/use-match';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const m = useMatch(id, user!.uid);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Block back/swipe while the match is live; ✕ and Android back open the confirm modal.
  usePreventRemove(m.phase !== null && m.phase !== 'finished', () => setConfirmLeave(true));

  if (m.loading) return <Loading />;
  if (m.missing || !m.match || !m.question) return <NotFound />;
  if (m.phase === 'finished') return <MatchResult match={m.match} uid={user!.uid} result={m.result!} />;

  const revealed = m.phase === 'reveal' || !!m.myAnswer;
  const opp = m.oppAnswer;

  return (
    <SafeAreaView style={styles.screen}>
      {/* top bar: ✕, title, «السؤال {index+1} من {total}», score pill {m.score.me} – {m.score.opp} */}
      <QuestionStrip match={m.match} uid={user!.uid} current={m.index} revealed={revealed} />

      <PlayerRow
        player={m.opp}
        variant="opponent"
        clock={m.clocks.opp}
        low={m.clocks.oppLow}
        status={
          opp === null ? (m.phase === 'reveal' ? 'لم يُجب' : 'يفكّر…')
            : opp === 'hidden' ? 'أجاب · تظهر إجابته بعد إجابتك'
            : `اختار ${CHOICE_LETTERS[opp.choice]} · ${opp.correct ? 'صحيحة' : 'خاطئة'}`
        }
      />

      <View style={styles.body}>
        <QuestionCard question={m.question} />
        <View style={styles.grid}>
          {m.question.choices.map((text, i) => (
            <MatchChoice
              key={i}
              letter={CHOICE_LETTERS[i]}
              text={text}
              selected={m.picked === i}
              revealed={revealed}
              correct={i === m.question!.correctIndex}
              mine={m.myAnswer?.choice === i}
              opponent={opp && opp !== 'hidden' && opp.choice === i ? opp : null}
              disabled={m.phase !== 'answering'}
              onPress={() => m.pick(i)}
            />
          ))}
        </View>
        {revealed && <Feedback answer={m.myAnswer} fastest={m.fastest} question={m.question} />}
      </View>

      <PlayerRow
        player={m.me}
        variant="me"
        clock={m.clocks.me}
        low={m.clocks.meLow}
        status={m.phase === 'answering' ? 'دورك للإجابة' : 'أجبت'}
      />

      {/* bottom bar */}
      <BottomBar
        phase={m.phase}
        canConfirm={m.picked !== null}
        onConfirm={m.confirm}
        // answering → «تأكيد الإجابة», waiting → «بانتظار المنافس…», reveal → «السؤال التالي خلال {nextIn}…»
        nextIn={m.nextIn}
        last={m.index + 1 === m.total}
      />

      <ConfirmModal
        visible={confirmLeave}
        title="مغادرة المباراة؟"
        message="ستُحتسب خسارة."
        confirmLabel="مغادرة"
        cancelLabel="متابعة"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={async () => {
          setConfirmLeave(false);
          await m.leave();
          router.replace('/match');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  body: { flex: 1, minHeight: 0, gap: 10, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 10, paddingTop: 6 },
});
```

(Check the existing `ConfirmModal` props before using it. The ones above are illustrative.)

Strip tile `k`: for `k < current`, show both marks (✓/✗, or ✗ for no answer). For `k === current`, show my mark once I've answered, and the opponent's once `revealed`. For `k > current`, show «–».

### 6.6 Rematch («إعادة التحدّي»)

1. The player who taps it creates a new `mode: 'code'` match with the same preset, then sets `rematchId` on the finished match in a transaction (only if it's still `null`; otherwise they **join** the existing `rematchId` instead).
2. The other player's result screen is still listening to the old match. When `rematchId` appears, their button changes to **«{name} يطلب إعادة التحدّي — انضم»**, which calls `tryJoin` on it.
3. Both go to `/match/[rematchId]`.

### 6.7 History («آخر المباريات»)

```ts
query(
  collection(db, 'matches'),
  where('playerIds', 'array-contains', uid),
  where('status', '==', 'finished'),
  orderBy('finishedAt', 'desc'),
  limit(3),
);
```

Each row shows the opponent's initial and name, `me.score – opp.score` (LTR), and a badge: فوز `#34D399`, خسارة `#F87171`, تعادل `#CBD5E1`. «عرض الكل» is Phase 6.

---

## 7. Result screen (7c) mapping

| Design | Source |
|---|---|
| Hero «فوز! / خسارة / تعادل» + colour | `result` from `useMatch` |
| Subtitle «تفوّقت على يوسف بفارق سؤالين» | `|me.score − opp.score|`; «انسحب المنافس» when `opp.left` |
| Big score `10 – 8` | `me.score`, `opp.score` |
| Rating / XP chips | **Hidden in MVP** (§2 #7) |
| إجابات صحيحة `10 / 15` | `score / questions.length` |
| متوسط زمن الإجابة `14s` | Average `ms` over the answered questions |
| أطول سلسلة صحيحة `5` | Longest run of `answers[k].correct` over `k = 0…n−1` |
| ~~الوقت المتبقي `0:42`~~ → **«الأسرع في»** `6` | There's no time bank in lockstep. Instead, count the questions where this player was correct and faster than the opponent |
| «إعادة التحدّي» | §6.6 |
| «مباراة جديدة» | `router.replace('/match')` |
| «مراجعة الأسئلة والحلول» | Expand a list in place: question, my choice, opponent's choice, correct answer (like quick-test's result list) |
| Header «رياضيات · 5 دقائق · مصنّفة» | «متنوع · {preset.label} · ودية» |

---

## 8. Implementation phases

The work is split into **five phases**. Each one ends in something that runs, can be tested on two phones, and can be committed on its own. Each phase only builds on the ones before it. Phase 6 lists what comes after the MVP.

| Phase | Goal | Ships | Depends on |
|---|---|---|---|
| **1 · Backend & data layer** | Firestore can hold and protect a match | Rules + tests, indexes, TTL, `src/data/matches.ts` | — |
| **2 · Room code** | Two friends end up in the same match | Lobby skeleton, room-code sheet, routes, Home entry, placeholder match screen | 1 |
| **3 · Live match (lockstep)** | A full match can be played to the end | `use-match.ts`, live screen (7b), timer, reveal, advance, leave | 2 |
| **4 · Result, rematch & history** | The match ends properly | Result screen (7c), review list, rematch, «آخر المباريات» | 3 |
| **5 · Random matchmaking** | Play a stranger | `use-matchmaking.ts`, «ابدأ المباراة», searching state | 3 (4 recommended) |
| **6 · Later** | After the MVP | Ranked, subjects, bot, presence, … ([§9](#9-phase-6-later-after-the-mvp)) | 5 |

The room code comes **before** random matchmaking on purpose. It is the simplest way to put two known players into one match: there's no search race and no waiting for strangers. That lets the hardest part, the lockstep match in Phase 3, be built and tested early.

**Every phase ends with** `npx expo lint`, `npx tsc --noEmit` and a commit. The phase's "Done when" checks are run on **two clients**: an emulator or dev build plus the web build (`npx expo start --web`), signed in as two different students.

### Phase 1 · Backend & data layer ✅ (code done; deploy pending)

**Goal:** the database side is finished and tested before any screen exists.

Build:

1. **Dashboard repo** (`../azhar-exams-dashboard`):
   - Add the `matches` rules (§3.1) to `firestore.rules`.
   - Add the rules tests in `tests/` for every rule in §3.1. The important cases:
     - a player can't edit the opponent's entry
     - a player can't answer another question, answer twice, or answer late
     - advancing is refused while the question is open
     - a third user can't join
     - a forfeit can't name yourself as the winner
   - Add `firestore.indexes.json` (§3.2) and reference it in `firebase.json`.
   - Deploy the rules and indexes, and turn on the TTL policy on `matches.expireAt` in the console.
2. **App repo:** `src/data/matches.ts` (§6.2): types, `PRESETS`, `createMatch`, `tryJoin`, `joinByCode`, `cancelWaiting`, `submitAnswer`, `advance`, `leaveMatch`, `findWaiting`, `findOrCreate`. Nothing uses it yet.

Reference: §3, §4.3, §5.2, §6.2.

Not in this phase: any UI.

Done when:

- [ ] All rules tests pass against the emulator.
- [ ] Rules and both indexes are deployed (the index build shows **Enabled** in the console).
- [ ] The TTL policy on `expireAt` is active.
- [ ] `matches.ts` typechecks.

### Phase 2 · Room code: two players in one match

**Goal:** one student creates a room, a friend joins with the code, and both phones open the same match and see it update live.

Build:

1. **Routes** in `src/app/_layout.tsx`: `match/index` and `match/[id]` inside the signed-in guard (§6.1).
2. **Home entry:** a «مباراة» quick action. Guests are offered sign-in.
3. **Lobby skeleton** `src/app/match/index.tsx` (7a, idle state):
   - The header without the rating pill.
   - The three **preset cards** (§2 #5).
   - The **«تحدَّ صديقاً»** row.
   - «ابدأ المباراة», «البطولات» and «تدرّب ضد الروبوت» are hidden for now.
4. **`components/match/room-code-sheet.tsx`** (§4.2):
   - «أنشئ غرفة» → `createMatch(me, 'code', preset)`, shows the code, «مشاركة» (`Share.share`), and «جارٍ انتظار صديقك…». It listens to the match with `onSnapshot`, and when it becomes `playing` it calls `router.replace('/match/[id]')`. On close it calls `cancelWaiting`.
   - «انضم بكود» → `joinByCode`, then navigate. On failure it shows «الكود غير صحيح أو الغرفة ممتلئة».
5. **Placeholder `src/app/match/[id].tsx`:** listens to the match and shows the two names, `status`, and «السؤال {current + 1} من {total}». This is temporary; Phase 3 replaces it.

Reference: §1.1, §4.2, §6.1.

Not in this phase: playing questions, random matchmaking, results.

Done when:

- [ ] Phone A creates a room and phone B joins with the code. Both land on `/match/[id]` showing both names and `playing`.
- [ ] Closing the sheet before anyone joins deletes the match document.
- [ ] A wrong code, or a room that is already full, shows the error and doesn't navigate.
- [ ] A guest tapping «مباراة» is sent to sign in.

### Phase 3 · Live match in lockstep

**Goal:** a full match is played from the first question to the last, with both phones always on the same question.

Build:

1. **`src/hooks/use-match.ts`** (§6.4): the snapshot listener with local anchors, the 250 ms tick, the phases (answering → waiting → reveal), `confirm`, and `advance` after the reveal, with a retry if the rules reject it as too early.
2. **Live screen** `src/app/match/[id].tsx` (§6.5), replacing the placeholder, with these components:
   - `player-row.tsx` + `match-clock.tsx`: shared countdown, frozen once answered, red in the last 5 s
   - `match-choice.tsx`: 2×2 grid, correct/wrong colours, me/opponent badges
   - `question-strip.tsx` and `score-pill.tsx`
   - the feedback bar («إجابة صحيحة · الأسرع» / «إجابة خاطئة · الإجابة الصحيحة …»)
   - the bottom bar with its three states: «تأكيد الإجابة», «بانتظار المنافس…», «السؤال التالي خلال ٢…»
3. **Leaving:** ✕, Android back and swipe go through `usePreventRemove` and `ConfirmModal`, then `leaveMatch` (forfeit).
4. **Minimal end state:** when `status` is `finished`, show a simple card, «انتهت المباراة · 3 – 2 · فوز», with «العودة». Phase 4 replaces it with the real result screen.

Reference: §1.2, §5, §6.4, §6.5.

Not in this phase: the 7c result screen, rematch, history, random matchmaking.

Done when:

- [ ] Both answer quickly: the reveal starts right away, and both phones move to the next question within about a second of each other.
- [ ] One player answers and the other lets the timer run out. The question ends on time and the missing answer counts as wrong.
- [ ] **Neither** player answers: the match still moves on.
- [ ] The opponent's choice stays hidden («أجاب · تظهر إجابته بعد إجابتك») until I answer.
- [ ] Leaving mid-match: the leaver returns to the lobby and the other phone shows the end card with a win.
- [ ] Killing one app mid-match: the other phone keeps going on timeouts to the end.
- [ ] Airplane mode for 5 s while answering: the late answer is rejected and rolled back, and the match continues.
- [ ] After the last question, both phones show the same final score.

### Phase 4 · Result, rematch & history

**Goal:** the match ends the way the design shows, and players can play again.

Build:

1. **`components/match/match-result.tsx`** (7c, mapping in §7):
   - the hero (فوز / خسارة / تعادل, or «انسحب المنافس»), the big score and the stats table
   - the rating and XP chips hidden
   - «مباراة جديدة»
   - «مراجعة الأسئلة والحلول»: each question, both players' choices and the correct answer
2. **Rematch** (§6.6): «إعادة التحدّي» creates a code match and sets `rematchId`. The other phone sees «… يطلب إعادة التحدّي — انضم».
3. **«آخر المباريات»** in the lobby (§6.7): the last 3 finished matches.

Reference: §1.3, §6.6, §6.7, §7.

Done when:

- [ ] Win, loss, draw and «انسحب المنافس» all render with the right numbers on both phones.
- [ ] Rematch: A taps «إعادة التحدّي», B sees the invite and joins, and both start a new match. If both tap at once, they still end up in **one** match.
- [ ] The lobby lists the finished matches with the right score and badge.

### Phase 5 · Random matchmaking

**Goal:** «ابدأ المباراة» finds a stranger with the same preset.

Build:

1. **`src/hooks/use-matchmaking.ts`** (§6.3): join the oldest waiting match or create one, the 4 s race fix, cancel and unmount cleanup.
2. **Lobby:** show «ابدأ المباراة» and the **searching state** (7a): you vs «؟», spinner, summary «متنوع · 5 أسئلة · ودية», elapsed time, «إلغاء البحث». After 60 s show «لا يوجد منافسون الآن» with «استمر في البحث» / «تحدَّ صديقاً».
3. On `found`, call `router.replace('/match/[id]')`. The live match from Phase 3 is reused as is.

Reference: §4.1, §6.3.

Done when:

- [ ] A searches, then B searches with the same preset, and they are matched.
- [ ] A and B tap «ابدأ المباراة» in the same second and still end up in **one** match, with no waiting document left behind.
- [ ] Different presets don't match each other.
- [ ] «إلغاء البحث», or leaving the lobby, deletes the waiting document.
- [ ] After 60 s alone, the fallback appears.

### Cost per match (5 questions)

- **Writes:** ~3 per question (2 answers + 1 advance) plus create and join, about **17** in all.
- **Reads:**
  - ~20 to pick questions (the whole bank)
  - ~2 per question for the advance transactions, since both phones try
  - each write reaches both listeners, about 2 × 17
  - **≈ 65** in all

That's under **~90 operations per 5-question match**, well inside the free tier for an MVP.

---

## 9. Phase 6: later, after the MVP

- **Ranked matches and Elo rating** (`users/{uid}.rating`, `+12 → 1,252`), XP and **«البطولات»**. These need a **Cloud Function**: a callable `submitMatchAnswer` grades against a server-only copy of `correctIndex` (`matches/{id}/private/key`), writes scores, and settles the rating when the match finishes. The bank itself would also need to stop being world-readable, or ranked matches would draw from a hidden pool.
- **Speed points** («+10 الأسرع / +5»): easy to add in lockstep, since both answers to each question carry `ms`. Grade them on the server once matches are ranked.
- **Subjects** (`queueKey = subjectId:preset`), filtered by the student's grade and section.
- **Bot practice**: an on-device opponent with a random delay and accuracy, reusing the live screen through a fake `useMatch` source.
- **Deep links** for room codes, and push notifications for «صديقك تحدّاك».
- **Presence** (`onDisconnect` needs Realtime Database, not Firestore) to show «انقطع اتصال المنافس» instead of only timing out.
- A scheduled function that closes matches abandoned by both players.
- «خيارات» and «تفاعل» (reactions/emojis) from the 7b bottom bar.
