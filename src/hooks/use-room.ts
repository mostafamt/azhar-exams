import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cancelWaiting,
  createMatch,
  joinByCode,
  toMatch,
  type JoinResult,
  type MatchSubject,
  type Me,
  type PresetId,
} from '@/data/matches';
import { db } from '@/lib/firebase';

export type RoomState =
  | { status: 'idle' }
  | { status: 'creating' }
  /** My room is open and waiting for a friend. */
  | { status: 'hosting'; matchId: string; code: string }
  | { status: 'joining' }
  /** Both players are in: open /match/[id]. */
  | { status: 'found'; matchId: string }
  | { status: 'error'; message: string };

const OFFLINE_MESSAGE = 'تعذّر الاتصال، تحقق من اتصالك بالإنترنت.';

export const JOIN_ERRORS: Record<Extract<JoinResult, { error: string }>['error'], string> = {
  'not-found': 'لا توجد غرفة بهذا الكود، تأكد من الكود.',
  expired: 'انتهت صلاحية هذه الغرفة، اطلب من صديقك إنشاء غرفة جديدة.',
  'own-room': 'هذه غرفتك أنت. يجب أن ينضم صديقك من حساب آخر.',
  taken: 'انضم لاعب آخر إلى هذه الغرفة بالفعل.',
};

/** «تحدَّ صديقاً»: open a room with a code, or join one (docs/match-plan.md §4.2). */
export function useRoom(me: Me | null) {
  const [room, setRoom] = useState<RoomState>({ status: 'idle' });
  // The room I'm hosting, deleted again if I close it before a friend joins.
  const hosting = useRef<{ matchId: string; stop: () => void } | null>(null);
  // Bumped by reset/unmount, so a createMatch that finishes afterwards cleans up after itself.
  const attempt = useRef(0);

  const closeRoom = useCallback(() => {
    const current = hosting.current;
    hosting.current = null;
    if (!current) return;
    current.stop();
    cancelWaiting(current.matchId).catch(() => {});
  }, []);

  const create = useCallback(
    async (preset: PresetId, subject: MatchSubject = null) => {
      if (!me) return;
      closeRoom();
      const thisAttempt = ++attempt.current;
      setRoom({ status: 'creating' });

      let matchId: string;
      try {
        matchId = await createMatch(me, 'code', preset, subject);
      } catch (e) {
        if (thisAttempt !== attempt.current) return;
        const empty = e instanceof Error && e.message === 'empty-bank';
        setRoom({ status: 'error', message: empty ? 'لا توجد أسئلة لهذه المادة بعد.' : OFFLINE_MESSAGE });
        return;
      }
      if (thisAttempt !== attempt.current) {
        cancelWaiting(matchId).catch(() => {});
        return;
      }

      const unsubscribe = onSnapshot(
        doc(db, 'matches', matchId),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const match = toMatch(snapshot);
          if (match.status === 'waiting') {
            setRoom({ status: 'hosting', matchId, code: match.code ?? '' });
          } else {
            // A friend joined: it's a real match now, so it must not be deleted.
            unsubscribe();
            hosting.current = null;
            setRoom({ status: 'found', matchId });
          }
        },
        () => {
          closeRoom();
          setRoom({ status: 'error', message: OFFLINE_MESSAGE });
        },
      );
      hosting.current = { matchId, stop: unsubscribe };
    },
    [me, closeRoom],
  );

  const join = useCallback(
    async (code: string) => {
      if (!me) return;
      const thisAttempt = ++attempt.current;
      setRoom({ status: 'joining' });
      try {
        const result = await joinByCode(me, code);
        if (thisAttempt !== attempt.current) return;
        setRoom(
          'matchId' in result
            ? { status: 'found', matchId: result.matchId }
            : { status: 'error', message: JOIN_ERRORS[result.error] },
        );
      } catch (e) {
        if (__DEV__) console.warn('joinByCode failed', e);
        if (thisAttempt === attempt.current) setRoom({ status: 'error', message: OFFLINE_MESSAGE });
      }
    },
    [me],
  );

  /** Back to the start; deletes my room if nobody joined yet. */
  const reset = useCallback(() => {
    attempt.current++;
    closeRoom();
    setRoom({ status: 'idle' });
  }, [closeRoom]);

  useEffect(
    () => () => {
      attempt.current++;
      closeRoom();
    },
    [closeRoom],
  );

  return { room, create, join, reset };
}
