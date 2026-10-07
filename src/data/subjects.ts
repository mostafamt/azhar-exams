import { examsByFolder } from './exams.generated';
import { toArabicDigits } from '@/utils/arabic';

/**
 * To add a subject: put its page images in `assets/<folder>/`, add an entry
 * below, then run `npm run generate:exams`.
 */
const subjectDefinitions = [
  {
    id: 'fiqh-hanafi',
    title: 'الفقه الحنفي',
    section: 'القسم العلمي',
    folder: 'fiqah',
  },
];

export type Exam = {
  id: string;
  title: string;
  pages: number[];
};

export type Subject = {
  id: string;
  title: string;
  section: string;
  exams: Exam[];
};

export const subjects: Subject[] = subjectDefinitions.map(({ folder, ...subject }) => ({
  ...subject,
  exams: (examsByFolder[folder] ?? []).map(({ key, pages }, index) => ({
    id: key,
    title: `النموذج ${toArabicDigits(index + 1)}`,
    pages,
  })),
}));

export function getSubject(subjectId: string | undefined) {
  return subjects.find((subject) => subject.id === subjectId);
}

export function getExam(subjectId: string | undefined, examId: string | undefined) {
  return getSubject(subjectId)?.exams.find((exam) => exam.id === examId);
}

/** Width / height of the scanned A4 pages. */
export const PAGE_ASPECT_RATIO = 1240 / 1755;
