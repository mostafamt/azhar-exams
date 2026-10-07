import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { PageViewerModal } from '@/components/page-viewer-modal';
import { ZoomControls } from '@/components/zoom-controls';
import { Colors } from '@/constants/colors';
import { getExam, getSubject, PAGE_ASPECT_RATIO } from '@/data/subjects';
import { toArabicDigits } from '@/utils/arabic';

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3];
const MAX_BASE_PAGE_WIDTH = 900;
const LIST_PADDING = 12;

export default function ExamScreen() {
  const { subjectId, examId } = useLocalSearchParams<{ subjectId: string; examId: string }>();
  const subject = getSubject(subjectId);
  const exam = getExam(subjectId, examId);
  const [openPage, setOpenPage] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const listRef = useRef<FlatList<number>>(null);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  // Where to scroll (as a fraction of the content height) once the zoomed content has been laid out.
  const pendingScrollRatio = useRef<number | null>(null);

  if (!subject || !exam) {
    return (
      <>
        <Stack.Screen options={{ title: 'غير موجود' }} />
        <EmptyState message="هذا النموذج غير موجود." />
      </>
    );
  }

  const zoom = ZOOM_LEVELS[zoomIndex];
  const pageWidth = Math.min(windowWidth - LIST_PADDING * 2, MAX_BASE_PAGE_WIDTH) * zoom;
  const contentWidth = Math.max(windowWidth, pageWidth + LIST_PADDING * 2);
  const pageCount = toArabicDigits(exam.pages.length);

  const changeZoom = (nextIndex: number) => {
    if (contentHeight.current > 0) {
      pendingScrollRatio.current = scrollY.current / contentHeight.current;
    }
    setZoomIndex(nextIndex);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `${subject.title} – ${exam.title}` }} />
      <ScrollView
        horizontal
        // Only scrolls sideways when zoomed pages are wider than the screen.
        scrollEnabled={contentWidth > windowWidth}
        showsHorizontalScrollIndicator={contentWidth > windowWidth}
        contentContainerStyle={{ width: contentWidth }}>
        <FlatList
          ref={listRef}
          style={{ width: contentWidth }}
          contentContainerStyle={styles.content}
          data={exam.pages}
          keyExtractor={(_, index) => String(index)}
          extraData={pageWidth}
          initialNumToRender={2}
          windowSize={3}
          removeClippedSubviews
          scrollEventThrottle={100}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={(_, height) => {
            contentHeight.current = height;
            if (pendingScrollRatio.current !== null) {
              listRef.current?.scrollToOffset({
                offset: pendingScrollRatio.current * height,
                animated: false,
              });
              pendingScrollRatio.current = null;
            }
          }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setOpenPage(index)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`الصفحة ${toArabicDigits(index + 1)} من ${pageCount}`}
              style={[styles.page, { width: pageWidth }]}>
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
      </ScrollView>

      <View style={[styles.zoomBar, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <ZoomControls
          label={`${toArabicDigits(Math.round(zoom * 100))}٪`}
          canZoomIn={zoomIndex < ZOOM_LEVELS.length - 1}
          canZoomOut={zoomIndex > 0}
          onZoomIn={() => changeZoom(Math.min(zoomIndex + 1, ZOOM_LEVELS.length - 1))}
          onZoomOut={() => changeZoom(Math.max(zoomIndex - 1, 0))}
        />
      </View>

      <PageViewerModal
        pages={exam.pages}
        pageIndex={openPage}
        onChangePage={setOpenPage}
        onClose={() => setOpenPage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: LIST_PADDING,
    // Room so the last page isn't hidden behind the zoom buttons.
    paddingBottom: 88,
    gap: 16,
  },
  page: {
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
  zoomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
