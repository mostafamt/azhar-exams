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
  ref?: Ref<TextInput>;
};

/** Labeled input of the dark auth designs, with a focus ring and an inline error. */
export function AuthTextField({ label, icon: Icon, error, password, style, onFocus, onBlur, ref, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  // Emails and passwords: typed left-to-right, no auto-capitalize / autocorrect.
  const latin = password || props.keyboardType === 'email-address';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          password && styles.inputRowWithToggle,
          focused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}>
        <Icon color={focused ? Brand.link : Brand.textMuted} size={20} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
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
          style={[styles.input, noBrowserOutline, latin && styles.inputLatin, style]}
          {...props}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور'}>
            {hidden ? <EyeIcon color={Brand.textMuted} size={20} /> : <EyeOffIcon color={Brand.textMuted} size={20} />}
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// Web: the row's ring shows focus, not the browser outline. RN's types don't list 'none', but
// react-native-web passes it through to CSS.
const noBrowserOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const styles = StyleSheet.create({
  container: {
    gap: 8,
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
  // LTR text, still right-aligned like the labels.
  inputLatin: {
    writingDirection: 'ltr',
    textAlign: 'right',
  },
  toggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Brand.error,
  },
});
