import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { Colors } from '@/constants/colors';
import { getSubject } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

export default function SubjectScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const subject = getSubject(subjectId);

  if (!subject) {
    return (
      <>
        <Stack.Screen options={{ title: 'غير موجود' }} />
        <EmptyState message="هذه المادة غير موجودة." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: subject.title }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={subject.exams}
        keyExtractor={(exam) => exam.id}
        ListEmptyComponent={<EmptyState message="لا توجد نماذج لهذه المادة بعد." />}
        renderItem={({ item }) => (
          <ListCard
            title={item.title}
            subtitle={`${toArabicDigits(item.pages.length)} صفحة`}
            thumbnail={item.pages[0]}
            onPress={() =>
              router.push({
                pathname: '/subjects/[subjectId]/[examId]',
                params: { subjectId: subject.id, examId: item.id },
              })
            }
          />
        )}
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
