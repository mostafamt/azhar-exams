import {
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { cancelWaiting, createMatch, type Me, type PresetId } from '@/data/matches';
import { db } from '@/lib/firebase';

/**
 * challenges/{id}: «تحدَّ» on «الأوائل» (docs/leagues-plan.md §5). An in-app invite to a room match
 * the sender just opened. With no push notifications (Spark plan), it only reaches a player whose
 * app is open, and it lapses after CHALLENGE_TTL_MS. ../azhar-exams-dashboard/firestore.rules let
 * only the two players see it, the receiver accept or decline it and the sender cancel it.
 */
export type Challenge = {
  id: string;
  from: string;
  fromName: string;
  to: string;
  matchId: string;
  code: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  /** null for a moment after my own write, until the server time arrives. */
  createdAt: Timestamp | null;
};

export const CHALLENGE_TTL_MS = 2 * 60_000;
/** Challenges are quick games: the shortest preset, every subject, friendly. */
const CHALLENGE_PRESET: PresetId = 'short';

const challenges = collection(db, 'challenges');

export const challengeRef = (id: string) => doc(challenges, id);

export function toChallenge(snapshot: DocumentSnapshot): Challenge | null {
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as Omit<Challenge, 'id'>) };
}

/** When a challenge lapses, in ms; a challenge I just sent counts from now. */
export function challengeExpiresAt(challenge: Challenge) {
  return (challenge.createdAt?.toMillis() ?? Date.now()) + CHALLENGE_TTL_MS;
}

/** Opens a room and invites `to` into it. The caller then waits in /match/[id]. */
export async function sendChallenge(me: Me, to: string) {
  const matchId = await createMatch(me, 'code', CHALLENGE_PRESET);
  const code = await roomCode(matchId);
  const ref = doc(challenges);
  try {
    await setDoc(ref, {
      from: me.uid,
      fromName: me.name,
      to,
      matchId,
      code,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Nobody can join a room nobody was told about.
    await cancelWaiting(matchId).catch(() => {});
    throw error;
  }
  return { matchId, challengeId: ref.id };
}

/** The code createMatch gave the room; the challenge carries it so the receiver can join. */
async function roomCode(matchId: string) {
  const snapshot = await getDoc(doc(db, 'matches', matchId));
  const code = snapshot.data()?.code;
  if (typeof code !== 'string') throw new Error('Room has no code');
  return code;
}

/** Pending challenges to me from the last CHALLENGE_TTL_MS. */
export function incomingChallengesQuery(uid: string, since: number) {
  return query(
    challenges,
    where('to', '==', uid),
    where('status', '==', 'pending'),
    where('createdAt', '>', Timestamp.fromMillis(since))
  );
}

export function answerChallenge(id: string, accepted: boolean) {
  return updateDoc(challengeRef(id), { status: accepted ? 'accepted' : 'declined' });
}

export function cancelChallenge(id: string) {
  return updateDoc(challengeRef(id), { status: 'cancelled' });
}
