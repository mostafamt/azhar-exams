import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, LOAD_ERROR_MESSAGE, LoadingState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { Colors } from '@/constants/colors';
import { examTitle, useExams, useSubject } from '@/data/content';
import { toArabicDigits } from '@/utils/arabic';

export default function SubjectScreen() {
  const { gradeId, sectionId, subjectId } = useLocalSearchParams<{
    gradeId: string;
    sectionId: string;
    subjectId: string;
  }>();
  const subject = useSubject(gradeId, sectionId, subjectId);
  const exams = useExams(gradeId, sectionId, subjectId);

  if (subject.loading || exams.loading) return <LoadingState />;
  if (subject.error || exams.error) return <EmptyState message={LOAD_ERROR_MESSAGE} />;
  if (!subject.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'غير موجود' }} />
        <EmptyState message="هذه المادة غير موجودة." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: subject.data.name }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={exams.data}
        keyExtractor={(exam) => exam.id}
        ListEmptyComponent={<EmptyState message="لا توجد نماذج لهذه المادة بعد." />}
        renderItem={({ item }) => {
          const images = item.images ?? [];
          return (
            <ListCard
              title={examTitle(item)}
              subtitle={`${toArabicDigits(images.length)} صفحة`}
              thumbnail={images[0]?.thumbUrl ?? images[0]?.url}
              onPress={() =>
                router.push({
                  pathname: '/grades/[gradeId]/[sectionId]/[subjectId]/[examId]',
                  params: { gradeId, sectionId, subjectId, examId: item.id },
                })
              }
            />
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
});
