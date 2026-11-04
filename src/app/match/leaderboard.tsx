import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BackIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/use-auth';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { useLeaderboard } from '@/hooks/use-ratings';
import { toArabicDigits } from '@/utils/arabic';

const MEDALS = [Brand.accentBright, '#CBD5E1', '#D97706'];

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/match');
}

/** «لوحة الصدارة»: the top players by match rating (docs/match-plan.md §9). */
export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { players, status } = useLeaderboard();
  useLightStatusBar();

  let body;
  if (status === 'loading') body = <ActivityIndicator size="large" color={Brand.link} style={styles.spinner} />;
  else if (status === 'error') body = <Text style={styles.message}>تعذّر التحميل، تحقق من اتصالك بالإنترنت.</Text>;
  else if (players.length === 0) {
    body = <Text style={styles.message}>لا توجد نتائج بعد. العب مباراة من «ابدأ المباراة» لتظهر هنا.</Text>;
  } else {
    body = players.map((player, i) => {
      const mine = player.uid === user?.uid;
      return (
        <View
          key={player.uid}
          style={[styles.row, mine && styles.rowMine]}
          accessible
          accessibilityLabel={`المركز ${i + 1}، ${player.name}، التصنيف ${player.rating}`}>
          <Text style={[styles.rank, i < MEDALS.length && { color: MEDALS[i] }]}>{toArabicDigits(i + 1)}</Text>
          <Avatar
            uid={player.uid}
            name={player.name}
            size={36}
            backgroundColor={mine ? Brand.primaryDeep : Brand.border}
            color={mine ? Brand.primaryPale : Brand.text}
          />
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {mine ? `${player.name} (أنت)` : player.name}
            </Text>
            <Text style={styles.record}>
              {toArabicDigits(player.wins)} فوز · {toArabicDigits(player.losses)} خسارة ·{' '}
              {toArabicDigits(player.draws)} تعادل
            </Text>
          </View>
          <Text style={styles.rating}>{player.rating.toLocaleString('en-US')}</Text>
        </View>
      );
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={[styles.column, styles.header]}>
        <Pressable
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <BackIcon color={Brand.text} size={20} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          لوحة الصدارة
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.column, styles.list]}>{body}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 34,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  content: {
    paddingHorizontal: 20,
  },
  list: {
    gap: 8,
  },
  spinner: {
    paddingVertical: 40,
  },
  message: {
    paddingVertical: 40,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  rowMine: {
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  rank: {
    width: 26,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  record: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  rating: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.link,
  },
});
