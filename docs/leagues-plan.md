# خطة الأوائل: Weekly Leaderboard («الأوائل» tab)

This plan adds a **weekly leaderboard** as a new bottom tab, **«الأوائل»**. It ranks students by the **XP they earned from matches this week**. It shows the top three as medal cards, the rest as a list, and **my own rank** in a bar pinned to the bottom. The «تحدَّ» button on each row lets a student challenge that player directly.

| Screen | Design | Route |
|---|---|---|
| **5 · Leagues**: «الأوائل», this week's top players and my rank | [`design/5 · Leagues-html/Leagues.dc.html`](<design/5 · Leagues-html/Leagues.dc.html>) | `src/app/(tabs)/leagues.tsx` (new tab) |

Status: **Phases 1–3 code done** (2026-11-05). Phase 1: weekly XP, rules, rules tests and the index. Phase 2: the «الأوائل» tab. Phase 3: «تحدَّ» challenges. Deploying the rules and both indexes is still pending (§6).

The work is split into **three phases**. Each one can be built, tested and committed on its own (see [§6](#6-implementation-phases)):

1. **Weekly XP:** `weekId` / `weekXp` on `ratings/{uid}`, rules, rules tests, the index
2. **The «الأوائل» tab:** the screen, my-rank bar and the empty, guest, loading and error states. It replaces `/match/leaderboard`.
3. **«تحدَّ» (challenge a player):** an in-app invite that opens a room for both players

Stack: **Firebase JS SDK v13** (`firebase/firestore`, including `getCountFromServer`). The project stays on the **Spark plan**, so there are no Cloud Functions, scheduled jobs or push notifications. Firestore rules and indexes live in **`../azhar-exams-dashboard`** (`firestore.rules`, `firestore.indexes.json`, `tests/`).

Builds on [`match-plan.md`](match-plan.md) §9.1, which defines ratings, XP and `ratings/{uid}`, and on [`profile-photo-plan.md`](profile-photo-plan.md), which provides `<Avatar>`.

---

## 1. What the design shows

### 1.1 Header

- Title **«الأوائل»** (24px, 800). The tab is labelled **«الأوائل»** too, with the trophy icon. The design labels it «الدوريات»; renamed on 2026-11-05 to match the screen.
- A single selected pill, **«هذا الأسبوع»** (h36, radius 999, `#4F46E5`, white, 14px 700), inside a `tablist` labelled «الفترة».
- On the other side: a clock icon (15px) and **«ينتهي خلال 3 أيام»** (13px, `#94A3B8`).

### 1.2 Top three («المراكز الثلاثة الأولى»)

Three cards with a gap of 8. Each card is min-height 68, radius 16, padding `0 12`, gap 12, with a tinted background and border per medal:

| Rank | Medal | Tint | Border | `aria-label` |
|---|---|---|---|---|
| 1 | `#FBBF24` | `rgba(251,191,36,0.10)` | `rgba(251,191,36,0.35)` | «المركز الأول، ذهبي» |
| 2 | `#CBD5E1` | `rgba(203,213,225,0.08)` | `rgba(203,213,225,0.28)` | «المركز الثاني، فضي» |
| 3 | `#D97706` | `rgba(217,119,6,0.10)` | `rgba(217,119,6,0.35)` | «المركز الثالث، برونزي» |

Each card contains:

- a **medal disc** (32×32, the medal colour, rank in `#0F172A`, 15px 800)
- a **44px avatar** (`#334155`, initial 18px 800)
- the **name** (16px 800, one line with an ellipsis)
- the **XP** in the medal colour (`2,780 XP`, 15px 800, `dir="ltr"`)

The top three have **no** challenge button.

### 1.3 The rest («باقي الترتيب»)

Rows with min-height 60 and a 1px `#1E293B` bottom border. Each row contains:

- the **rank** (width 32, centred, 15px 700, `#94A3B8`)
- a **40px avatar** (`#1E293B`, 1px `#334155` border, 16px 700)
- the **name** (15px 600, ellipsis)
- the **XP** (14px 700, `#CBD5E1`, `dir="ltr"`)
- a **challenge button** (44×44, radius 12, `#A5B4FC` sword icon, `aria-label` «تحدَّ {name}»)

### 1.4 My rank (pinned above the tab bar)

A bar with padding `10 16`, background `#0F172A` and top border `#1E293B`. It contains a card (min-height 60, radius 16, `#312E81`, 1px `#6366F1`) with:

- **`#128`** (16px 800, `#C7D2FE`, `ltr`)
- a 1×24 divider in `#4F46E5`
- a **36px avatar** (`#4F46E5`, white initial)
- **«أنت»** (16px 800)
- **`940 XP`** (15px 800, `#FBBF24`, `ltr`)

### 1.5 Tab bar

The design's tabs, from the start (right) side: الرئيسية · **الدوريات** · اختباراتي · حسابي. Today the app has الرئيسية · الامتحانات · حسابي. **The tab goes in second place, labelled «الأوائل».** «الامتحانات» keeps its name; renaming it to «اختباراتي» is out of scope.

---

## 2. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | **What is ranked?** | **XP earned from matches this week**, the same XP `settleMatch` already gives: win 60, draw 35, loss 20, and 0 for leaving early. Ranked and friendly matches both count. Bot matches don't, because they're never saved. The match **rating** (Elo) stays the number shown in the lobby. It's no longer a leaderboard of its own (§2 #9). |
| 2 | **What is "a week"?** | **Saturday 00:00 to Friday 23:59 Cairo time.** The Egyptian school week starts on Saturday. Cairo time is taken as a **fixed UTC+2**: the rules can't follow daylight saving, so in summer the week turns over at 01:00 local time. That's acceptable. `weekId = floor((ms − 165 600 000) / 604 800 000)`, where `165 600 000` ms is Saturday 3 Jan 1970 00:00 UTC+2. The same formula lives in `src/utils/week.ts` and in the rules (§3.2). |
| 3 | **How is weekly XP stored without a scheduled reset?** | **Two new fields on `ratings/{uid}`: `weekId` and `weekXp`.** `settleMatch` already writes this document in a transaction after every match. If the stored `weekId` is the current week it adds to `weekXp`. Otherwise it **starts again** with this match's XP. Old weeks never need clearing: the query asks only for `weekId == current`. Spark-friendly: no Functions and no TTL. |
| 4 | **How do the rules keep weekly XP honest?** | They tie it to the total XP the rules already bound. The weekly change must **equal the total change** (`weekXp − old.weekXp == xp − old.xp`), or, when the week turns over, `weekXp == xp − old.xp`. `weekId` must be the server's current week. One week earlier is also accepted, for phones whose clock is slightly behind at the boundary. `weekId` never goes backwards. Faking weekly XP is therefore as hard as faking total XP, which the rules already limit to +100 per settled match. |
| 5 | **Players who haven't played since this ships** | Their `ratings` document has no `weekId`, so they don't appear in this week's list until their next match. That's correct, since they have 0 XP this week. The rules read the old value as `resource.data.get('weekId', -1)`. No migration is needed. |
| 6 | **How many rows?** | **The top 50**, live (`onSnapshot`): `where('weekId','==',w)`, `orderBy('weekXp','desc')`, `limit(50)`. Needs a composite index on `ratings` (`weekId ASC, weekXp DESC`). |
| 7 | **My rank (#128)** | `getCountFromServer(where weekId == w, where weekXp > myWeekXp) + 1`, using the same index. Count queries are cheap (about one read per 1,000 entries). It's fetched when the tab gains focus and after my `weekXp` changes, **not live**. Players with equal XP share a rank (standard «1, 2, 2, 4» ranking), and the list uses the same rule, so a row and my bar never disagree. If I have no XP this week, the bar shows **«—»** with **«العب مباراة لتظهر في الترتيب»** and an «العب الآن» link to `/match`. |
| 8 | **Guests** | `ratings` is readable only when signed in. Guests see the header and a card in place of the list: **«سجّل الدخول لتظهر في ترتيب الدوريات»** with the sign-in button (same wording as 6 · Profile's guest card). There's no my-rank bar. |
| 9 | **The existing `/match/leaderboard`** (all-time, by rating) | **Replaced.** The lobby's leaderboard button opens the new tab (`router.navigate('/leagues')`). `src/app/match/leaderboard.tsx` becomes a `<Redirect href="/leagues" />`, so old links still work, and its screen registration in `_layout.tsx` is removed. A second **«كل الأوقات»** pill (all-time `xp`) is left for later (§7). |
| 10 | **Avatars** | `<Avatar uid>` on every row: up to 50 small `avatars/{uid}` reads the first time per session, then cached. If that becomes costly, the fix noted in `profile-photo-plan.md` §6 still applies: copy a `photoUrl` into `ratings/{uid}` when a match is settled. |
| 11 | **Numbers** | As in the design: **Western digits** with thousands separators for XP and ranks (`2,780 XP`, `#128`), via `toLocaleString('en-US')` and `writingDirection: 'ltr'`. The old leaderboard used Arabic-Indic digits for ranks; the design wins. |
| 12 | **«ينتهي خلال …»** | Counted down to the next Saturday 00:00 (UTC+2) on the device clock. It shows «ينتهي خلال N أيام» (or «يومين» / «يوم واحد»), then «خلال N ساعات», then «خلال أقل من ساعة». It updates every minute while the tab is focused. When the week turns over while the screen is open, the list re-queries with the new `weekId`. |
| 13 | **My row inside the list** | Highlighted like the old leaderboard (`primarySoft` background, `primaryBright` border), and its name is followed by «(أنت)». The pinned bar is always shown, even when I'm in the top 50, as in the design. |
| 14 | **«تحدَّ» (challenge)** | **Phase 3**, as an **in-app invite**. Without Cloud Functions there are no push notifications, so the invite only reaches a player **who has the app open**, and it **expires after 2 minutes**. Until Phase 3 ships, the button isn't shown. See §5. |
| 15 | **Home's «الدوري الحالي» card** (badge «قريباً») | It drops «قريباً» and opens the «الأوائل» tab. The «الدوريات والمسابقات» announcement in `src/data/announcements.ts` stays as it is; those are tournaments, a different feature. |

---

## 3. Data model & backend

### 3.1 `ratings/{uid}`: two new fields

```ts
// src/data/ratings.ts
export type PlayerRating = {
  uid: string;
  name: string;
  rating: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  /** Week this player last earned XP in (src/utils/week.ts); missing before leagues shipped. */
  weekId?: number;
  /** XP earned in `weekId`. */
  weekXp?: number;
};
```

`settleMatch` changes, inside the existing transaction:

```ts
const week = currentWeekId();
const sameWeek = current?.weekId === week;
tx.set(myRef, {
  /* …existing fields… */
  weekId: week,
  weekXp: (sameWeek ? (current?.weekXp ?? 0) : 0) + xp,
});
```

New functions:

```ts
// src/utils/week.ts — must match firestore.rules' currentWeek()
export const WEEK_MS = 604_800_000;
const WEEK_ZERO_MS = 165_600_000; // Sat 3 Jan 1970 00:00 UTC+2
export function weekIdAt(ms: number): number;
export function currentWeekId(): number;
export function weekEndsAt(weekId: number): number; // ms of the next Saturday 00:00 UTC+2

// src/data/ratings.ts
export function weeklyLeaderboardQuery(weekId: number, count = 50): Query;
export async function weeklyRank(weekId: number, weekXp: number): Promise<number>; // count(weekXp > mine) + 1

// src/hooks/use-ratings.ts
export function useWeeklyLeaderboard(): { players: PlayerRating[]; status: 'loading' | 'ready' | 'error'; weekId: number };
export function useMyWeeklyRank(uid: string | null): { rank: number | null; weekXp: number; loading: boolean };
```

### 3.2 Rules (in `../azhar-exams-dashboard/firestore.rules`)

```
// Weekly leagues (azhar-exams app: docs/leagues-plan.md). Weeks start Saturday 00:00 UTC+2;
// must match src/utils/week.ts in the app.
function currentWeek() {
  return math.floor((request.time.toMillis() - 165600000) / 604800000);
}

function validWeek(r) {
  let oldWeek = resource == null ? -1 : resource.data.get('weekId', -1);
  let oldWeekXp = resource == null ? 0 : resource.data.get('weekXp', 0);
  let oldXp = resource == null ? 0 : resource.data.xp;
  let gained = r.xp - oldXp;
  return r.weekId is int && r.weekXp is int
    && (r.weekId == currentWeek() || r.weekId == currentWeek() - 1)
    && r.weekId >= oldWeek
    && r.weekXp == (r.weekId == oldWeek ? oldWeekXp : 0) + gained;
}
```

- **`validRatingShape`:** add `'weekId', 'weekXp'` to `hasOnly`.
- **`ratings/{uid}` create and update:** add `&& validWeek(request.resource.data)`.
- **Old documents:** the existing bounds on `xp` (+0…100 per match) stay. They now bound `weekXp` too.

Rules tests (`tests/ratings-week.test.js`, or added to `tests/matches.test.js`, where the rating setup already lives):

- **First match:** `weekId = current` and `weekXp == xp` → allowed.
- **Same week:** `weekXp` grows by exactly the `xp` gain → allowed. Any other amount → denied.
- **New week:** `weekXp == gain` → allowed. Carrying last week's `weekXp` over → denied.
- **Bad week ids:**
  - `weekId` in the future → denied.
  - two weeks back → denied.
  - lower than the stored one → denied.
- **An old document without `weekId`/`weekXp`:** it can be updated into the current week.
- **Reads:** a signed-in user can read and count the weekly query; a signed-out user can't.

### 3.3 Index (`../azhar-exams-dashboard/firestore.indexes.json`)

```json
{
  "collectionGroup": "ratings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "weekId", "order": "ASCENDING" },
    { "fieldPath": "weekXp", "order": "DESCENDING" }
  ]
}
```

Deploy it with `firebase deploy --only firestore:indexes` **before** the app ships. Until the index is built, the query fails and the screen shows its error state.

---

## 4. Screen & components

| File | What |
|---|---|
| `src/app/(tabs)/leagues.tsx` | **New tab screen.** It has a header, a scrolling list (top three + rows) and the pinned my-rank bar, plus loading, error, empty and guest states. The content is limited to a `maxWidth: 480` column, like the other tabs. |
| `src/app/(tabs)/_layout.tsx` | Add `<Tabs.Screen name="leagues" options={tabOptions('الأوائل', TrophyIcon)} />` second. Remove the "waits for the leagues feature" comment. |
| `src/components/leagues/podium-card.tsx` | **New.** A top-three card (§1.2). The medal colours come from a `MEDALS` constant. |
| `src/components/leagues/rank-row.tsx` | **New.** A row for rank 4 and below (§1.3), with an optional challenge button (Phase 3). |
| `src/components/leagues/my-rank-bar.tsx` | **New.** The pinned bar (§1.4), including the «—» / «العب مباراة لتظهر في الترتيب» state. |
| `src/components/leagues/week-countdown.tsx` | **New.** The clock icon and «ينتهي خلال …» (§2 #12). |
| `src/components/icons.tsx` | Add `SwordIcon` (the design's single sword) for the challenge button. `TrophyIcon` and `ClockIcon` already exist. |
| `src/utils/week.ts` | **New** (§3.1). |
| `src/data/ratings.ts`, `src/hooks/use-ratings.ts` | Weekly fields, query, rank and hooks (§3.1). Remove `leaderboardQuery` / `useLeaderboard` once nothing uses them. |
| `src/app/match/leaderboard.tsx` | Becomes `<Redirect href="/leagues" />` (§2 #9). |
| `src/app/match/index.tsx` | The leaderboard button navigates to `/leagues`. |
| `src/app/(tabs)/index.tsx` | «الدوري الحالي» opens `/leagues` and loses «قريباً» (§2 #15). |

Layout notes:

- **RTL:** the rank comes first in each row, so it sits on the right, as in the design. XP and `#128` use `writingDirection: 'ltr'`. Like the profile email, they stay where the flex row puts them; there's no `textAlign`.
- **Pinned bar:** the bar sits **outside** the `ScrollView`, between it and the tab bar. The list gets enough bottom padding for its last row to scroll clear of the bar.
- **Accessibility:**
  - Each top card is one `accessible` element labelled «المركز الأول، ذهبي، يوسف خالد، 2,780 نقطة خبرة». Rows are labelled the same way.
  - The challenge button has its own label, «تحدَّ {name}».
  - The bar is labelled «ترتيبك 128، 940 نقطة خبرة».
  - The «هذا الأسبوع» pill is `accessibilityRole="tab"` with `selected`.
- **Pull to refresh:** `RefreshControl` re-fetches my rank. The list is already live.

---

## 5. «تحدَّ»: challenge a player (Phase 3)

The flow is built on existing pieces: the **room code** matches (`createMatch(me, 'room', …)` and `joinByCode`) and the room links (`/join/[code]`).

1. **Sending the challenge.** I tap «تحدَّ سارة». The app creates a room match (default preset, «متنوع») and a document `challenges/{id}`:
   ```ts
   { from: myUid, fromName, to: theirUid, matchId, code, createdAt: serverTimestamp(), status: 'pending' }
   ```
   I go to the room's waiting screen, which already exists for «تحدَّ صديقاً», with «في انتظار سارة…» and a cancel button.
2. **Receiving it.** Every signed-in app listens for `challenges where to == me, status == 'pending'`. The listener is mounted once in the root layout and ignores invites older than 2 minutes. An incoming invite shows a **banner** over any screen: «يتحداك أحمد في مباراة» with **«قبول»** and **«رفض»**.
3. **Accepting.** «قبول» marks the challenge `accepted` and joins with `joinByCode(code)`. Both players are now in the match, and the existing lockstep flow takes over.
4. **Declining, timing out or cancelling.**
   - «رفض» → the status becomes `declined`, and I see «رفض سارة التحدي».
   - No answer within 2 minutes → my screen offers «شارك رابط الغرفة» (the existing share) or cancel.
   - Cancelling deletes the room (`cancelWaiting`) and marks the challenge `cancelled`.
5. **Rules** (`challenges/{id}`):
   - Only the sender can create a challenge, with `from == auth.uid`, `status == 'pending'` and a server `createdAt`.
   - Only the sender and the receiver can read it.
   - The receiver may only set `status` to `accepted` or `declined`.
   - The sender may only set it to `cancelled`.
   - Nobody can delete it.
   - **One pending challenge per pair** is enforced in the app, not in the rules.
6. **Limits:**
   - **No push notifications.** That needs FCM sent from a Cloud Function, which needs the Blaze plan.
   - The receiver must have the app open.
   - Old challenge documents stay. They're tiny. A later cleanup can delete the old ones.

---

## 6. Implementation phases

### Phase 1 · Weekly XP (backend & data) ✅ (code done; deploy pending)

Done: `src/utils/week.ts`, the `weekId`/`weekXp` fields and `weekXpIn` / `weeklyLeaderboardQuery` / `weeklyRank` in `src/data/ratings.ts`, `useWeeklyLeaderboard` / `useMyWeeklyRank` in `src/hooks/use-ratings.ts`, and in the dashboard: `validWeek` in `firestore.rules`, 8 new tests in `tests/matches.test.js` (65/65 pass) and the `ratings (weekId, weekXp DESC)` index. Changes from §3:

- **The weekly fields are optional in the rules.** Apps installed before leagues don't send them and must still be able to settle. A settlement without them is accepted, which drops that player from this week's board until their next settlement from a new app.
- **The week comes from the match's `finishedAt` (server time), not the phone's clock.** A phone whose clock runs ahead would otherwise file the XP under a week the rules haven't reached, and the whole settlement would be refused. The app falls back to this week for matches settled over a week late, and never uses a week earlier than the stored one, since the rules don't let it go backwards.
- **Deploy order matters:** deploy the rules **before** any app build with this code. The old rules' `hasOnly` rejects `weekId`/`weekXp`, so a new app talking to old rules can't settle matches.


1. `src/utils/week.ts`, with a few unit checks in a comment or a test:
   - Friday 23:59 and Saturday 00:00 (UTC+2) fall in different weeks.
   - `weekEndsAt` is a Saturday 00:00.
2. `settleMatch` writes `weekId` / `weekXp`. Add `PlayerRating` fields, `weeklyLeaderboardQuery` and `weeklyRank`.
3. In the dashboard: the rules (§3.2), the rules tests and the index (§3.3). Run `npm run test:rules`.
4. Deploy the rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`. Wait for the index to finish building (Firebase console → Firestore → Indexes).
5. **Check:**
   - Play a match. `ratings/{me}` now has `weekId` and `weekXp` equal to that match's XP.
   - Play another. `weekXp` grows by the new XP.
   - An old account updates cleanly on its first match.

### Phase 2 · The «الأوائل» tab ✅ (code done; needs the index deployed and two-phone checks)

Done:
- **The tab:** `src/app/(tabs)/leagues.tsx` (second tab, trophy icon), plus `src/components/leagues/` (`podium-card`, `rank-row`, `my-rank-bar`, `week-countdown`).
- **Old leaderboard:** `/match/leaderboard` is now a redirect and is gone from the root stack. The old `leaderboardQuery` / `useLeaderboard` are removed.
- **Links:** the lobby row is renamed «الأوائل» and opens the tab, and Home's «الدوري الحالي» opens it too.

Changes from §4:
- **No pull-to-refresh.** The list is live, and my rank is counted again whenever the tab regains focus and whenever my weekly XP changes.
- **The unranked bar** (no XP this week) is a button that opens `/match`.
- **My row** is highlighted in the podium as well as in the list.


1. `leagues.tsx` and the components in §4, the tab in `_layout.tsx`, the redirect from `/match/leaderboard`, and the lobby button and Home card changes.
2. States:
   - loading (spinner)
   - error («تعذّر التحميل، تحقق من اتصالك بالإنترنت.»)
   - empty week («لم يلعب أحد هذا الأسبوع بعد. العب مباراة لتتصدّر!»)
   - guest card
   - fewer than three players: show only the podium cards that exist, with no list
3. **Check:**
   - With two accounts on two phones, play a match. Both appear, ordered by weekly XP. Each phone's bar shows the right `#rank` and XP.
   - Equal XP shows the same rank.
   - Over 50 players (or `count` temporarily set to 3): my bar still shows my real rank.
   - The countdown text is right.
   - On Android, iOS and web, the RTL order matches the design, and the list scrolls clear of the bar.

### Phase 3 · «تحدَّ» ✅ (code done; needs the rules and index deployed and two-phone checks)

Done:
- **Dashboard:** `challenges/{id}` rules, `tests/challenges.test.js` (70/70 pass with the rest) and the index `challenges (to, status, createdAt)`.
- **Data and hooks:** `src/data/challenges.ts` (`sendChallenge`, `answerChallenge`, `cancelChallenge`, `incomingChallengesQuery`) and `src/hooks/use-challenges.ts` (`useIncomingChallenge`, `useSentChallenge`).
- **Receiver:** `ChallengeBanner`, mounted in the root layout.
- **Sender:** `ChallengeWaiting`, shown by the match screen while the room waits.
- **The button:** «تحدَّ» on `RankRow`.
- **Sharing:** `shareRoom` moved to `src/lib/share-room.ts`, now shared with «تحدَّ صديقاً».

Changes from §5:
- **The rules also check the room:** it must be mine, still waiting, and the challenge's code must be the room's code. A challenge can't point at someone else's room.
- **Accepting joins first, then marks the challenge `accepted`.** If the room is gone, taken or expired, the receiver sees why, and the challenge is marked `declined` so it disappears.
- **Challenges are quick games:** the `short` preset, «متنوع», friendly.
- **The banner is hidden** on the match lobby, live matches, the quick test and the photo cropper. On the lobby, accepting would leave a random search running underneath. It appears once the student leaves those screens, if the invite hasn't lapsed.
- **Who can challenge:** the button needs a profile, and isn't shown on my own row. The top three have none, as in the design.


1. `challenges` rules and tests in the dashboard. Deploy them.
2. `src/data/challenges.ts` (`sendChallenge`, `answerChallenge`, `cancelChallenge`), a root-level `useIncomingChallenges` with the banner, and the challenge button on `RankRow`.
3. **Check with two phones:**
   - Challenge → banner → accept → both are in the same match.
   - Decline, the 2-minute timeout, and the sender cancelling.
   - A challenge to a player whose app is closed expires quietly.

### Cost

- **Opening the tab:** 1 query of up to 50 documents, then live updates; 1 count query (about 1 read); up to 50 cached avatar reads the first time in a session.
- **Settling a match:** unchanged. It's the same single `ratings` write, now with two extra fields.
- **A challenge:** 1 match plus 1 challenge document, and a couple of updates.

---

## 7. Later

- A **«كل الأوقات»** pill: all-time `xp`, needs an index on `xp DESC`.
- **Grade/section leagues** (only students in my grade): add `gradeId` to `ratings` and an index `(gradeId, weekId, weekXp)`.
- **Last week's winners**, shown when the new week starts, and badges for the top three.
- **Push notifications** for challenges and «you dropped to #5», once the project is on Blaze.
- **XP from exams and quick tests** («اختبار سريع»), so the league isn't matches-only.
