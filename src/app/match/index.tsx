import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackIcon, BotIcon, ForwardIcon, SwordsIcon, TrendIcon, TrophyIcon, UsersIcon } from '@/components/icons';
import { PresetCard } from '@/components/match/preset-card';
import { RecentMatchRow } from '@/components/match/recent-match-row';
import { RoomCodeSheet } from '@/components/match/room-code-sheet';
import { SearchState } from '@/components/match/search-state';
import { SubjectPicker } from '@/components/match/subject-picker';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useCategories, useSubjects } from '@/data/content';
import { PRESETS, type MatchSubject, type PresetId } from '@/data/matches';
import { useAuth } from '@/hooks/use-auth';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { useMatchmaking } from '@/hooks/use-matchmaking';
import { useMyRating } from '@/hooks/use-ratings';
import { useRecentMatches } from '@/hooks/use-recent-matches';
import { useRoom } from '@/hooks/use-room';

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * «مباراة جديدة» (7a · Match Lobby): subject and preset, «ابدأ المباراة» (a ranked match with a
 * random opponent), «لوحة الصدارة», «تحدَّ صديقاً», the bot and «آخر المباريات» (docs/match-plan.md).
 */
export default function MatchLobbyScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const myRating = useMyRating(user?.uid ?? null);
  // The route is only reachable with a profile (see _layout.tsx).
  const me = user && profile ? { uid: user.uid, name: profile.name, rating: myRating.rating } : null;
  const [preset, setPreset] = useState<PresetId>('short');
  const [subject, setSubject] = useState<MatchSubject>(null);
  const subjects = useSubjects(profile?.gradeId ?? '', profile?.sectionId);
  const categories = useCategories(profile?.gradeId ?? '', profile?.sectionId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { room, create, join, reset } = useRoom(me);
  const matchmaking = useMatchmaking(me);
  const { search } = matchmaking;
  const recent = useRecentMatches(user?.uid ?? null);
  useLightStatusBar();

  const foundId = room.status === 'found' ? room.matchId : search.status === 'found' ? search.matchId : null;
  useEffect(() => {
    if (foundId) router.replace({ pathname: '/match/[id]', params: { id: foundId } });
  }, [foundId]);

  const searchingView = search.status === 'searching' || search.status === 'timeout';

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
          مباراة جديدة
        </Text>
        <View style={styles.ratingPill} accessible accessibilityLabel={`تصنيفك ${myRating.rating}`}>
          <TrendIcon color={Brand.link} size={16} />
          <Text style={styles.ratingText}>{myRating.rating.toLocaleString('en-US')}</Text>
        </View>
      </View>

      {searchingView ? (
        <View style={[styles.column, styles.fill, { paddingBottom: insets.bottom }]}>
          <SearchState
            myUid={user?.uid ?? ''}
            myName={profile?.name ?? ''}
            summary={`${subject?.name ?? 'متنوع'} · ${PRESETS[preset].label} · مباراة مصنّفة`}
            startedAt={search.status === 'searching' ? search.startedAt : null}
            onCancel={matchmaking.cancel}
            onRetry={() => matchmaking.start(preset, subject)}
            onChallengeFriend={() => {
              matchmaking.cancel();
              setSheetOpen(true);
            }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.column, styles.sections]}>
            {subjects.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>المادة</Text>
                <SubjectPicker
                  subjects={subjects.data}
                  categories={categories.data}
                  selected={subject}
                  onSelect={setSubject}
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>مدة المباراة</Text>
              <View style={styles.presets} accessibilityRole="radiogroup">
                {PRESET_IDS.map((id) => (
                  <PresetCard
                    key={id}
                    label={PRESETS[id].label}
                    sub={`${PRESETS[id].seconds} ثانية للسؤال`}
                    selected={preset === id}
                    onPress={() => setPreset(id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.startArea}>
              <Pressable
                onPress={() => matchmaking.start(preset, subject)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.start, pressed && styles.startPressed]}>
                <SwordsIcon color={Brand.white} size={22} />
                <Text style={styles.startText}>ابدأ المباراة</Text>
              </Pressable>
              {search.status === 'error' && <Text style={styles.error}>{search.message}</Text>}
            </View>

            <Pressable
              onPress={() => router.navigate('/leagues')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.rowIcon, { backgroundColor: Brand.accentSoft }]}>
                <TrophyIcon color={Brand.accentBright} size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>الأوائل</Text>
                <Text style={styles.rowSubtitle}>أكثر الطلاب نقاط خبرة من المباريات هذا الأسبوع</Text>
              </View>
              <ForwardIcon color={Brand.textMuted} size={18} />
            </Pressable>

            <Pressable
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.rowIcon, { backgroundColor: Brand.successSoft }]}>
                <UsersIcon color={Brand.success} size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>تحدَّ صديقاً</Text>
                <Text style={styles.rowSubtitle}>أنشئ غرفة وشارك الكود، أو انضم بكود صديقك</Text>
              </View>
              <ForwardIcon color={Brand.textMuted} size={18} />
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/match/bot',
                  params: { preset, subjectId: subject?.id ?? '', subjectName: subject?.name ?? '' },
                })
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.rowIcon, { backgroundColor: Brand.primarySoft }]}>
                <BotIcon color={Brand.link} size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>تدرّب ضد الروبوت</Text>
                <Text style={styles.rowSubtitle}>بدون تأثير على تصنيفك</Text>
              </View>
              <ForwardIcon color={Brand.textMuted} size={18} />
            </Pressable>

            {recent.length > 0 && user && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>آخر المباريات</Text>
                {recent.map((match) => (
                  <RecentMatchRow
                    key={match.id}
                    match={match}
                    uid={user.uid}
                    onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <RoomCodeSheet
        // Closes itself while we navigate to the match.
        visible={sheetOpen && room.status !== 'found'}
        room={room}
        presetLabel={PRESETS[preset].label}
        onCreate={() => create(preset, subject)}
        onJoin={join}
        onReset={reset}
        onClose={() => {
          reset();
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  // Phone width on large screens (web), centered.
  fill: {
    flex: 1,
  },
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
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Brand.primarySoft,
  },
  ratingText: {
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.link,
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
    paddingTop: 4,
  },
  sections: {
    gap: 18,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  startArea: {
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  start: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.primary,
    boxShadow: '0 6px 0 #3730A3',
  },
  startPressed: {
    transform: [{ translateY: 3 }],
    boxShadow: '0 3px 0 #3730A3',
  },
  startText: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    color: Brand.white,
  },
  error: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.error,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
