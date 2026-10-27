import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { LOAD_ERROR_MESSAGE } from '@/components/empty-state';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useGrades } from '@/data/content';
import { useAuth } from '@/hooks/use-auth';

/** Every grade; the grade, subject and exam screens open above the tabs. */
export default function ExamsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const grades = useGrades();

  function openGrade(gradeId: string) {
    // The student's own grade opens on their section.
    const section = gradeId === profile?.gradeId ? profile.sectionId : undefined;
    router.push({ pathname: '/grades/[gradeId]', params: { gradeId, section } });
  }

  let empty;
  if (grades.loading) empty = <ActivityIndicator color={Brand.link} style={styles.state} />;
  else if (grades.error) empty = <Text style={[styles.message, styles.state]}>{LOAD_ERROR_MESSAGE}</Text>;
  else empty = <Text style={[styles.message, styles.state]}>لا توجد صفوف بعد.</Text>;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      data={grades.data}
      keyExtractor={(grade) => grade.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            الامتحانات
          </Text>
          <Text style={styles.subtitle}>اختر الصف لعرض المواد والامتحانات</Text>
        </View>
      }
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openGrade(item.id)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.id === profile?.gradeId && <Chip label="صفّك" tone="indigo" />}
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 16,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  chevron: {
    fontSize: 24,
    color: Brand.textMuted,
  },
  state: {
    paddingVertical: 32,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
