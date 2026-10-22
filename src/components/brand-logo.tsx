import { StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/icons';
import { Brand } from '@/constants/colors';

/** 80×80 app logo tile with an 8px glow ring. */
export function BrandLogo() {
  return (
    <View style={styles.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LogoMark />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // A spread-only shadow draws the ring without taking up layout space, as in the design.
    boxShadow: '0 0 0 8px rgba(99,102,241,0.15)',
  },
});
