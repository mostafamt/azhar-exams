/**
 * League weeks (docs/leagues-plan.md §2 #2): Saturday 00:00 to Friday 23:59, Cairo time taken as a
 * fixed UTC+2 (the rules can't follow daylight saving). Must match currentWeek() in
 * ../azhar-exams-dashboard/firestore.rules.
 */

export const WEEK_MS = 604_800_000;
/** Saturday 3 January 1970, 00:00 UTC+2: the start of week 0. */
const WEEK_ZERO_MS = 165_600_000;

/** The number of the league week that `ms` falls in. */
export function weekIdAt(ms: number) {
  return Math.floor((ms - WEEK_ZERO_MS) / WEEK_MS);
}

export function currentWeekId() {
  return weekIdAt(Date.now());
}

/** When `weekId` ends: the next Saturday 00:00 UTC+2, in ms. */
export function weekEndsAt(weekId: number) {
  return WEEK_ZERO_MS + (weekId + 1) * WEEK_MS;
}
