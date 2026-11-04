import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { CropView, MAX_ZOOM, MIN_ZOOM, useCrop, type Crop } from '@/components/crop-view';
import { FormMessage } from '@/components/form-message';
import { useToast } from '@/components/toast';
import { ZoomSlider } from '@/components/zoom-slider';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { setAvatar } from '@/data/avatars';
import { authErrorMessage } from '@/lib/auth-errors';
import { cropToAvatar } from '@/lib/crop-photo';

/**
 * «تعديل الصورة» (6 · Profile): place the picked photo in the circle, then upload it as the
 * profile photo (docs/profile-photo-plan.md). Opened by the profile tab with the picked photo.
 */
export default function EditPhotoScreen() {
  const params = useLocalSearchParams<{ uri?: string; width?: string; height?: string }>();
  const photo = { uri: params.uri ?? '', width: Number(params.width), height: Number(params.height) };
  const valid = !!photo.uri && photo.width > 0 && photo.height > 0;

  // Reached without a photo (e.g. a reload on web drops the blob: URI): nothing to edit.
  useEffect(() => {
    if (!valid) close();
  }, [valid]);

  return valid ? <Editor photo={photo} /> : null;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}

function Editor({ photo }: { photo: { uri: string; width: number; height: number } }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const crop = useCrop(photo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const jpeg = await cropToAvatar(photo, crop.read());
      await setAvatar(jpeg);
      toast('تم تحديث صورتك الشخصية');
      close();
    } catch (e) {
      // Stays open so the student can try again.
      setError(authErrorMessage(e));
      setSaving(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={close}
          disabled={saving}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
          <Text style={styles.cancelText}>إلغاء</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          تعديل الصورة
        </Text>
        <Pressable
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
          style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}>
          {saving ? <ActivityIndicator color={Brand.white} /> : <Text style={styles.saveText}>حفظ</Text>}
        </Pressable>
      </View>

      <CropView photo={photo} crop={crop} />

      <View style={styles.controls}>
        <ZoomLabel crop={crop} />
        <ZoomSlider
          value={crop.zoom}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          onChange={crop.clamp}
          accessibilityLabel="تكبير"
        />
        <Text style={styles.hint}>ستظهر الصورة داخل الدائرة فقط</Text>
        <FormMessage message={error} />
      </View>
    </View>
  );
}

/** «تكبير» with the zoom as a percentage, following the slider and pinches. */
function ZoomLabel({ crop }: { crop: Crop }) {
  const percent = useZoomPercent(crop.zoom);
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>تكبير</Text>
      <Text style={styles.percent}>{`${percent}%`}</Text>
    </View>
  );
}

function useZoomPercent(zoom: Crop['zoom']) {
  const [percent, setPercent] = useState(Math.round(zoom.get() * 100));
  useAnimatedReaction(
    () => Math.round(zoom.get() * 100),
    (now, previous) => {
      if (now !== previous) scheduleOnRN(setPercent, now);
    }
  );
  return percent;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 20,
    paddingHorizontal: 20,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    height: 44,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  title: {
    fontSize: 17,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  save: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
  },
  saveText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
    color: Brand.white,
  },
  pressed: {
    opacity: 0.7,
  },
  controls: {
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  percent: {
    writingDirection: 'ltr',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  hint: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
