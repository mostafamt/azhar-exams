import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
