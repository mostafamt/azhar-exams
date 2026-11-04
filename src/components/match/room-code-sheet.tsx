import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-text-field';
import { CloseIcon, ForwardIcon, KeyIcon, ShareIcon, UsersIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { RoomState } from '@/hooks/use-room';
import { shareRoom } from '@/lib/share-room';

// A modal is its own native window, so the root's RTL doesn't reach it (see _layout.tsx).
const rtl: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };

const CODE_LENGTH = 6;

type Props = {
  visible: boolean;
  room: RoomState;
  /** e.g. «5 أسئلة», shown on «أنشئ غرفة». */
  presetLabel: string;
  onCreate: () => void;
  onJoin: (code: string) => void;
  /** Back to the menu (and deletes an open room). */
  onReset: () => void;
  onClose: () => void;
};

/** «تحدَّ صديقاً»: create a room and share its code, or join with a friend's code. No design yet. */
export function RoomCodeSheet({ visible, room, presetLabel, onCreate, onJoin, onReset, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [joinMode, setJoinMode] = useState(false);
  const [code, setCode] = useState('');

  function close() {
    setJoinMode(false);
    setCode('');
    onClose();
  }

  function back() {
    setJoinMode(false);
    onReset();
  }

  let body;
  if (room.status === 'creating' || room.status === 'found') {
    body = <ActivityIndicator size="large" color={Brand.link} style={styles.spinner} />;
  } else if (room.status === 'hosting') {
    body = <HostingView code={room.code} onCancel={back} />;
  } else if (joinMode || room.status === 'joining') {
    const ready = code.length === CODE_LENGTH;
    body = (
      <>
        <AuthTextField
          label="كود الغرفة"
          icon={KeyIcon}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, CODE_LENGTH))}
          placeholder="K7P2QX"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          maxLength={CODE_LENGTH}
          returnKeyType="go"
          onSubmitEditing={() => ready && onJoin(code)}
          error={room.status === 'error' ? room.message : null}
          style={styles.codeInput}
        />
        <AuthButton
          title="انضم"
          onPress={() => ready && onJoin(code)}
          loading={room.status === 'joining'}
        />
        <AuthButton title="رجوع" variant="outline" onPress={back} />
      </>
    );
  } else {
    body = (
      <>
        {room.status === 'error' && <Text style={styles.error}>{room.message}</Text>}
        <Option
          title="أنشئ غرفة"
          subtitle={`شارك الكود مع صديقك · ${presetLabel}`}
          Icon={UsersIcon}
          onPress={onCreate}
        />
        <Option
          title="انضم بكود"
          subtitle="اكتب الكود الذي أرسله لك صديقك"
          Icon={KeyIcon}
          onPress={() => {
            onReset();
            setJoinMode(true);
          }}
        />
      </>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.overlay, rtl]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="إغلاق" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              تحدَّ صديقاً
            </Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <CloseIcon color={Brand.textMuted} size={20} />
            </Pressable>
          </View>
          {body}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HostingView({ code, onCancel }: { code: string; onCancel: () => void }) {
  // The code stays on screen too, for browsers without Share.
  const share = () => shareRoom(code);

  return (
    <>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>كود الغرفة</Text>
        <Text style={styles.code} selectable accessibilityLabel={`كود الغرفة ${code.split('').join(' ')}`}>
          {code}
        </Text>
      </View>
      <View style={styles.waiting} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Brand.primaryBright} />
        <Text style={styles.waitingText}>جارٍ انتظار صديقك…</Text>
      </View>
      <AuthButton title="مشاركة الكود" onPress={share} icon={<ShareIcon color={Brand.white} size={20} />} />
      <AuthButton title="إلغاء الغرفة" variant="outline" onPress={onCancel} />
    </>
  );
}

type OptionProps = {
  title: string;
  subtitle: string;
  Icon: typeof UsersIcon;
  onPress: () => void;
};

function Option({ title, subtitle, Icon, onPress }: OptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}، ${subtitle}`}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      <View style={styles.optionIcon}>
        <Icon color={Brand.success} size={20} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <ForwardIcon color={Brand.textMuted} size={18} />
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
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Brand.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Brand.border,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 32,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  spinner: {
    paddingVertical: 40,
  },
  error: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.error,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  optionSubtitle: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  codeInput: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: 4,
  },
  codeBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  codeLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
  // Latin letters and digits; Cairo's Latin glyphs keep it on-brand.
  code: {
    fontSize: 40,
    lineHeight: 56,
    fontFamily: Fonts.extraBold,
    color: Brand.link,
    letterSpacing: 8,
    writingDirection: 'ltr',
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  waitingText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
});
