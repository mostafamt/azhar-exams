import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AuthButton } from '@/components/auth-button';
import { Avatar } from '@/components/avatar';
import { UsersIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  myUid: string;
  myName: string;
  /** e.g. «متنوع · 5 أسئلة · ودية». */
  summary: string;
  /** Set while searching; null once the search timed out. */
  startedAt: number | null;
  onCancel: () => void;
  onRetry: () => void;
  onChallengeFriend: () => void;
};

function formatElapsed(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** «جارٍ البحث عن منافس…»: me vs a pulsing «؟» (7a searching state), then the no-opponent fallback. */
export function SearchState({ myUid, myName, summary, startedAt, onCancel, onRetry, onChallengeFriend }: Props) {
  const searching = startedAt !== null;

  return (
    <View style={styles.container}>
      <View style={styles.players}>
        <View style={styles.player}>
          <Avatar uid={myUid} name={myName} size={AVATAR} ring={{ width: 3, color: Brand.primaryBright }} />
          <Text style={styles.name}>أنت</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.player}>
          <View style={styles.avatarBox}>
            {searching && <Ping />}
            <View style={[styles.avatar, styles.avatarUnknown]}>
              <Text style={[styles.avatarText, styles.unknownText]}>؟</Text>
            </View>
          </View>
          <Text style={[styles.name, styles.muted]}>منافس</Text>
        </View>
      </View>

      {searching ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <View style={styles.statusRow}>
            <ActivityIndicator color={Brand.primaryBright} />
            <Text style={styles.statusTitle}>جارٍ البحث عن منافس…</Text>
          </View>
          <Text style={styles.summary}>{summary}</Text>
          <Elapsed startedAt={startedAt} />
        </View>
      ) : (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Text style={styles.statusTitle}>لا يوجد منافسون الآن</Text>
          <Text style={styles.summary}>جرّب البحث مرة أخرى، أو تحدَّ صديقاً بكود.</Text>
        </View>
      )}

      <View style={styles.actions}>
        {searching ? (
          <AuthButton title="إلغاء البحث" variant="outline" onPress={onCancel} />
        ) : (
          <>
            <AuthButton title="استمر في البحث" onPress={onRetry} />
            <AuthButton
              title="تحدَّ صديقاً"
              variant="outline"
              icon={<UsersIcon color={Brand.text} size={20} />}
              onPress={onChallengeFriend}
            />
            <AuthButton title="رجوع" variant="outline" onPress={onCancel} />
          </>
        )}
      </View>
    </View>
  );
}

/** Seconds since the search started; ticks on its own so the lobby doesn't re-render. */
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <Text style={styles.elapsed}>{formatElapsed(now - startedAt)}</Text>;
}

/** The amber ring that grows and fades around «؟». */
function Ping() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false));
    return () => cancelAnimation(progress);
  }, [progress]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progress.get()),
    transform: [{ scale: 1 + 0.9 * progress.get() }],
  }));
  return <Animated.View style={[styles.ping, ring]} />;
}

const AVATAR = 84;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
  },
  players: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  player: {
    alignItems: 'center',
    gap: 8,
  },
  avatarBox: {
    width: AVATAR,
    height: AVATAR,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnknown: {
    backgroundColor: Brand.surface,
    borderColor: '#475569',
    borderStyle: 'dashed',
  },
  avatarText: {
    fontSize: 30,
    lineHeight: 44,
    fontFamily: Fonts.extraBold,
    color: Brand.primaryPale,
  },
  unknownText: {
    color: Brand.textMuted,
  },
  ping: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: Brand.accent,
  },
  name: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  muted: {
    color: Brand.textMuted,
  },
  vs: {
    fontSize: 22,
    lineHeight: 34,
    fontFamily: Fonts.extraBold,
    color: Brand.accent,
  },
  status: {
    alignItems: 'center',
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
    textAlign: 'center',
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  elapsed: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
  },
});
