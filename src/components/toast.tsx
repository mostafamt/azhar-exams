import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Tone = 'success' | 'error';
type Toast = { id: number; text: string; tone: Tone };

const TONES = {
  success: { backgroundColor: '#064E3B', borderColor: Brand.successStrong, color: '#D1FAE5', icon: Brand.success },
  error: { backgroundColor: '#7F1D1D', borderColor: Brand.danger, color: '#FEE2E2', icon: Brand.error },
};

const HIDE_AFTER_MS = 2500;

const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null);

/**
 * A short message at the top of the screen (6 · Profile: «تم تحديث صورتك الشخصية»). Lives at the
 * root, so a screen can show one and go back, e.g. the crop screen after saving.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((text: string, tone: Tone = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const tone = toast ? TONES[toast.tone] : null;

  return (
    <ToastContext value={show}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + 16 }]}>
        {toast && tone ? (
          <Animated.View
            key={toast.id}
            entering={FadeInUp}
            exiting={FadeOutUp}
            style={[styles.toast, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
            {toast.tone === 'success' ? (
              <CheckIcon color={tone.icon} size={18} strokeWidth={3} />
            ) : (
              <CloseIcon color={tone.icon} size={18} strokeWidth={3} />
            )}
            <Text style={[styles.text, { color: tone.color }]}>{toast.text}</Text>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext>
  );
}

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
  },
});
