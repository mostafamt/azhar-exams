import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoomControls } from '@/components/zoom-controls';
import { ZoomableImage, type ZoomableImageHandle } from '@/components/zoomable-image';
import { Colors } from '@/constants/colors';
import { toArabicDigits } from '@/utils/arabic';

type Props = {
  pages: number[];
  /** Index of the open page, or `null` when the viewer is closed. */
  pageIndex: number | null;
  onChangePage: (index: number) => void;
  onClose: () => void;
};

export function PageViewerModal({ pages, pageIndex, onChangePage, onClose }: Props) {
  const imageRef = useRef<ZoomableImageHandle>(null);
  const isOpen = pageIndex !== null;
  const index = pageIndex ?? 0;
  const hasPrevious = index > 0;
  const hasNext = index < pages.length - 1;

  const goPrevious = () => hasPrevious && onChangePage(index - 1);
  const goNext = () => hasNext && onChangePage(index + 1);

  return (
    <Modal visible={isOpen} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Gesture handler needs its own root inside a Modal on Android. */}
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.root}>
          <View style={styles.toolbar}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={styles.toolbarText}>إغلاق ✕</Text>
            </Pressable>
            <Text style={styles.toolbarText}>
              الصفحة {toArabicDigits(index + 1)} من {toArabicDigits(pages.length)}
            </Text>
          </View>

          <View style={styles.imageArea}>
            {isOpen && (
              <ZoomableImage
                key={index}
                ref={imageRef}
                source={pages[index]}
                onSwipeNext={goNext}
                onSwipePrevious={goPrevious}
              />
            )}
          </View>

          <View style={styles.footer}>
            <NavButton label="السابقة" disabled={!hasPrevious} onPress={goPrevious} />
            <ZoomControls
              variant="dark"
              onZoomIn={() => imageRef.current?.zoomIn()}
              onZoomOut={() => imageRef.current?.zoomOut()}
            />
            <NavButton label="التالية" disabled={!hasNext} onPress={goNext} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function NavButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.navButton,
        disabled && styles.navButtonDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.navButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolbarText: {
    color: Colors.onOverlay,
    fontSize: 16,
    fontWeight: '600',
  },
  imageArea: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: Colors.onOverlay,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
