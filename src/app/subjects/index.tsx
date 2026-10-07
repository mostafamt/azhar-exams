import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { ListCard } from '@/components/list-card';
import { SegmentedControl } from '@/components/segmented-control';
import { Colors } from '@/constants/colors';
import { sections } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

const sectionOptions = sections.map((section) => ({ id: section.id, label: section.title }));

export default function SubjectsScreen() {
  const [sectionId, setSectionId] = useState(sections[0].id);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];

  const listSections = section.categories.map((category) => ({
    key: category.id,
    title: category.title,
    data: category.subjects,
  }));
  const subjectCount = listSections.reduce((sum, category) => sum + category.data.length, 0);

  return (
    <View style={styles.screen}>
      <View style={styles.switcher}>
        <SegmentedControl options={sectionOptions} selectedId={sectionId} onChange={setSectionId} />
      </View>
      <SectionList
        // Remount per section so the list starts at the top.
        key={section.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        sections={listSections}
        keyExtractor={(subject) => subject.id}
        stickySectionHeadersEnabled={false}
        // Render everything up front: SectionList counts a header and footer per section as rows.
        initialNumToRender={subjectCount + listSections.length * 2}
        renderSectionHeader={({ section: category }) => (
          <Text style={styles.categoryTitle}>{category.title}</Text>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  switcher: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
  },
});
