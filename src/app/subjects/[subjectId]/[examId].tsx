import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PageViewerModal } from '@/components/page-viewer-modal';
import { Colors } from '@/constants/colors';
import { getExam, getSubject, PAGE_ASPECT_RATIO } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

export default function ExamScreen() {
  const { subjectId, examId } = useLocalSearchParams<{ subjectId: string; examId: string }>();
  const subject = getSubject(subjectId);
  const exam = getExam(subjectId, examId);
  const [openPage, setOpenPage] = useState<number | null>(null);

  if (!subject || !exam) {
    return (
      <>
        <Stack.Screen options={{ title: 'غير موجود' }} />
        <EmptyState message="هذا النموذج غير موجود." />
      </>
    );
  }

  const pageCount = toArabicDigits(exam.pages.length);

  return (
    <>
      <Stack.Screen options={{ title: `${subject.title} – ${exam.title}` }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={exam.pages}
        keyExtractor={(_, index) => String(index)}
        initialNumToRender={2}
        windowSize={3}
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => setOpenPage(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`الصفحة ${toArabicDigits(index + 1)} من ${pageCount}`}
            style={styles.page}>
            <Image
              source={item}
              style={styles.pageImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              recyclingKey={String(index)}
              transition={150}
            />
            <View style={styles.pageLabel}>
              <Text style={styles.pageLabelText}>
                الصفحة {toArabicDigits(index + 1)} من {pageCount}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <PageViewerModal
        pages={exam.pages}
        pageIndex={openPage}
        onChangePage={setOpenPage}
        onClose={() => setOpenPage(null)}
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
    padding: 12,
    gap: 16,
  },
  page: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pageImage: {
    width: '100%',
    aspectRatio: PAGE_ASPECT_RATIO,
  },
  pageLabel: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  pageLabelText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
