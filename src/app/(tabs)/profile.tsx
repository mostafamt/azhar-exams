import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { Avatar } from '@/components/avatar';
import { ConfirmModal } from '@/components/confirm-modal';
import { CameraIcon, PencilIcon } from '@/components/icons';
import { PhotoSheet } from '@/components/photo-sheet';
import { useToast } from '@/components/toast';
import { VerifyEmailBanner } from '@/components/verify-email-banner';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { removeAvatar } from '@/data/avatars';
import { useGrade, useSections } from '@/data/content';
import { useAuth } from '@/hooks/use-auth';
import { useMyAvatar } from '@/hooks/use-avatar';
import { signOut } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';
import { pickPhoto, type PhotoSource } from '@/lib/pick-photo';

/** Account details and sign-out; guests get a way back to sign in. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, initializing, leaveGuest } = useAuth();
  const grade = useGrade(profile?.gradeId ?? '');
  const sections = useSections(profile?.gradeId);
  const section = sections.data.find((s) => s.id === profile?.sectionId);
  const name = profile?.name ?? user?.displayName ?? null;
  const avatar = useMyAvatar(user?.uid);
  const photo = usePhotoActions();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <View style={styles.column}>
        <Text style={styles.title} accessibilityRole="header">
          الملف الشخصي
        </Text>

        {user ? (
          <View style={styles.identityCard}>
            <Pressable
              onPress={photo.openSheet}
              accessibilityRole="button"
              accessibilityLabel="تغيير الصورة الشخصية"
              style={({ pressed }) => pressed && styles.pressed}>
              <Avatar
                size={76}
                name={name}
                url={avatar.url}
                ring={{ width: 3, color: Brand.primaryBright }}
              />
              <View style={styles.cameraBadge}>
                <CameraIcon color={Brand.white} size={14} />
              </View>
            </Pressable>
            <View style={styles.identityText}>
              <Text style={styles.cardName} numberOfLines={1}>
                {name || 'طالب'}
              </Text>
              {user.email ? (
                <Text style={styles.cardEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            {profile ? (
              <Pressable
                onPress={() => router.push('/edit-profile')}
                accessibilityRole="button"
                accessibilityLabel="تعديل الملف الشخصي"
                hitSlop={4}
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
                <PencilIcon color={Brand.textMuted} size={18} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.identity}>
            <Avatar size={72} name={null} />
            <Text style={styles.name}>زائر</Text>
          </View>
        )}

        {user ? (
          <>
            <VerifyEmailBanner />
            {profile?.gradeId ? (
              <View style={styles.card}>
                <Row label="الصف" value={grade.data?.name ?? '…'} />
                <View style={styles.divider} />
                <Row label="الشعبة" value={section?.name ?? '…'} />
                <View style={styles.divider} />
                <Pressable
                  onPress={() => router.push('/edit-profile')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
                  <Text style={styles.editText}>تعديل الصف والشعبة</Text>
                </Pressable>
              </View>
            ) : (
              !initializing && (
                <Link href="/complete-profile" style={styles.link}>
                  أكمل بياناتك لاختيار صفك وشعبتك
                </Link>
              )
            )}
            <AuthButton title="تسجيل الخروج" variant="outline" onPress={signOut} />
          </>
        ) : (
          <>
            <Text style={styles.body}>سجّل الدخول لنحفظ صفك وشعبتك ونعرض امتحاناتك في الرئيسية مباشرة.</Text>
            <AuthButton title="تسجيل الدخول أو إنشاء حساب" onPress={leaveGuest} />
          </>
        )}
      </View>

      <PhotoSheet
        visible={photo.sheetOpen}
        hasPhoto={!!avatar.url}
        onPick={photo.pick}
        onRemove={photo.remove}
        onClose={photo.closeSheet}
        onDismiss={photo.onSheetDismissed}
      />
      <ConfirmModal
        visible={photo.blocked !== null}
        title={photo.blocked === 'camera' ? 'الكاميرا غير مسموح بها' : 'الصور غير مسموح بها'}
        message={
          photo.blocked === 'camera'
            ? 'اسمح للتطبيق بالوصول إلى الكاميرا من الإعدادات لالتقاط صورتك.'
            : 'اسمح للتطبيق بالوصول إلى الصور من الإعدادات لاختيار صورتك.'
        }
        confirmLabel="فتح الإعدادات"
        cancelLabel="إلغاء"
        onConfirm={photo.openSettings}
        onCancel={photo.dismissBlocked}
      />
    </ScrollView>
  );
}

/**
 * The avatar's sheet: take or choose a photo (then crop it on /edit-photo) or remove it
 * (docs/profile-photo-plan.md).
 */
function usePhotoActions() {
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [blocked, setBlocked] = useState<PhotoSource | null>(null);
  // iOS can't present the picker while the sheet is still closing, so it waits for onDismiss.
  const waiting = useRef<PhotoSource | null>(null);

  async function launch(source: PhotoSource) {
    try {
      const result = await pickPhoto(source);
      if (result.status === 'blocked') setBlocked(source);
      if (result.status !== 'picked') return;
      const { uri, width, height } = result.photo;
      router.push({ pathname: '/edit-photo', params: { uri, width: String(width), height: String(height) } });
    } catch (e) {
      toast(authErrorMessage(e), 'error');
    }
  }

  function pick(source: PhotoSource) {
    setSheetOpen(false);
    if (Platform.OS === 'ios') waiting.current = source;
    // Elsewhere right away: web only opens the file chooser from the tap itself.
    else launch(source);
  }

  function onSheetDismissed() {
    const source = waiting.current;
    waiting.current = null;
    if (source) launch(source);
  }

  async function remove() {
    setSheetOpen(false);
    try {
      await removeAvatar();
      toast('تمت إزالة الصورة');
    } catch (e) {
      toast(authErrorMessage(e), 'error');
    }
  }

  return {
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    onSheetDismissed,
    pick,
    remove,
    blocked,
    dismissBlocked: () => setBlocked(null),
    openSettings: () => {
      setBlocked(null);
      Linking.openSettings().catch(() => {});
    },
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 22,
  },
  title: {
    fontSize: 22,
    lineHeight: 34,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 20,
  },
  // Bottom-left of the avatar in the design (an RTL layout), so `end` here.
  cameraBadge: {
    position: 'absolute',
    end: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: Brand.surface,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  // An address reads left to right, but stays on the start (right) side under the name.
  cardEmail: {
    alignSelf: 'flex-start',
    writingDirection: 'ltr',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 20,
    lineHeight: 30,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  card: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
  },
  edit: {
    minHeight: 52,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  editText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
  link: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.semiBold,
    color: Brand.link,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
