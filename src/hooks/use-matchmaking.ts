import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cancelWaiting,
  findOrCreate,
  findWaiting,
  joinOlder,
  toMatch,
  type MatchSubject,
  type Me,
  type PresetId,
} from '@/data/matches';
import { db } from '@/lib/firebase';

/** How often a waiting search looks for an older one to join (the race fix). */
const RETRY_MS = 4000;
/**
 * A search stops after this and offers «استمر في البحث». It must stay under the search window
 * in matches.ts (2 min), after which other players no longer see my waiting match.
 */
export const SEARCH_LIMIT_MS = 60_000;

const OFFLINE_MESSAGE = 'تعذّر الاتصال، تحقق من اتصالك بالإنترنت.';

export type Search =
  | { status: 'idle' }
  | { status: 'searching'; startedAt: number }
  /** Nobody came within SEARCH_LIMIT_MS; my waiting match is deleted. */
  | { status: 'timeout' }
  | { status: 'found'; matchId: string }
  | { status: 'error'; message: string };

/**
 * «ابدأ المباراة»: join the oldest waiting match with my preset and subject, or wait in my own
 * (docs/match-plan.md §4.1). These matches are ranked.
 */
export function useMatchmaking(me: Me | null) {
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  // My waiting match: deleted again on cancel, timeout or unmount, unless someone joined it.
  const own = useRef<{ matchId: string; stop: () => void } | null>(null);
  // Bumped on every start/stop, so results of an older search are ignored.
  const attempt = useRef(0);

  const stopOwn = useCallback(() => {
    const current = own.current;
    own.current = null;
    if (!current) return;
    current.stop();
    cancelWaiting(current.matchId).catch(() => {});
  }, []);

  const start = useCallback(
    async (preset: PresetId, subject: MatchSubject) => {
      if (!me) return;
      stopOwn();
      const thisAttempt = ++attempt.current;
      const startedAt = Date.now();
      setSearch({ status: 'searching', startedAt });
      const found = (matchId: string) => {
        if (thisAttempt !== attempt.current) return;
        attempt.current++;
        setSearch({ status: 'found', matchId });
      };

      let result;
      try {
        result = await findOrCreate(me, preset, subject);
      } catch (e) {
        if (__DEV__) console.warn('matchmaking failed', e);
        if (thisAttempt === attempt.current) {
          const empty = e instanceof Error && e.message === 'empty-bank';
          setSearch({ status: 'error', message: empty ? 'لا توجد أسئلة لهذه المادة بعد.' : OFFLINE_MESSAGE });
        }
        return;
      }
      const { matchId, joined } = result;
      if (joined) return found(matchId);
      if (thisAttempt !== attempt.current) {
        // Cancelled while my match was being created.
        cancelWaiting(matchId).catch(() => {});
        return;
      }

      // Server time my match was created; the race fix only joins matches older than it.
      let createdAt: Timestamp | null = null;
      let unsubscribe = () => {};

      let busy = false;
      const retry = setInterval(async () => {
        if (busy || !createdAt) return;
        busy = true;
        try {
          for (const older of await findWaiting(preset, subject, createdAt)) {
            if (thisAttempt !== attempt.current) return;
            if (older.data().hostId === me.uid) continue;
            if (await joinOlder(matchId, older.ref, me)) {
              // Mine was deleted in the same transaction.
              stop();
              own.current = null;
              return found(older.id);
            }
          }
        } catch {
          // Try again on the next round.
        } finally {
          busy = false;
        }
      }, RETRY_MS);

      const limit = setTimeout(async () => {
        if (thisAttempt !== attempt.current) return;
        stop();
        own.current = null;
        // Someone may have joined at the last moment: then it's a match, not a timeout.
        const deleted = await cancelWaiting(matchId).catch(() => true);
        if (!deleted) return found(matchId);
        if (thisAttempt !== attempt.current) return;
        attempt.current++;
        setSearch({ status: 'timeout' });
      }, SEARCH_LIMIT_MS - (Date.now() - startedAt));

      function stop() {
        unsubscribe();
        clearInterval(retry);
        clearTimeout(limit);
      }

      unsubscribe = onSnapshot(
        doc(db, 'matches', matchId),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const match = toMatch(snapshot);
          createdAt = match.createdAt;
          if (match.status === 'playing') {
            // Someone joined: it's a real match now and must not be deleted.
            stop();
            own.current = null;
            found(matchId);
          }
        },
        // Keep waiting; the race fix and the time limit still run.
        () => {},
      );
      own.current = { matchId, stop };
    },
    [me, stopOwn],
  );

  /** «إلغاء البحث», or back to idle after a timeout or an error. */
  const cancel = useCallback(() => {
    attempt.current++;
    stopOwn();
    setSearch({ status: 'idle' });
  }, [stopOwn]);

  useEffect(
    () => () => {
      attempt.current++;
      stopOwn();
    },
    [stopOwn],
  );

  return { search, start, cancel };
}
