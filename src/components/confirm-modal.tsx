import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

// A modal is its own native window, so the root's RTL doesn't reach it (see _layout.tsx).
const rtl: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button, for actions that lose something. */
  destructive?: boolean;
  onConfirm: () => void;
  /** Also called by the Android back button and a tap outside. */
  onCancel: () => void;
};

/** Dark two-button dialog. Used instead of Alert.alert, which does nothing on web. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.overlay, rtl]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructive : styles.confirm,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.buttonText, styles.confirmText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.background,
  },
  confirm: {
    backgroundColor: Brand.primary,
  },
  destructive: {
    backgroundColor: Brand.danger,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  confirmText: {
    color: Brand.white,
  },
});
