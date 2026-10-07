import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { ListCard } from '@/components/list-card';
import { Colors } from '@/constants/colors';
import { subjects } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

export default function SubjectsScreen() {
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={subjects}
      keyExtractor={(subject) => subject.id}
      renderItem={({ item }) => (
        <ListCard
          title={item.title}
          subtitle={`${item.section} · ${toArabicDigits(item.exams.length)} نموذج`}
          onPress={() =>
            router.push({ pathname: '/subjects/[subjectId]', params: { subjectId: item.id } })
          }
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
