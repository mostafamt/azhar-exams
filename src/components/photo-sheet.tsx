import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraIcon, ImageIcon, TrashIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { PhotoSource } from '@/lib/pick-photo';

// A modal is its own native window, so the root's RTL doesn't reach it (see _layout.tsx).
const rtl: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };

type Props = {
  visible: boolean;
  /** «إزالة الصورة» is offered only when there's a photo. */
  hasPhoto: boolean;
  onPick: (source: PhotoSource) => void;
  onRemove: () => void;
  /** Also the Android back button and a tap on the backdrop. */
  onClose: () => void;
  /** iOS only: the sheet is fully gone, so another view (the picker) can be presented. */
  onDismiss?: () => void;
};

/** «الصورة الشخصية»: take a photo, choose one or remove it (6 · Profile). */
export function PhotoSheet({ visible, hasPhoto, onPick, onRemove, onClose, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss}
      statusBarTranslucent
      navigationBarTranslucent>
      <View style={[styles.overlay, rtl]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="إغلاق" />
        <Animated.View
          entering={SlideInDown.duration(220)}
          style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}
          accessibilityViewIsModal>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            الصورة الشخصية
          </Text>
          <Text style={styles.hint}>ستظهر صورتك في الدوريات والمباريات · JPG أو PNG حتى 5 ميجابايت</Text>

          <SheetRow
            label="التقاط صورة"
            tint={{ backgroundColor: Brand.primarySoft }}
            icon={<CameraIcon color={Brand.link} size={20} />}
            onPress={() => onPick('camera')}
          />
          <SheetRow
            label="اختيار من المعرض"
            tint={{ backgroundColor: Brand.successSoft }}
            icon={<ImageIcon color={Brand.success} size={20} />}
            onPress={() => onPick('library')}
          />
          {hasPhoto ? (
            <SheetRow
              label="إزالة الصورة"
              danger
              tint={{ backgroundColor: 'rgba(239,68,68,0.14)' }}
              icon={<TrashIcon color={Brand.error} size={20} />}
              onPress={onRemove}
            />
          ) : null}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>إلغاء</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SheetRow({
  label,
  icon,
  tint,
  danger,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  tint: ViewStyle;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, tint]}>{icon}</View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: '#111A2E',
    borderTopWidth: 1,
    borderColor: Brand.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
  },
  title: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  hint: {
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  rowLabelDanger: {
    color: Brand.error,
  },
  cancel: {
    height: 50,
    marginTop: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  pressed: {
    opacity: 0.8,
  },
});
