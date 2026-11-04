import { useCallback, useEffect, useRef, useState } from 'react';

import type { MatchSource } from '@/data/match-source';
import { bothAnswered, opponentId, type Match, type MatchAnswer, type MatchPlayer } from '@/data/matches';

/** How long both players see the answers before the next question. */
const REVEAL_MS = 2500;
/** The clock boxes turn red below this. */
const LOW_TIME_MS = 5000;
/** A first snapshot whose question started longer ago than this is a restart mid-question. */
const RESUME_AFTER_MS = 3000;
/** Wait before trying an advance again that the rules refused (e.g. "too early"). */
const RETRY_MS = 1000;
/** Presence (docs/match-plan.md §9): my heartbeat, and when a silent opponent counts as gone. */
const HEARTBEAT_MS = 10_000;
const AWAY_AFTER_MS = 25_000;
/** The rules allow claiming the win after 45 s of silence (server time); a margin for latency. */
const CLAIM_AFTER_MS = 50_000;
/** How long a reaction bubble stays up. */
const REACTION_MS = 3000;

/**
 * The match plus this phone's own times (docs/match-plan.md §5.3):
 * shownAt = when the current question appeared here, bothAt = when this phone saw both answers,
 * oppHeardAt = when the opponent's heartbeat last changed, reactions = when each player's
 * current reaction appeared. All local clock, so the phones' clocks never need to agree.
 */
type Live = {
  match: Match;
  shownAt: number;
  bothAt: number | null;
  oppHeardAt: number;
  reactions: Record<string, { emoji: number; key: string; shownAt: number }>;
};

type Feed = { sourceId: string; live: Live | null; problem: 'missing' | 'error' | null };

export type MatchPhase = 'waiting-start' | 'answering' | 'waiting' | 'reveal' | 'finished';

/** The opponent's answer to the current question: null = none yet, 'hidden' = answered, not shown yet. */
export type OpponentAnswer = MatchAnswer | 'hidden' | null;

/**
 * Identifies a reaction. My own write first shows `at: null` (server time pending) and then the
 * real time; both are the same reaction, so a pending key is matched by its emoji alone.
 */
function reactionKey(reaction: NonNullable<MatchPlayer['reaction']>) {
  return `${reaction.emoji}:${reaction.at?.toMillis() ?? 'pending'}`;
}

