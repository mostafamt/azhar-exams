import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { toArabicDigits } from '@/utils/arabic';

/**
 * Content is managed in the azhar-exams-dashboard app and read from Firestore:
 *
 *   grades/{gradeId}
 *     sections/{sectionId}
 *       categories/{categoryId}   groups subjects (e.g. اللغة العربية)
 *       subjects/{subjectId}      `categoryId` points at one of the section's categories
 *         exams/{examId}          `images` holds the pages, hosted on Cloudinary
 */

type Node = {
  id: string;
  name: string;
  /** Sort order in lists; nodes without it come last, then by name. */
  order?: number | null;
};

export type Grade = Node;
export type Section = Node;
export type Category = Node;
export type Subject = Node & { categoryId?: string | null };

export type ExamImage = {
  id: string;
  /** Full page, `f_auto,q_auto` Cloudinary delivery URL. */
  url: string;
  /** 480px-wide version for list thumbnails. */
  thumbUrl?: string;
  width?: number;
  height?: number;
};

export type Exam = Node & {
  year?: number | null;
  term?: 'first' | 'second' | 'retake' | null;
  images?: ExamImage[];
};

/** Width / height of a scanned A4 page, used when an image has no stored size. */
export const PAGE_ASPECT_RATIO = 1240 / 1755;

const TERM_LABELS: Record<string, string> = {
  first: 'الفصل الدراسي الأول',
  second: 'الفصل الدراسي الثاني',
  retake: 'الدور الثاني',
};

const LEVELS = ['grades', 'sections', 'subjects', 'exams'] as const;

/** Collection holding the children of `parentIds`, e.g. ['third-secondary'] → grades/third-secondary/sections. */
function collectionPath(parentIds: string[]) {
  return parentIds.reduce((path, id, i) => `${path}/${id}/${LEVELS[i + 1]}`, LEVELS[0]);
}

function docPath(ids: string[]) {
  return `${collectionPath(ids.slice(0, -1))}/${ids.at(-1)}`;
}

function sortNodes<T extends Node>(nodes: T[]) {
  return [...nodes].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) || (a.name ?? '').localeCompare(b.name ?? '', 'ar')
  );
}

type Loadable<T> = { data: T; loading: boolean; error: Error | null };

/** Live, sorted documents of the collection at `path`. Pass `null` to skip (e.g. while a parent id is unknown). */
function useCollection<T extends Node>(path: string | null): Loadable<T[]> {
  const [state, setState] = useState<{ path: string | null; data: T[]; error: Error | null }>({
    path: null,
    data: [],
    error: null,
  });

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      collection(db, path),
      (snapshot) =>
        setState({
          path,
          data: sortNodes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
          error: null,
        }),
      (error) => setState({ path, data: [], error })
    );
  }, [path]);

  if (!path) return { data: [], loading: false, error: null };
  // Don't show the previous path's data until the first snapshot for this one arrives.
  const loading = state.path !== path;
  return { data: loading ? [] : state.data, loading, error: loading ? null : state.error };
}

/** Live document at `ids`; `data` is null while loading or when it doesn't exist. */
function useDocument<T extends Node>(ids: string[] | null): Loadable<T | null> {
  const path = ids && ids.every(Boolean) ? docPath(ids) : null;
  const [state, setState] = useState<{ path: string | null; data: T | null; error: Error | null }>({
    path: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      (snapshot) =>
        setState({
          path,
          data: snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null,
          error: null,
        }),
      (error) => setState({ path, data: null, error })
    );
  }, [path]);

  if (!path) return { data: null, loading: false, error: null };
  const loading = state.path !== path;
  return { data: loading ? null : state.data, loading, error: loading ? null : state.error };
}

export function useGrades() {
  return useCollection<Grade>(collectionPath([]));
}

export function useGrade(gradeId: string) {
  return useDocument<Grade>([gradeId]);
}

export function useSections(gradeId: string | undefined) {
  return useCollection<Section>(gradeId ? collectionPath([gradeId]) : null);
}

export function useSubjects(gradeId: string, sectionId: string | undefined) {
  return useCollection<Subject>(sectionId ? collectionPath([gradeId, sectionId]) : null);
}

export function useCategories(gradeId: string, sectionId: string | undefined) {
  return useCollection<Category>(sectionId ? `${docPath([gradeId, sectionId])}/categories` : null);
}

