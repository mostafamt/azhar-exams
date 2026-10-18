import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LOAD_ERROR_MESSAGE } from '@/components/empty-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Colors } from '@/constants/colors';
import { useGrades, useSections } from '@/data/content';

type Value = { gradeId: string; sectionId: string };

type Props = {
  value: Value;
  onChange: (value: Value) => void;
  error?: string | null;
};

/** Grade (الصف) and section (الشعبة) picked from the live Firestore tree. */
export function GradeSectionPicker({ value, onChange, error }: Props) {
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
      <Field label="الصف" loading={grades.loading} failed={!!grades.error}>
        <Options
          options={grades.data}
          selectedId={value.gradeId}
          onChange={(gradeId) => gradeId !== value.gradeId && onChange({ gradeId, sectionId: '' })}
        />
      </Field>
      {value.gradeId ? (
        <Field label="الشعبة" loading={sections.loading} failed={!!sections.error}>
          {sections.data.length === 0 && !sections.loading ? (
            <Text style={styles.hint}>لا توجد شعب لهذا الصف بعد.</Text>
          ) : (
            <Options
              options={sections.data}
              selectedId={value.sectionId}
              onChange={(sectionId) => onChange({ gradeId: value.gradeId, sectionId })}
            />
          )}
        </Field>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Field({
  label,
  loading,
  failed,
  children,
}: {
  label: string;
  loading: boolean;
  failed: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : failed ? (
        <Text style={styles.error}>{LOAD_ERROR_MESSAGE}</Text>
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
}: {
  options: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  if (options.length <= 3) {
    return (
      <SegmentedControl
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
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.name}</Text>
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
});
