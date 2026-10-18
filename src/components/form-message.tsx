import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

const TONES = {
  error: { backgroundColor: Colors.errorSoft, color: Colors.error },
  success: { backgroundColor: Colors.successSoft, color: Colors.success },
};

/** Banner above a form's submit button, e.g. a Firebase error or "email sent". */
export function FormMessage({ message, tone = 'error' }: { message?: string | null; tone?: keyof typeof TONES }) {
  if (!message) return null;
  const { backgroundColor, color } = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor }]} accessibilityRole="alert">
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
  },
});