export function useSubject(gradeId: string, sectionId: string, subjectId: string) {
  return useDocument<Subject>([gradeId, sectionId, subjectId]);
}

export function useExams(gradeId: string, sectionId: string, subjectId: string) {
  return useCollection<Exam>(collectionPath([gradeId, sectionId, subjectId]));
}

export function useExam(gradeId: string, sectionId: string, subjectId: string, examId: string) {
  return useDocument<Exam>([gradeId, sectionId, subjectId, examId]);
}

export type SectionExam = Exam & { subject: Subject };

/**
 * The newest `max` exams across all subjects of a section (by year, then subject and exam order).
 * One listener per subject; fine for a section's handful of subjects.
 */
export function useLatestExams(
  gradeId: string | undefined,
  sectionId: string | undefined,
  max: number
): Loadable<SectionExam[]> {
  const subjects = useSubjects(gradeId ?? '', gradeId ? sectionId : undefined);
  const subjectIds = subjects.data.map((subject) => subject.id).join(',');
  const key = subjects.loading || !gradeId || !sectionId ? null : `${gradeId}/${sectionId}/${subjectIds}`;
  const [state, setState] = useState<{ key: string | null; bySubject: Record<string, Exam[]>; error: Error | null }>({
    key: null,
    bySubject: {},
    error: null,
  });

  useEffect(() => {
    if (!key || !gradeId || !sectionId || !subjectIds) return;
    // Results from a previous key are dropped, so a stale listener can't mix in another section.
    const update = (subjectId: string, exams: Exam[] | null, error: Error | null) =>
      setState((current) => {
        const base = current.key === key ? current : { key, bySubject: {}, error: null };
        return {
          key,
          bySubject: { ...base.bySubject, [subjectId]: exams ?? [] },
          error: error ?? base.error,
        };
      });
    const unsubscribes = subjectIds.split(',').map((subjectId) =>
      onSnapshot(
        collection(db, collectionPath([gradeId, sectionId, subjectId])),
        (snapshot) => update(subjectId, snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam), null),
        (error) => update(subjectId, null, error)
      )
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [key, gradeId, sectionId, subjectIds]);

  if (!gradeId || !sectionId) return { data: [], loading: false, error: null };
  if (subjects.loading) return { data: [], loading: true, error: null };
  if (subjects.error) return { data: [], loading: false, error: subjects.error };
  if (subjects.data.length === 0) return { data: [], loading: false, error: null };

  const current = state.key === key ? state : null;
  const loading = !current || subjects.data.some((subject) => !(subject.id in current.bySubject));
  if (loading) return { data: [], loading: true, error: null };

  const data = subjects.data
    .flatMap((subject) => sortNodes(current.bySubject[subject.id]).map((exam) => ({ ...exam, subject })))
    // Stable sort, so equal years keep the subject and exam order from above.
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, max);
  return { data, loading: false, error: current.error };
}

/** Short term name for chips, e.g. «الفصل الأول». */
export function termLabel(term: Exam['term']) {
  if (term === 'first') return 'الفصل الأول';
  if (term === 'second') return 'الفصل الثاني';
  if (term === 'retake') return 'الدور الثاني';
  return null;
}

/** Subjects grouped under their categories, in order. Subjects without a known category go under "أخرى". */
export function groupByCategory(categories: Category[], subjects: Subject[]) {
  const groups = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      subjects: subjects.filter((subject) => subject.categoryId === category.id),
    }))
    .filter((group) => group.subjects.length > 0);

  const categoryIds = new Set(categories.map((category) => category.id));
  const other = subjects.filter((subject) => !subject.categoryId || !categoryIds.has(subject.categoryId));
  if (other.length > 0) groups.push({ id: '__other', name: 'أخرى', subjects: other });
  return groups;
}

/** Display title; falls back to the term and year when the exam has no name. */
export function examTitle(exam: Exam) {
  if (exam.name?.trim()) return exam.name;
  const parts = [exam.term && TERM_LABELS[exam.term], exam.year && toArabicDigits(exam.year)];
  return parts.filter(Boolean).join(' ') || exam.id;
}

export function imageAspectRatio(image: ExamImage) {
  return image.width && image.height ? image.width / image.height : PAGE_ASPECT_RATIO;
}
