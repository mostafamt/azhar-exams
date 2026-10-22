import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LOAD_ERROR_MESSAGE } from '@/components/empty-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Brand, Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useGrades, useSections } from '@/data/content';

type Value = { gradeId: string; sectionId: string };

type Props = {
  value: Value;
  onChange: (value: Value) => void;
  error?: string | null;
  /** 'dark' for the screens built from the new dark designs (sign-up). */
  tone?: 'light' | 'dark';
};

/** Grade (الصف) and section (الشعبة) picked from the live Firestore tree. */
export function GradeSectionPicker({ value, onChange, error, tone = 'light' }: Props) {
  const grades = useGrades();
  const sections = useSections(value.gradeId);

  // Nothing to choose when there's a single option.
  useEffect(() => {
    if (!value.gradeId && grades.data.length === 1) onChange({ gradeId: grades.data[0].id, sectionId: '' });
  }, [grades.data, value.gradeId, onChange]);
  useEffect(() => {
    if (value.gradeId && !value.sectionId && sections.data.length === 1) {
      onChange({ gradeId: value.gradeId, sectionId: sections.data[0].id });
    }
  }, [sections.data, value.gradeId, value.sectionId, onChange]);

  return (
    <View style={styles.container}>
      <Field label="الصف" loading={grades.loading} failed={!!grades.error} tone={tone}>
        <Options
          tone={tone}
          options={grades.data}
          selectedId={value.gradeId}
          onChange={(gradeId) => gradeId !== value.gradeId && onChange({ gradeId, sectionId: '' })}
        />
      </Field>
      {value.gradeId ? (
        <Field label="الشعبة" loading={sections.loading} failed={!!sections.error} tone={tone}>
          {sections.data.length === 0 && !sections.loading ? (
            <Text style={[styles.hint, tone === 'dark' && styles.hintDark]}>لا توجد شعب لهذا الصف بعد.</Text>
          ) : (
            <Options
              tone={tone}
              options={sections.data}
              selectedId={value.sectionId}
              onChange={(sectionId) => onChange({ gradeId: value.gradeId, sectionId })}
            />
          )}
        </Field>
      ) : null}
      {error ? <Text style={[styles.error, tone === 'dark' && styles.errorDark]}>{error}</Text> : null}
    </View>
  );
}

function Field({
  label,
  loading,
  failed,
  tone,
  children,
}: {
  label: string;
  loading: boolean;
  failed: boolean;
  tone: 'light' | 'dark';
  children: React.ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <View style={styles.field}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={dark ? Brand.link : Colors.primary} style={styles.loading} />
      ) : failed ? (
        <Text style={[styles.error, dark && styles.errorDark]}>{LOAD_ERROR_MESSAGE}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/** A segmented control for up to 3 options, wrapping chips beyond that. */
function Options({
  options,
  selectedId,
  onChange,
  tone,
}: {
  options: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
  tone: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  if (options.length <= 3) {
    return (
      <SegmentedControl
        tone={tone}
        options={options.map((o) => ({ id: o.id, label: o.name }))}
        selectedId={selectedId}
        onChange={onChange}
      />
    );
  }
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              dark && styles.chipDark,
              dark && selected && styles.chipSelectedDark,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.chipText,
                selected && styles.chipTextSelected,
                dark && styles.chipTextDark,
                dark && selected && styles.chipTextSelectedDark,
              ]}>
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  loading: {
    paddingVertical: 12,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  error: {
    fontSize: 13,
    color: Colors.error,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 15,
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Dark tone (sign-up). Cairo has a separate family per weight, so fontWeight is reset.
  labelDark: {
    fontFamily: Fonts.semiBold,
    fontWeight: 'normal',
    color: Brand.text,
  },
  hintDark: {
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  errorDark: {
    fontFamily: Fonts.regular,
    color: Brand.error,
  },
  chipDark: {
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  chipSelectedDark: {
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  chipTextDark: {
    fontFamily: Fonts.semiBold,
    fontWeight: 'normal',
    color: Brand.text,
  },
  chipTextSelectedDark: {
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
});
