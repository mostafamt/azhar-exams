import { examsByFolder } from './exams.generated';
import { toArabicDigits } from '@/utils/arabic';

/**
 * Exam pages live in `assets/exams/<section>/<subject>/`. To add content, drop
 * the images there (see scripts/pdf-to-pages.py), make sure the folder names
 * are listed below, then run `npm run generate:exams`.
 */
const sectionTitles: Record<string, string> = {
  sc: 'القسم العلمي',
  adaby: 'القسم الأدبي',
};

/** Display order of subjects inside a section. */
const subjectTitles: Record<string, string> = {
  quran: 'القرآن الكريم',
  tafsir: 'التفسير',
  hadith: 'الحديث',
  tawhid: 'التوحيد',
  'fiqh-hanafi': 'الفقه الحنفي',
  'fiqh-maliki': 'الفقه المالكي',
  'fiqh-shafii': 'الفقه الشافعي',
  'fiqh-hanbali': 'الفقه الحنبلي',
  adab: 'الأدب والنصوص',
  nahw: 'النحو',
  sarf: 'الصرف',
  balagha: 'البلاغة',
  insha: 'الإنشاء',
  english: 'اللغة الإنجليزية',
  french: 'اللغة الفرنسية',
  physics: 'الفيزياء',
  chemistry: 'الكيمياء',
  biology: 'الأحياء',
  'physics-lang': 'الفيزياء (لغات)',
  'chemistry-lang': 'الكيمياء (لغات)',
  'biology-lang': 'الأحياء (لغات)',
  'math-pure': 'الرياضيات البحتة',
  'math-applied': 'الرياضيات التطبيقية',
  'math-pure-lang': 'الرياضيات البحتة (لغات)',
  'math-applied-lang': 'الرياضيات التطبيقية (لغات)',
  statistics: 'الإحصاء',
  'statistics-lang': 'الإحصاء (لغات)',
  history: 'التاريخ',
  geography: 'الجغرافيا',
};

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

export type Section = {
  id: string;
  title: string;
  subjects: Subject[];
};

export const sections: Section[] = Object.entries(sectionTitles).map(([sectionId, sectionTitle]) => ({
  id: sectionId,
  title: sectionTitle,
  subjects: Object.entries(subjectTitles)
    .filter(([subjectId]) => examsByFolder[`${sectionId}/${subjectId}`])
    .map(([subjectId, subjectTitle]) => ({
      id: `${sectionId}-${subjectId}`,
      title: subjectTitle,
      section: sectionTitle,
      exams: examsByFolder[`${sectionId}/${subjectId}`].map(({ key, pages }, index) => ({
        id: key,
        title: `النموذج ${toArabicDigits(index + 1)}`,
        pages,
      })),
    })),
}));

if (__DEV__) {
  for (const folder of Object.keys(examsByFolder)) {
    const [sectionId, subjectId] = folder.split('/');
    if (!sectionTitles[sectionId] || !subjectTitles[subjectId]) {
      console.warn(`assets/exams/${folder} has no title in src/data/subjects.ts and is hidden.`);
    }
  }
}

export const subjects: Subject[] = sections.flatMap((section) => section.subjects);

export function getSubject(subjectId: string | undefined) {
  return subjects.find((subject) => subject.id === subjectId);
}

export function getExam(subjectId: string | undefined, examId: string | undefined) {
  return getSubject(subjectId)?.exams.find((exam) => exam.id === examId);
}

/** Width / height of the scanned A4 pages. */
export const PAGE_ASPECT_RATIO = 1240 / 1755;
