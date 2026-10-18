import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { EmptyState, LOAD_ERROR_MESSAGE, LoadingState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { SegmentedControl } from '@/components/segmented-control';
import { Colors } from '@/constants/colors';
import { groupByCategory, useCategories, useGrade, useSections, useSubjects } from '@/data/content';

export default function GradeScreen() {
  // `section` preselects a section, e.g. the student's own from the home screen shortcut.
  const { gradeId, section: initialSectionId } = useLocalSearchParams<{ gradeId: string; section?: string }>();
  const grade = useGrade(gradeId);
  const sections = useSections(gradeId);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId);
  const section = sections.data.find((s) => s.id === selectedSectionId) ?? sections.data[0];
  const subjects = useSubjects(gradeId, section?.id);
  const categories = useCategories(gradeId, section?.id);

  const title = <Stack.Screen options={{ title: grade.data?.name ?? '' }} />;

  if (grade.loading || sections.loading) return <LoadingState />;
  if (grade.error || sections.error) return <EmptyState message={LOAD_ERROR_MESSAGE} />;
  if (!grade.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'غير موجود' }} />
        <EmptyState message="هذا الصف غير موجود." />
      </>
    );
  }
  if (!section) {
    return (
      <>
        {title}
        <EmptyState message="لا توجد أقسام لهذا الصف بعد." />
      </>
    );
  }

  const groups = groupByCategory(categories.data, subjects.data);
  const listSections = groups.map((group) => ({ key: group.id, title: group.name, data: group.subjects }));
  const subjectCount = subjects.data.length;

  let body;
  if (subjects.loading || categories.loading) body = <LoadingState />;
  else if (subjects.error || categories.error) body = <EmptyState message={LOAD_ERROR_MESSAGE} />;
  else {
    body = (
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
        ListEmptyComponent={<EmptyState message="لا توجد مواد لهذا القسم بعد." />}
        renderSectionHeader={({ section: category }) => (
          <Text style={styles.categoryTitle}>{category.title}</Text>
        )}
        renderItem={({ item }) => (
          <ListCard
            title={item.name}
            onPress={() =>
              router.push({
                pathname: '/grades/[gradeId]/[sectionId]/[subjectId]',
                params: { gradeId, sectionId: section.id, subjectId: item.id },
              })
            }
          />
        )}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {title}
      {sections.data.length > 1 && (
        <View style={styles.switcher}>
          <SegmentedControl
            options={sections.data.map((s) => ({ id: s.id, label: s.name }))}
            selectedId={section.id}
            onChange={setSelectedSectionId}
          />
        </View>
      )}
      {body}
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