/** A live 1v1 match in lockstep: both phones are always on `match.current`. */
export function useMatch(source: MatchSource, uid: string) {
  const [feed, setFeed] = useState<Feed | null>(null);
  // Picked but not confirmed yet; tied to its question so it's dropped when the question changes.
  const [picked, setPicked] = useState<{ index: number; choice: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The question an advance was sent for, and when a refused one may be sent again.
  const advancedFrom = useRef(-1);
  const retryAt = useRef(0);

  useEffect(() => {
    let previous: Live | null = null;
    return source.subscribe(
      (match) => {
        if (!match) {
          previous = null;
          setFeed({ sourceId: source.id, live: null, problem: 'missing' });
          return;
        }
        const at = Date.now();
        const sameQuestion =
          previous !== null && previous.match.status === match.status && previous.match.current === match.current;

        let shownAt = at;
        if (sameQuestion) shownAt = previous!.shownAt;
        else if (previous === null && match.questionStartedAt) {
          // Reopened mid-question: count from the server's start time and accept the clock skew.
          const startedAt = match.questionStartedAt.toMillis();
          if (at - startedAt > RESUME_AFTER_MS) shownAt = startedAt;
        }
        const bothAt = sameQuestion && previous!.bothAt !== null ? previous!.bothAt : bothAnswered(match) ? at : null;

        const oppId = opponentId(match, uid);
        const oppSeen = (oppId && match.players[oppId]?.seenAt?.toMillis()) || null;
        const oppSeenBefore = previous && oppId ? previous.match.players[oppId]?.seenAt?.toMillis() || null : null;
        const oppHeardAt = previous && oppSeen === oppSeenBefore ? previous.oppHeardAt : at;

        const reactions: Live['reactions'] = {};
        for (const id of match.playerIds) {
          const reaction = match.players[id]?.reaction;
          if (!reaction) continue;
          const key = reactionKey(reaction);
          const before = previous?.reactions[id];
          // Reactions already there when the screen opened are old: never shown.
          if (!previous) reactions[id] = { emoji: reaction.emoji, key, shownAt: -Infinity };
          else if (before && (before.key === key || before.key === `${reaction.emoji}:pending`)) {
            reactions[id] = { ...before, key };
          } else reactions[id] = { emoji: reaction.emoji, key, shownAt: at };
        }

        previous = { match, shownAt, bothAt, oppHeardAt, reactions };
        setFeed({ sourceId: source.id, live: previous, problem: null });
      },
      () => setFeed({ sourceId: source.id, live: null, problem: 'error' }),
    );
  }, [source, uid]);

  // Ignore a feed left over from a previous match.
  const current = feed?.sourceId === source.id ? feed : null;
  const live = current?.live ?? null;
  const match = live?.match ?? null;
  const status = match?.status;

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [status]);

  // Presence: tell the opponent I'm here while the match runs.
  useEffect(() => {
    if (status !== 'playing' || source.bot) return;
    const beat = () => {
      source.heartbeat(uid).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [status, source, uid]);

  const oppId = match ? opponentId(match, uid) : null;
  const me = match?.players[uid];
  const opp = match && oppId ? match.players[oppId] : undefined;
  const index = match?.current ?? 0;
  const question = match?.questions[index];
  const myAnswer = me?.answers[index];
  const oppRaw = opp?.answers[index];

  const limitMs = (match?.secondsPerQuestion ?? 0) * 1000;
  const deadline = (live?.shownAt ?? 0) + limitMs;
  // `now` can lag behind a fresh snapshot by one tick.
  const remaining = Math.min(limitMs, Math.max(0, deadline - now));

  // The reveal starts when both answered or the time is up, whichever comes first.
  const revealStart = live ? Math.min(live.bothAt ?? Infinity, deadline) : Infinity;
  const nextInMs = Math.max(0, revealStart + REVEAL_MS - now);

  let phase: MatchPhase | null = null;
  if (match) {
    if (match.status === 'finished') phase = 'finished';
    else if (match.status === 'waiting') phase = 'waiting-start';
    else if (now >= revealStart) phase = 'reveal';
    else if (myAnswer) phase = 'waiting';
    else phase = 'answering';
  }

  // Reveal over: move both players on. Whoever comes second finds `current` moved and does nothing.
  useEffect(() => {
    if (phase !== 'reveal' || nextInMs > 0) return;
    if (advancedFrom.current === index || now < retryAt.current) return;
    advancedFrom.current = index;
    source.advance(index).catch(() => {
      advancedFrom.current = -1;
      retryAt.current = Date.now() + RETRY_MS;
    });
  }, [phase, nextInMs, index, now, source]);

  const pickedChoice = picked?.index === index ? picked.choice : null;

  const pick = useCallback(
    (choice: number) => {
      if (phase === 'answering') setPicked({ index, choice });
    },
    [phase, index],
  );

  const confirm = useCallback(() => {
    if (phase !== 'answering' || !question || pickedChoice === null || !live) return;
    const ms = Math.round(Math.min(Date.now() - live.shownAt, limitMs));
    const answer = { choice: pickedChoice, correct: pickedChoice === question.correctIndex, ms };
    // The snapshot shows the answer at once; if the rules refuse it (too late), it's rolled back.
    source.answer(uid, index, answer).catch(() => {});
  }, [phase, question, pickedChoice, live, limitMs, source, uid, index]);

  /** Forfeit. The local snapshot turns `finished` at once, even before the server confirms. */
  const leave = useCallback(async () => {
    if (status !== 'playing' || !oppId) return;
    await source.leave(uid, oppId);
  }, [status, source, uid, oppId]);

  const react = useCallback(
    (emoji: number) => {
      if (status === 'playing') source.react(uid, emoji).catch(() => {});
    },
    [status, source, uid],
  );

  const claimWin = useCallback(() => {
    if (status === 'playing') source.claimWin(uid).catch(() => {});
  }, [status, source, uid]);

  // The opponent's answer shows once I've answered or the question is over (no spoilers).
  const oppVisible = !!myAnswer || phase === 'reveal';
  const oppAnswer: OpponentAnswer = !oppRaw ? null : oppVisible ? oppRaw : 'hidden';
  // Their score counts past questions, plus the current one once it's visible.
  const oppScore = opp
    ? Object.entries(opp.answers).filter(([k, a]) => a.correct && (Number(k) < index || oppVisible)).length
    : 0;

  /** A clock box: the shared countdown, frozen at the time its player answered. */
  const clockFor = (answer: MatchAnswer | undefined) => (answer ? limitMs - answer.ms : remaining);

  const silentFor = live && status === 'playing' && !source.bot ? now - live.oppHeardAt : 0;
  const reactionFor = (id: string | null) => {
    const reaction = id ? live?.reactions[id] : undefined;
    return reaction && now - reaction.shownAt < REACTION_MS ? reaction.emoji : null;
  };

  return {
    loading: !current,
    problem: current?.problem ?? null,
    match,
    me,
    opp,
    phase,
    index,
    total: match?.questions.length ?? 0,
    question,
    picked: pickedChoice,
    pick,
    confirm,
    leave,
    react,
    claimWin,
    myAnswer,
    oppAnswer,
    oppVisible,
    /** Correct, and the opponent wasn't correct faster. Only known once they answered or the time is up. */
    fastest: !!myAnswer?.correct && (!!oppRaw || phase === 'reveal') && !(oppRaw?.correct && oppRaw.ms < myAnswer.ms),
    score: { me: me?.score ?? 0, opp: oppScore },
    clocks: {
      me: clockFor(myAnswer),
      opp: clockFor(oppRaw),
      meLow: !myAnswer && remaining < LOW_TIME_MS,
      oppLow: !oppRaw && remaining < LOW_TIME_MS,
    },
    /** Whole seconds until the next question, during the reveal. */
    nextIn: Math.ceil(nextInMs / 1000),
    /** No heartbeat from the opponent for a while; after `canClaimWin` I may end the match. */
    oppAway: silentFor > AWAY_AFTER_MS,
    canClaimWin: silentFor > CLAIM_AFTER_MS,
    /** The emoji (REACTIONS index) each player sent in the last few seconds, or null. */
    reactions: { me: reactionFor(uid), opp: reactionFor(oppId) },
    oppId,
  };
}
