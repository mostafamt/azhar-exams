# خطة ميزة: قسم «الفقه الحنفي»

Feature plan for showing the exam images in `assets/fiqah/` inside the app under a **الفقه الحنفي** section.

## 1. What we have

| Item | Detail |
|---|---|
| Folder | `assets/fiqah/` |
| Files | 12 JPGs, `6_page-0001.jpg` … `6_page-0012.jpg` |
| Content | One trial exam booklet (البوكليت التجريبي) — الفقه الحنفي، القسم العلمي، ١٤٤٧هـ / ٢٠٢٥–٢٠٢٦م — 12 pages |
| Size | ~1240×1755 px each (A4 portrait, ratio ≈ 0.707), 3.7 MB total |

The `6_` prefix looks like a model/booklet number, so the folder may later hold more than one exam (e.g. `7_page-0001.jpg`). The plan supports several exams per subject from the start.

## 2. User flow

```
Home (index)
  └─ «ابدأ المذاكرة الآن»
       └─ Subjects list            → card: «الفقه الحنفي»
            └─ Subject screen      → list of exams (e.g. «النموذج ٦ – البوكليت التجريبي»)
                 └─ Exam viewer    → the 12 pages, scroll + pinch-to-zoom
```

If a subject has only one exam, the subject screen can open the viewer directly (see open questions).

## 3. Routes (Expo Router, `src/app/`)

| File | URL | Screen |
|---|---|---|
| `src/app/_layout.tsx` | — | Root `Stack`; turn the header on for inner screens, Arabic titles, right-aligned |
| `src/app/index.tsx` | `/` | Existing home; button navigates to `/subjects` instead of `alert()` |
| `src/app/subjects/index.tsx` | `/subjects` | List of subjects (only الفقه الحنفي for now) |
| `src/app/subjects/[subjectId]/index.tsx` | `/subjects/fiqh-hanafi` | Exams in that subject |
| `src/app/subjects/[subjectId]/[examId].tsx` | `/subjects/fiqh-hanafi/6` | Page viewer |

Read params with `useLocalSearchParams` from `expo-router`. `typedRoutes` is already on in `app.json`, so links are type-checked.

## 4. Data layer (`src/data/`, outside `src/app/`)

Metro bundles images only through **static** `require()` calls — a folder can't be listed at runtime. So every page is listed once in a typed registry:

```ts
// src/data/subjects.ts
export type Exam = {
  id: string;            // "6"
  title: string;         // "النموذج ٦ – البوكليت التجريبي"
  year: string;          // "٢٠٢٥ / ٢٠٢٦"
  pages: number[];       // require() results
};

export type Subject = {
  id: string;            // "fiqh-hanafi"  (URL slug)
  title: string;         // "الفقه الحنفي"
  section: string;       // "القسم العلمي"
  exams: Exam[];
};

export const subjects: Subject[] = [
  {
    id: 'fiqh-hanafi',
    title: 'الفقه الحنفي',
    section: 'القسم العلمي',
    exams: [
      {
        id: '6',
        title: 'النموذج ٦ – البوكليت التجريبي',
        year: '٢٠٢٥ / ٢٠٢٦',
        pages: [
          require('@/assets/fiqah/6_page-0001.jpg'),
          // … through 6_page-0012.jpg
        ],
      },
    ],
  },
];

export const getSubject = (id: string) => subjects.find((s) => s.id === id);
export const getExam = (subjectId: string, examId: string) =>
  getSubject(subjectId)?.exams.find((e) => e.id === examId);
```

Optional helper: a small script in `scripts/` that scans `assets/<subject>/` and regenerates the `pages` arrays, so adding new exams doesn't mean typing 12+ `require` lines by hand.

## 5. Components (`src/components/`)

| Component | Purpose |
|---|---|
| `SubjectCard` | Tappable card with subject title + section |
| `ExamListItem` | Exam title, year, page count, first-page thumbnail |
| `ExamPage` | One page: `expo-image` `Image`, `contentFit="contain"`, fixed aspect ratio `1240 / 1755` so the list doesn't jump while loading |
| `ZoomableImage` | Pinch-to-zoom + double-tap zoom using `react-native-gesture-handler` + `react-native-reanimated` (both already installed — no new native deps, works in Expo Go) |

