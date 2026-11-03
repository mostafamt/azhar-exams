import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MatchClock } from '@/components/match/match-clock';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  name: string;
  /** Shown instead of the name, e.g. «أنت». */
  label?: string;
  /** Rating at the start of a ranked match, shown after the name. */
  rating?: number;
  variant: 'me' | 'opponent';
  status: ReactNode;
  clock: number;
  low: boolean;
  /** An emoji they just sent («تفاعل»). */
  reaction?: string | null;
};

/** Avatar, name, status line and clock box: the opponent above the question, me below it (7b). */
export function PlayerRow({ name, label, rating, variant, status, clock, low, reaction }: Props) {
  const mine = variant === 'me';
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, mine ? styles.avatarMine : styles.avatarOpponent]}>
        <Text style={[styles.initial, { color: mine ? Brand.primaryPale : '#FDE68A' }]}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {label ?? name}
          </Text>
          {rating !== undefined && <Text style={styles.rating}>({rating.toLocaleString('en-US')})</Text>}
          {reaction && (
            <Text style={styles.reaction} accessibilityLiveRegion="polite" accessibilityLabel={`تفاعل ${reaction}`}>
              {reaction}
            </Text>
          )}
        </View>
        <View accessibilityLiveRegion="polite">{status}</View>
      </View>
      <MatchClock ms={clock} low={low} variant={variant} />
    </View>
  );
}

/** One line of status text under a player's name. */
export function PlayerStatus({
  text,
  color = Brand.textMuted,
  icon,
}: {
  text: string;
  color?: string;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.status}>
      {icon}
      <Text style={[styles.statusText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** «يفكّر…», pulsing like the design's dots. */
export function ThinkingStatus() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.25, { duration: 600 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.Text style={[styles.statusText, styles.thinking, pulse]}>يفكّر…</Animated.Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMine: {
    backgroundColor: Brand.primaryDeep,
    borderColor: Brand.primaryBright,
  },
  avatarOpponent: {
    backgroundColor: '#78350F',
    borderColor: Brand.accent,
  },
  initial: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  reaction: {
    fontSize: 22,
    lineHeight: 28,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.bold,
  },
  thinking: {
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
});
