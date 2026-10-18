import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  /** Hides the text, with a show/hide toggle. */
  password?: boolean;
};

/** Labeled input with an inline error. Alignment follows the (RTL) layout direction. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, password, style, ...props },
  ref
) {
  const [hidden, setHidden] = useState(true);
  // Emails and passwords: no auto-capitalize / autocorrect.
  const latin = password || props.keyboardType === 'email-address';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={password && hidden}
          autoCorrect={latin ? false : props.autoCorrect}
          autoCapitalize={latin ? 'none' : props.autoCapitalize}
          style={[styles.input, style]}
          {...props}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور'}>
            <Text style={styles.toggle}>{hidden ? 'إظهار' : 'إخفاء'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  toggle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  error: {
    fontSize: 13,
    color: Colors.error,
  },
});
