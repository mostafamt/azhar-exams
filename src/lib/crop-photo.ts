import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { PickedPhoto } from '@/lib/pick-photo';

/** Saved size: enough for the largest avatar (76 pt × 3) with room for Cloudinary to shrink it. */
const AVATAR_PX = 512;

/** What the crop screen shows: the photo at `cover` size for a circle `viewport` wide, zoomed and moved. */
export type CropState = { viewport: number; zoom: number; tx: number; ty: number };

/**
 * The square of the photo (in its own pixels) that's inside the circle (docs/profile-photo-plan.md
 * §5.2). The photo is centred, moved by (tx, ty) and scaled around its centre, so the circle's
 * centre lands on photo point (w/2 − tx/scale, h/2 − ty/scale).
 */
export function cropRect({ width: w, height: h }: PickedPhoto, { viewport, zoom, tx, ty }: CropState) {
  const scale = (viewport / Math.min(w, h)) * zoom;
  const side = Math.min(Math.round(viewport / scale), w, h);
  const clamp = (value: number, max: number) => Math.min(Math.max(Math.round(value), 0), max);
  return {
    originX: clamp(w / 2 - tx / scale - side / 2, w - side),
    originY: clamp(h / 2 - ty / scale - side / 2, h - side),
    width: side,
    height: side,
  };
}

/** Crops the circle's square, scales it to 512 px and returns it as base64 JPEG (no `data:` prefix). */
export async function cropToAvatar(photo: PickedPhoto, crop: CropState): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  try {
    context.crop(cropRect(photo, crop)).resize({ width: AVATAR_PX, height: AVATAR_PX });
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!result.base64) throw Object.assign(new Error('No base64'), { code: 'photo/encode' });
      return result.base64;
    } finally {
      image.release();
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'photo/encode') throw error;
    throw Object.assign(new Error('Could not crop the photo', { cause: error }), { code: 'photo/encode' });
  } finally {
    context.release();
  }
}
