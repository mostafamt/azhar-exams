import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>امتحانات الثانوية الأزهرية 📚</Text>
        <Text style={styles.subtitle}>المواد الشرعية والعربية - الصف الثالث الثانوي</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/subjects')}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>ابدأ المذاكرة الآن</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});