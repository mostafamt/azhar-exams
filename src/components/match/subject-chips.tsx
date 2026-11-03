import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { MatchSubject } from '@/data/matches';

type Props = {
  subjects: { id: string; name: string }[];
  selected: MatchSubject;
  onSelect: (subject: MatchSubject) => void;
};

/** «المادة» in the match lobby (7a): «متنوع» (the whole bank) or one of my section's subjects. */
export function SubjectChips({ subjects, selected, onSelect }: Props) {
  const options: MatchSubject[] = [null, ...subjects];
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((subject) => {
        const on = (subject?.id ?? null) === (selected?.id ?? null);
        const label = subject?.name ?? 'متنوع';
        return (
          <Pressable
            key={subject?.id ?? 'mix'}
            onPress={() => onSelect(subject)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
            <Text style={[styles.text, on && styles.textOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  textOn: {
    color: Brand.link,
  },
});
