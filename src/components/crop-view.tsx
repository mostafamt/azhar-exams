import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand } from '@/constants/colors';
import type { CropState } from '@/lib/crop-photo';
import type { PickedPhoto } from '@/lib/pick-photo';

/** The design's circle; smaller on narrow or short screens. */
const MAX_VIEWPORT = 300;
const MARGIN = 20;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export type Crop = {
  zoom: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  /** The circle's diameter, set once the crop view is laid out (0 before). */
  viewport: SharedValue<number>;
  /** Pulls the photo back so it still covers the circle, e.g. after zooming out. */
  clamp: () => void;
  /** The current values, for cropToAvatar. */
  read: () => CropState;
};

/** Zoom and position of the photo in the crop circle, shared by the crop view and the slider. */
export function useCrop({ width: w, height: h }: PickedPhoto): Crop {
  const zoom = useSharedValue(MIN_ZOOM);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const viewport = useSharedValue(0);

  const clamp = () => {
    'worklet';
    const vp = viewport.get();
    if (vp <= 0) return;
    // Displayed size at zoom 1 is `cover` for the circle; the photo may move until an edge
    // reaches the circle.
    const base = vp / Math.min(w, h);
    const maxX = Math.max(0, (w * base * zoom.get() - vp) / 2);
    const maxY = Math.max(0, (h * base * zoom.get() - vp) / 2);
    tx.set(Math.min(Math.max(tx.get(), -maxX), maxX));
    ty.set(Math.min(Math.max(ty.get(), -maxY), maxY));
  };

  const read = () => ({ viewport: viewport.get(), zoom: zoom.get(), tx: tx.get(), ty: ty.get() });

  return { zoom, tx, ty, viewport, clamp, read };
}

/**
 * The photo under a circle (6 · Profile «تعديل الصورة»): drag to move it, pinch (or the slider)
 * to zoom. Everything outside the circle is dimmed, as in the design.
 */
export function CropView({ photo, crop }: { photo: PickedPhoto; crop: Crop }) {
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startZoom = useSharedValue(MIN_ZOOM);
  // Only shared values and worklets go into the gesture callbacks (not `read`, a plain function).
  const { zoom, tx, ty, clamp } = crop;

  const viewport = area ? Math.max(0, Math.min(MAX_VIEWPORT, area.width - MARGIN * 2, area.height - MARGIN * 2)) : 0;
  const base = viewport / Math.min(photo.width, photo.height);
  const shown = { width: photo.width * base, height: photo.height * base };

  // Transforms are physical on every platform, so dragging right moves the photo right in RTL too.
  const pan = Gesture.Pan()
    .onStart(() => {
      startX.set(tx.get());
      startY.set(ty.get());
    })
    .onUpdate((event) => {
      tx.set(startX.get() + event.translationX);
      ty.set(startY.get() + event.translationY);
      clamp();
    });

  const pinch = Gesture.Pinch()
    .onStart(() => startZoom.set(zoom.get()))
    .onUpdate((event) => {
      zoom.set(Math.min(Math.max(startZoom.get() * event.scale, MIN_ZOOM), MAX_ZOOM));
      clamp();
    });

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: zoom.get() }],
  }));

  const r = viewport / 2;
  const cx = (area?.width ?? 0) / 2;
  const cy = (area?.height ?? 0) / 2;

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <View
        style={styles.area}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setArea({ width, height });
          crop.viewport.set(Math.max(0, Math.min(MAX_VIEWPORT, width - MARGIN * 2, height - MARGIN * 2)));
          clamp();
        }}
        accessibilityLabel="معاينة الصورة، اسحب لتحريكها"
        accessibilityRole="image">
        {area && viewport > 0 ? (
          <>
            {/* Centred: equal left and right, so RTL swapping them changes nothing. */}
            <Animated.View
              style={[
                styles.photo,
                {
                  width: shown.width,
                  height: shown.height,
                  left: (area.width - shown.width) / 2,
                  top: (area.height - shown.height) / 2,
                },
                photoStyle,
              ]}>
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
            <Svg width={area.width} height={area.height} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path
                d={`M0 0H${area.width}V${area.height}H0Z M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`}
                fill="rgba(2,6,23,0.6)"
                fillRule="evenodd"
              />
              <Circle cx={cx} cy={cy} r={r - 1.5} stroke={Brand.primaryBright} strokeWidth={3} fill="none" />
            </Svg>
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
  },
});
