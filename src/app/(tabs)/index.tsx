import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Carousel } from '@/components/carousel';
import { AnnouncementCard } from '@/components/home/announcement-card';
import { ExamCard } from '@/components/home/exam-card';
import { HomeHeader } from '@/components/home/home-header';
import { QuickAction } from '@/components/home/quick-action';
import { ChartIcon, TargetIcon, TrophyIcon } from '@/components/icons';
import { LOAD_ERROR_MESSAGE } from '@/components/empty-state';
import { VerifyEmailBanner } from '@/components/verify-email-banner';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { ANNOUNCEMENTS } from '@/data/announcements';
import { useLatestExams } from '@/data/content';
import { useAuth } from '@/hooks/use-auth';

const LATEST_EXAMS = 5;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, initializing } = useAuth();
  const gradeId = profile?.gradeId;
  const sectionId = profile?.sectionId;
  const exams = useLatestExams(gradeId, sectionId, LATEST_EXAMS);

  // Students go straight to their own grade and section; everyone else picks one in the exams tab.
  function openMyExams() {
    if (gradeId) {
      router.push({ pathname: '/grades/[gradeId]', params: { gradeId, section: sectionId } });
    } else {
      router.navigate('/exams');
    }
  }

  let examList;
  if (!gradeId) {
    examList = (
      <Pressable
        onPress={() => router.navigate('/exams')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.notice, pressed && styles.pressed]}>
        <Text style={styles.noticeTitle}>اختر صفك لعرض الامتحانات</Text>
        <Text style={styles.noticeBody}>تصفّح الصفوف والشعب من تبويب «الامتحانات».</Text>
      </Pressable>
    );
  } else if (exams.loading) {
    examList = <ActivityIndicator color={Brand.link} style={styles.loading} />;
  } else if (exams.error) {
    examList = <Text style={styles.message}>{LOAD_ERROR_MESSAGE}</Text>;
  } else if (exams.data.length === 0) {
    examList = <Text style={styles.message}>لا توجد امتحانات لشعبتك بعد.</Text>;
  } else {
    examList = exams.data.map((exam) => (
      <ExamCard
        key={`${exam.subject.id}/${exam.id}`}
        exam={exam}
        onOpen={() =>
          router.push({
            pathname: '/grades/[gradeId]/[sectionId]/[subjectId]/[examId]',
            params: { gradeId, sectionId: sectionId ?? '', subjectId: exam.subject.id, examId: exam.id },
          })
        }
      />
    ));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <View style={styles.column}>
        <HomeHeader name={profile?.name ?? user?.displayName ?? null} />

        {user && (
          <>
            <VerifyEmailBanner />
            {!initializing && !profile && (
              <Link href="/complete-profile" style={styles.link}>
                أكمل بياناتك لاختيار صفك وشعبتك
              </Link>
            )}
          </>
        )}

        <Carousel
          items={ANNOUNCEMENTS}
          keyOf={(item) => item.id}
          labelOf={(item) => `${item.badge}. ${item.title}. ${item.body}`}
          renderItem={(item) => <AnnouncementCard announcement={item} />}
          style={styles.carousel}
        />

        <View style={styles.actions}>
          <QuickAction
            label="اختبار سريع"
            Icon={TargetIcon}
            color={Brand.link}
            background={Brand.primarySoft}
            onPress={openMyExams}
          />
          <QuickAction label="الدوري الحالي" Icon={TrophyIcon} color={Brand.accentBright} background={Brand.accentSoft} />
          <QuickAction label="سجل النتائج" Icon={ChartIcon} color={Brand.success} background={Brand.successSoft} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            الاختبارات المتاحة
          </Text>
          {gradeId && (
            <Pressable onPress={openMyExams} accessibilityRole="link" hitSlop={12}>
              <Text style={styles.link}>عرض الكل</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.list}>{examList}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 22,
  },
  carousel: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  link: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.link,
  },
  list: {
    gap: 12,
  },
  loading: {
    paddingVertical: 24,
  },
  message: {
    paddingVertical: 24,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  notice: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  noticeTitle: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  noticeBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
