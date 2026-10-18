import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, LOAD_ERROR_MESSAGE, LoadingState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { Colors } from '@/constants/colors';
import { useGrades } from '@/data/content';

export default function GradesScreen() {
  const grades = useGrades();

  if (grades.loading) return <LoadingState />;
  if (grades.error) return <EmptyState message={LOAD_ERROR_MESSAGE} />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={grades.data}
      keyExtractor={(grade) => grade.id}
      ListEmptyComponent={<EmptyState message="لا توجد صفوف بعد." />}
      renderItem={({ item }) => (
        <ListCard
          title={item.name}
          onPress={() => router.push({ pathname: '/grades/[gradeId]', params: { gradeId: item.id } })}
        />
      )}
    />
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