## 6. Exam viewer behaviour

- Vertical `FlatList` of pages (reads like scrolling a PDF), page indicator «الصفحة ٣ من ١٢» in the header.
- Tap a page → full-screen mode with horizontal paging between pages and pinch-to-zoom.
- `FlatList` tuning for big images: `initialNumToRender={2}`, `windowSize={3}`, `removeClippedSubviews` on Android, `keyExtractor` by page index.
- `expo-image` with `cachePolicy="memory-disk"` and `recyclingKey` per page.
- Remember the last page read per exam (optional, later): `expo-sqlite/kv-store` or AsyncStorage.

## 7. Arabic / RTL

- All UI text is Arabic: titles, buttons, page counter, empty states.
- Short term: `textAlign: 'right'` / `writingDirection: 'rtl'` on text; `flexDirection: 'row-reverse'` where rows need it.
- Better: enable app-wide RTL via the `expo-localization` config plugin (`supportsRTL` / `forcesRTL`) — needs a new dev build. Decide before building many screens (see open questions).
- In full-screen horizontal paging, swiping should follow Arabic reading direction (next page from the left).

## 8. Performance & size

- 3.7 MB for one exam is fine; at ~10 subjects × several exams the app bundle grows fast.
- Before adding more content: convert pages to **WebP** (~60–70% smaller, same quality for scanned text) and keep width ≈ 1240 px.
- If content grows a lot or must be updated without app releases, move images to remote hosting and load by URL (`expo-image` caches them). Out of scope for this first version.

## 9. Implementation steps

1. Create `src/data/subjects.ts` with the الفقه الحنفي entry and the 12 pages.
2. Add `src/app/subjects/index.tsx` + `SubjectCard`.
3. Add `src/app/subjects/[subjectId]/index.tsx` + `ExamListItem`; handle unknown `subjectId` (not-found message).
4. Add `src/app/subjects/[subjectId]/[examId].tsx` with `ExamPage` list.
5. Add `ZoomableImage` and full-screen paging.
6. Turn on Stack headers with Arabic titles in `_layout.tsx`; wire the home button to `/subjects`.
7. Run `npx tsc --noEmit` and `npx expo lint`; test on Android, iOS and web.

## 10. Acceptance criteria

- [ ] Home → «ابدأ المذاكرة الآن» opens the subjects list showing «الفقه الحنفي».
- [ ] الفقه الحنفي shows the exam(s) with title, year and page count.
- [ ] Opening the exam shows all 12 pages in order, sharp and readable on a phone.
- [ ] Pinch-to-zoom and double-tap zoom work on Android and iOS.
- [ ] Scrolling stays smooth; no blank flashes or layout jumps.
- [ ] Back navigation works on every screen (including Android hardware back).
- [ ] Unknown subject/exam URL shows a friendly Arabic message instead of crashing.
- [ ] Typecheck and lint pass.

## 11. Decisions (implemented)

1. The `6_` prefix is just a file number. Exams are titled by order: «النموذج ١»، «النموذج ٢»…
2. More subjects will follow, each in its own `assets/<folder>/`.
3. More exams will be added, so the exam list is always shown.
4. The whole app is RTL: `expo-localization` plugin with `forcesRTL` (native, needs a dev build — not Expo Go) and `<html dir="rtl">` in `src/app/+html.tsx` (web).

Implementation notes:

- Page lists are generated: `npm run generate:exams` scans each subject folder and writes `src/data/exams.generated.ts`. Subjects are declared in `src/data/subjects.ts`.
- The full-screen viewer is a `Modal` (`src/components/page-viewer-modal.tsx`) with prev/next buttons and swipe, instead of a horizontal list — this avoids known RTL bugs with horizontal `FlatList` paging.

## 12. Still open

1. Do answer keys / model answers exist and need to be shown with the questions?
2. Should pages work fully offline (bundled, current) or be downloaded on demand?
