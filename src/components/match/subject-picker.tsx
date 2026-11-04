import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookIcon, CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { groupByCategory, type Category, type Subject } from '@/data/content';
import type { MatchSubject } from '@/data/matches';

// A modal is its own native window, so the root's RTL doesn't reach it (see _layout.tsx).
const rtl: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };

// Web only, as in auth-text-field.tsx: right-aligned like the placeholder, no outline (the
// search row's border is enough). RN's types don't list 'none'; react-native-web passes it through.
const webInput =
  Platform.OS === 'web' ? ({ textAlign: 'right', outlineStyle: 'none' } as unknown as TextStyle) : null;

const RECENTS_KEY = 'match.recentSubjects';
const RECENTS_MAX = 4;
const MIX_ID = '__mix';
const MIX_LABEL = 'متنوع';
// Group dots, from the design; «عام» (متنوع) is always grey.
const GROUP_COLORS = ['#34D399', '#A5B4FC', '#FBBF24', '#F472B6', '#2DD4BF', '#FB923C'];

type Props = {
  subjects: Subject[];
  categories: Category[];
  selected: MatchSubject;
  onSelect: (subject: MatchSubject) => void;
};

/**
 * «المادة» in the match lobby (7a): the selected subject opens a searchable sheet of all subjects
 * by category; below it, the subjects picked most recently.
 */
export function SubjectPicker({ subjects, categories, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((value) => value && setHistory(JSON.parse(value)))
      .catch(() => {});
  }, []);

  const selectedId = selected?.id ?? MIX_ID;
  const byId = new Map<string, MatchSubject>(subjects.map((subject) => [subject.id, subject]));
  byId.set(MIX_ID, null);

  function choose(subject: MatchSubject) {
    const id = subject?.id ?? MIX_ID;
    const next = [id, ...history.filter((x) => x !== id)].slice(0, RECENTS_MAX);
    setHistory(next);
    AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
    setOpen(false);
    onSelect(subject);
  }

  // The selection first, then history, then fill up with the first subjects so the row isn't empty.
  const recentIds = [...new Set([selectedId, ...history, MIX_ID, ...subjects.map((s) => s.id)])]
    .filter((id) => byId.has(id))
    .slice(0, RECENTS_MAX);

  const groups = groupByCategory(categories, subjects);
  const groupName = selected
    ? (groups.find((group) => group.subjects.some((s) => s.id === selected.id))?.name ?? '')
    : 'عام';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`المادة: ${selected?.name ?? MIX_LABEL}، تغيير`}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <View style={styles.triggerIcon}>
          <BookIcon color={Brand.link} size={20} />
        </View>
        <View style={styles.triggerText}>
          <Text style={styles.triggerTitle} numberOfLines={1}>
            {selected?.name ?? MIX_LABEL}
          </Text>
          <Text style={styles.triggerSub} numberOfLines={1}>
            {groupName ? `${groupName} · ` : ''}
            {subjects.length + 1} مادة متاحة
          </Text>
        </View>
        <View style={styles.change}>
          <Text style={styles.changeText}>تغيير</Text>
          <ChevronDownIcon color={Brand.link} size={18} />
        </View>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recents}
        accessibilityLabel="مواد استخدمتها مؤخراً">
        {recentIds.map((id) => {
          const subject = byId.get(id) ?? null;
          return (
            <Chip
              key={id}
              label={subject?.name ?? MIX_LABEL}
              selected={id === selectedId}
              compact
              onPress={() => choose(subject)}
            />
          );
        })}
      </ScrollView>

      <SubjectSheet
        visible={open}
        groups={[{ id: MIX_ID, name: 'عام', subjects: [] as Subject[] }, ...groups]}
        selectedId={selectedId}
        onChoose={choose}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type Group = { id: string; name: string; subjects: Subject[] };

function SubjectSheet({
  visible,
  groups,
  selectedId,
  onChoose,
  onClose,
}: {
  visible: boolean;
  groups: Group[];
  selectedId: string;
  onChoose: (subject: MatchSubject) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');

  function close() {
    setQuery('');
    onClose();
  }

  const q = query.trim();
  const shown = groups
    .map((group, index) => {
      const items: MatchSubject[] = group.id === MIX_ID ? [null] : group.subjects;
      return {
        ...group,
        color: group.id === MIX_ID ? Brand.textMuted : GROUP_COLORS[(index - 1) % GROUP_COLORS.length],
        items: items.filter((s) => !q || (s?.name ?? MIX_LABEL).includes(q)),
      };
    })
    .filter((group) => group.items.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.overlay, rtl]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="إغلاق" />
        <View style={[styles.sheet, { height: height * 0.8 }]} accessibilityViewIsModal>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              اختر المادة
            </Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <CloseIcon color={Brand.text} size={18} />
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <View style={styles.search}>
              <SearchIcon color={Brand.textMuted} size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث عن مادة…"
                placeholderTextColor={Brand.placeholder}
                returnKeyType="search"
                autoCorrect={false}
                style={[styles.searchInput, webInput]}
              />
            </View>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled">
            {shown.map((group) => (
              <View key={group.id} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View style={[styles.dot, { backgroundColor: group.color }]} />
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  <Text style={styles.groupCount}>· {group.items.length}</Text>
                </View>
                <View style={styles.groupItems} accessibilityRole="radiogroup">
                  {group.items.map((subject) => {
                    const id = subject?.id ?? MIX_ID;
                    return (
                      <Chip
                        key={id}
                        label={subject?.name ?? MIX_LABEL}
                        selected={id === selectedId}
                        check
                        onPress={() => {
                          setQuery('');
                          onChoose(subject);
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
            {shown.length === 0 && <Text style={styles.empty}>لا توجد مادة بهذا الاسم</Text>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chip({
  label,
  selected,
  compact,
  check,
  onPress,
}: {
  label: string;
  selected: boolean;
  compact?: boolean;
  check?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && styles.chipOn,
        pressed && styles.pressed,
      ]}>
      {check && selected && <CheckIcon color={Brand.primaryPale} size={14} />}
      <Text style={[styles.chipText, compact && styles.chipTextCompact, selected && styles.chipTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  trigger: {
    height: 58,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
  },
  triggerTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  triggerSub: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
  recents: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipCompact: {
    height: 38,
  },
  chipOn: {
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: '#CBD5E1',
  },
  chipTextCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
  chipTextOn: {
    color: Brand.primaryPale,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#111A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Brand.border,
    boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 19,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  search: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  groupCount: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: '#475569',
  },
  groupItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    paddingVertical: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
