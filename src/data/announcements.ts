import type { ChipTone } from '@/components/chip';

export type Announcement = {
  id: string;
  badge: string;
  badgeTone: ChipTone;
  /** Faded icon in the card's corner. */
  icon: 'trophy' | 'document' | 'bell';
  title: string;
  body: string;
};

// Static until announcements are managed from the dashboard (docs/home-plan.md §2.3).
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'leagues',
    badge: 'قريباً',
    badgeTone: 'solidAmber',
    icon: 'trophy',
    title: 'الدوريات والمسابقات',
    body: 'نافس زملاءك في دوريات على مستوى صفك وتصدّر القمة.',
  },
  {
    id: 'past-exams',
    badge: 'متاح الآن',
    badgeTone: 'solidGreen',
    icon: 'document',
    title: 'امتحانات السنوات السابقة',
    body: 'نماذج الامتحانات الرسمية بصفحاتها كاملة لكل مادة.',
  },
  {
    id: 'profile',
    badge: 'نصيحة',
    badgeTone: 'solidIndigo',
    icon: 'bell',
    title: 'امتحاناتك أولاً',
    body: 'اختر صفك وشعبتك في حسابك لتظهر لك امتحاناتك هنا مباشرة.',
  },
];
