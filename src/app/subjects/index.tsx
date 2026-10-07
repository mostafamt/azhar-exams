import { router } from 'expo-router';
import { SectionList, StyleSheet, Text } from 'react-native';

import { ListCard } from '@/components/list-card';
import { Colors } from '@/constants/colors';
import { sections, subjects } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

const listSections = sections.map((section) => ({ ...section, data: section.subjects }));

export default function SubjectsScreen() {
  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.content}
      sections={listSections}
      keyExtractor={(subject) => subject.id}
      stickySectionHeadersEnabled={false}
      // Render everything up front: SectionList counts a header and footer per section as rows.
      initialNumToRender={subjects.length + sections.length * 2}
      renderSectionHeader={({ section }) => <Text style={styles.header}>{section.title}</Text>}
      renderItem={({ item }) => (
        <ListCard
          title={item.title}
          subtitle={`${toArabicDigits(item.exams.length)} نموذج`}
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
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
});
