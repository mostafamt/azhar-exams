import { doc, onSnapshot } from 'firebase/firestore';

import {
  advance,
  cancelWaiting,
  claimWin,
  heartbeat,
  leaveMatch,
  sendReaction,
  submitAnswer,
  toMatch,
  type Match,
  type MatchAnswer,
} from '@/data/matches';
import { db } from '@/lib/firebase';

/**
 * Where the live match screen gets its match and sends its moves: a Firestore match
 * (firestoreSource) or a practice match against the bot on this phone (bot-match.ts).
 */
export type MatchSource = {
  id: string;
  /** Practice against the bot: nothing is saved, no rating or history. */
  bot: boolean;
  /** Calls `onMatch` with every new state (null: the match doesn't exist); returns an unsubscribe. */
  subscribe(onMatch: (match: Match | null) => void, onError: () => void): () => void;
  answer(uid: string, index: number, answer: MatchAnswer): Promise<unknown>;
  advance(from: number): Promise<unknown>;
  leave(uid: string, opponent: string): Promise<unknown>;
  heartbeat(uid: string): Promise<unknown>;
  react(uid: string, emoji: number): Promise<unknown>;
  claimWin(uid: string): Promise<unknown>;
  /** Deletes the match if it's still waiting for a second player. */
  cancelWaiting(): Promise<unknown>;
};

export function firestoreSource(matchId: string): MatchSource {
  return {
    id: matchId,
    bot: false,
    subscribe: (onMatch, onError) =>
      onSnapshot(
        doc(db, 'matches', matchId),
        (snapshot) => onMatch(snapshot.exists() ? toMatch(snapshot) : null),
        onError,
      ),
    answer: (uid, index, answer) => submitAnswer(matchId, uid, index, answer),
    advance: (from) => advance(matchId, from),
    leave: (uid, opponent) => leaveMatch(matchId, uid, opponent),
    heartbeat: (uid) => heartbeat(matchId, uid),
    react: (uid, emoji) => sendReaction(matchId, uid, emoji),
    claimWin: (uid) => claimWin(matchId, uid),
    cancelWaiting: () => cancelWaiting(matchId),
  };
}
