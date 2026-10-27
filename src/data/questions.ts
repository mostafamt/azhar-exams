import { collection, getDocs, type QueryDocumentSnapshot } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { shuffle } from '@/utils/random';

/**
 * The question bank, written from the dashboard's «بنك الأسئلة» page and readable by everyone
 * (see ../azhar-exams-dashboard/docs/question-bank-plan.md).
 */
export const MCQ_ITEMS_PATH = 'questions/mcq-questions/items';

/** Choices are shown in stored order, as in the dashboard. */
export const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د'];

/** The exam page a question was copied from. */
export type QuestionSource = {
  gradeId?: string;
  sectionId?: string;
  subjectId?: string;
  examId?: string;
  subjectName?: string;
  examName?: string;
  url?: string;
};

export type Question = {
  id: string;
  body: string;
  choices: string[];
  correctIndex: number;
  source?: QuestionSource | null;
};

// The rules already enforce this shape; skipping a bad document beats crashing the test.
function toQuestion(snapshot: QueryDocumentSnapshot): Question | null {
  const data = snapshot.data();
  const valid =
    typeof data.body === 'string' &&
    Array.isArray(data.choices) &&
    data.choices.length === CHOICE_LETTERS.length &&
    data.choices.every((choice: unknown) => typeof choice === 'string') &&
    Number.isInteger(data.correctIndex) &&
    data.correctIndex >= 0 &&
    data.correctIndex < CHOICE_LETTERS.length;
  if (!valid) return null;
  return {
    id: snapshot.id,
    body: data.body,
    choices: data.choices,
    correctIndex: data.correctIndex,
    source: data.source ?? null,
  };
}

/**
 * `count` random, unique questions, or all of them if the bank is smaller. Reads the whole bank,
 * which is fine for a few hundred questions (docs/quick-test-plan.md §4.2 for larger banks).
 * A one-off read, so an edit in the dashboard can't change a question mid-test.
 */
export async function fetchRandomQuestions(count: number): Promise<Question[]> {
  const snapshot = await getDocs(collection(db, MCQ_ITEMS_PATH));
  const questions = snapshot.docs.map(toQuestion).filter((question) => question !== null);
  return shuffle(questions).slice(0, count);
}
