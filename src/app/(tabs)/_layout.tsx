import { Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentIcon, HomeIcon, UserIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';

// The design's «الدوريات» tab waits for the leagues feature (docs/home-plan.md §2.7).
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  useLightStatusBar();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.link,
        tabBarInactiveTintColor: Brand.textMuted,
        tabBarStyle: {
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: Brand.surface,
          borderTopColor: Brand.border,
        },
        tabBarItemStyle: { justifyContent: 'center' },
        sceneStyle: { backgroundColor: Brand.background },
      }}>
      <Tabs.Screen name="index" options={tabOptions('الرئيسية', HomeIcon)} />
      <Tabs.Screen name="exams" options={tabOptions('الامتحانات', DocumentIcon)} />
      <Tabs.Screen name="profile" options={tabOptions('حسابي', UserIcon)} />
    </Tabs>
  );
}

function tabOptions(title: string, Icon: ComponentType<{ color: string; size?: number }>) {
  return {
    title,
    // The tint colors set above are plain strings.
    tabBarIcon: ({ color }: { color: ColorValue }) => <Icon color={color as string} size={22} />,
    // The active tab's label is bold in the design; Cairo needs a separate family per weight.
    tabBarLabel: ({ focused, color }: { focused: boolean; color: ColorValue }) => (
      <Text style={{ color, fontSize: 12, lineHeight: 18, fontFamily: focused ? Fonts.bold : Fonts.semiBold }}>
        {title}
      </Text>
    ),
  };
}
