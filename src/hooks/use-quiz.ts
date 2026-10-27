import { useCallback, useEffect, useReducer, useState } from 'react';

import { fetchRandomQuestions, type Question } from '@/data/questions';

/** Time allowed per question. */
const MS_PER_QUESTION = 60_000;

type QuizState = {
  status: 'loading' | 'error' | 'empty' | 'running' | 'finished';
  questions: Question[];
  /** The question on screen. */
  index: number;
  /** Chosen choice per question; null when unanswered. */
  answers: (number | null)[];
  flagged: boolean[];
  startedAt: number;
  deadline: number;
  finishedAt: number;
};

type Action =
  | { type: 'load' }
  | { type: 'loaded'; questions: Question[]; at: number }
  | { type: 'failed' }
  | { type: 'select'; choice: number }
  | { type: 'toggleFlag' }
  | { type: 'go'; index: number }
  | { type: 'finish'; at: number };

const INITIAL: QuizState = {
  status: 'loading',
  questions: [],
  index: 0,
  answers: [],
  flagged: [],
  startedAt: 0,
  deadline: 0,
  finishedAt: 0,
};

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, i) => (i === index ? value : item));
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'load':
      return INITIAL;
    case 'loaded': {
      const count = action.questions.length;
      if (count === 0) return { ...INITIAL, status: 'empty' };
      return {
        ...INITIAL,
        status: 'running',
        questions: action.questions,
        answers: Array(count).fill(null),
        flagged: Array(count).fill(false),
        startedAt: action.at,
        deadline: action.at + count * MS_PER_QUESTION,
      };
    }
    case 'failed':
      return { ...INITIAL, status: 'error' };
  }

  // The rest only apply while the test is running.
  if (state.status !== 'running') return state;
  switch (action.type) {
    case 'select':
      return { ...state, answers: replaceAt(state.answers, state.index, action.choice) };
    case 'toggleFlag':
      return { ...state, flagged: replaceAt(state.flagged, state.index, !state.flagged[state.index]) };
    case 'go':
      return { ...state, index: Math.min(Math.max(action.index, 0), state.questions.length - 1) };
    case 'finish':
      return { ...state, status: 'finished', finishedAt: Math.min(action.at, state.deadline) };
  }
}

/** A quick test of `count` random questions, timed at a minute per question. */
export function useQuiz(count: number) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [now, setNow] = useState(() => Date.now());

  const start = useCallback(() => {
    fetchRandomQuestions(count)
      .then((questions) => {
        const at = Date.now();
        setNow(at);
        dispatch({ type: 'loaded', questions, at });
      })
      .catch(() => dispatch({ type: 'failed' }));
  }, [count]);

  useEffect(start, [start]);

  const retry = useCallback(() => {
    dispatch({ type: 'load' });
    start();
  }, [start]);

  // Counts toward a fixed deadline, so time spent in the background is counted too.
  const { status, deadline } = state;
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= deadline) dispatch({ type: 'finish', at });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, deadline]);

  const score = state.answers.filter((answer, i) => answer === state.questions[i]?.correctIndex).length;

  return {
    ...state,
    /** Milliseconds left while running. */
    remaining: Math.max(0, deadline - now),
    score,
    retry,
    select: (choice: number) => dispatch({ type: 'select', choice }),
    toggleFlag: () => dispatch({ type: 'toggleFlag' }),
    go: (index: number) => dispatch({ type: 'go', index }),
    finish: () => dispatch({ type: 'finish', at: Date.now() }),
  };
}
