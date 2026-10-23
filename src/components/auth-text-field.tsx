import { useState, type ComponentType, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = TextInputProps & {
  label: string;
  /** Leading icon; brighter while the field is focused. */
  icon: ComponentType<{ color: string; size?: number }>;
  error?: string | null;
  /** Hides the text, with a show/hide toggle. */
  password?: boolean;
  /** Set false to hide the show/hide toggle of a password field, e.g. «تأكيد كلمة المرور». */
  showToggle?: boolean;
  /** Help line under the field; screen readers also read it as the input's hint. */
  hint?: string;
  /** 52 high with a tighter label gap (sign-up design) instead of 54. */
  compact?: boolean;
  ref?: Ref<TextInput>;
};

/** Labeled input of the dark auth designs, with a focus ring and an inline error. */
export function AuthTextField({
  label,
  icon: Icon,
  error,
  password,
  showToggle = true,
  hint,
  compact,
  style,
  onFocus,
  onBlur,
  ref,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  // Emails and passwords: typed left-to-right, no auto-capitalize / autocorrect.
  const latin = password || props.keyboardType === 'email-address';

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          compact && styles.inputRowCompact,
          password && showToggle && styles.inputRowWithToggle,
          focused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}>
        <Icon color={focused ? Brand.link : Brand.textMuted} size={20} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={Brand.placeholder}
          secureTextEntry={password && hidden}
          autoCorrect={latin ? false : props.autoCorrect}
          autoCapitalize={latin ? 'none' : props.autoCapitalize}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, webInput, latin && latinInput, style]}
          {...props}
        />
        {password && showToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور'}>
            {hidden ? <EyeIcon color={Brand.textMuted} size={20} /> : <EyeOffIcon color={Brand.textMuted} size={20} />}
          </Pressable>
        )}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// Web only. iOS/Android already align input text to the RTL layout direction (set on the root
// layout), and they mirror textAlign 'left'/'right' in RTL, so 'right' there would mean left.
// - Right-aligned: in the browser an empty input follows its placeholder's direction.
// - No outline: the row's ring shows focus. RN's types don't list 'none', but react-native-web
//   passes it through to CSS.
const webInput =
  Platform.OS === 'web' ? ({ textAlign: 'right', outlineStyle: 'none' } as unknown as TextStyle) : null;
// Emails and passwords are typed left-to-right but stay right-aligned like the labels.
// Android aligns by the text's own direction, so LTR text would sit on the left without this.
const latinInput: TextStyle | null =
  Platform.OS === 'web' ? { writingDirection: 'ltr' } : Platform.OS === 'android' ? { textAlign: 'right' } : null;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  containerCompact: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  inputRowCompact: {
    minHeight: 52,
  },
  // The toggle's own 44pt touch area replaces most of the end padding.
  inputRowWithToggle: {
    paddingEnd: 6,
  },
  inputRowFocused: {
    borderColor: Brand.primaryBright,
    boxShadow: '0 0 0 4px rgba(99,102,241,0.15)',
  },
  inputRowError: {
    borderColor: Brand.error,
  },
  input: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Brand.text,
  },
  toggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  error: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Brand.error,
  },
});
