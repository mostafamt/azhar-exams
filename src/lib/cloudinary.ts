import { PixelRatio } from 'react-native';

/**
 * Profile photos go straight from the device to Cloudinary through an *unsigned upload preset*,
 * like the dashboard's exam pages (../azhar-exams-dashboard/src/lib/cloudinary.js). No API secret
 * ships in the app; the preset only accepts small JPEGs. Set it up as in docs/profile-photo-plan.md §3.1.
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const AVATAR_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_AVATAR_PRESET;
const API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

/**
 * Its own root folder: the dashboard's cleanup script deletes every image under azhar-exams/
 * that no exam uses. firestore.rules only accept URLs under azhar-avatars/{uid}/.
 */
const AVATAR_FOLDER = 'azhar-avatars';

/** Error codes are mapped to Arabic messages in auth-errors.ts. */
function cloudinaryError(code: 'config' | 'network' | 'rejected', message: string, cause?: unknown) {
  return Object.assign(new Error(message, { cause }), { code: `cloudinary/${code}` });
}

export type UploadedAvatar = { secureUrl: string; publicId: string; deleteToken?: string };

/**
 * Uploads a base64 JPEG (no `data:` prefix) as azhar-avatars/{uid}/{id}. Unsigned presets can't
 * overwrite, so every photo gets a new id, which also gives it a new URL that no cache has seen.
 */
export async function uploadAvatar(base64Jpeg: string, uid: string, id: string): Promise<UploadedAvatar> {
  if (!CLOUD_NAME || !AVATAR_PRESET) {
    throw cloudinaryError(
      'config',
      'Missing EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME / EXPO_PUBLIC_CLOUDINARY_AVATAR_PRESET'
    );
  }

  // A data URI works as `file` on every platform, so there's no Blob / { uri, name, type } split.
  const form = new FormData();
  form.append('file', `data:image/jpeg;base64,${base64Jpeg}`);
  form.append('upload_preset', AVATAR_PRESET);
  form.append('folder', `${AVATAR_FOLDER}/${uid}`);
  form.append('public_id', id);

  let response: Response;
  try {
    response = await fetch(`${API}/image/upload`, { method: 'POST', body: form });
  } catch (error) {
    throw cloudinaryError('network', 'Could not reach Cloudinary', error);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.secure_url) {
    throw cloudinaryError('rejected', `Cloudinary: ${body?.error?.message ?? response.status}`);
  }
  return { secureUrl: body.secure_url, publicId: body.public_id, deleteToken: body.delete_token };
}

/**
 * Undoes an upload within ~10 minutes, using the delete_token the preset returns ("Return delete
 * token" on). Best effort: never throws. Used when saving the URL to Firestore fails.
 */
export async function deleteByToken(token: string | undefined) {
  if (!token) return;
  try {
    const form = new FormData();
    form.append('token', token);
    await fetch(`${API}/delete_by_token`, { method: 'POST', body: form });
  } catch (error) {
    if (__DEV__) console.warn('Could not roll back Cloudinary upload', error);
  }
}

// Few sizes, so Cloudinary makes (and bills) few derived images per photo.
const SIZES = [64, 128, 256, 512];

/**
 * A square, face-centred copy sized for an avatar `size` points wide on this screen. f_auto and
 * q_auto pick WebP/AVIF and the quality, so a small row avatar downloads a few KB.
 */
export function avatarUrl(url: string, size: number) {
  const pixels = size * PixelRatio.get();
  const px = SIZES.find((s) => s >= pixels) ?? SIZES[SIZES.length - 1];
  return url.replace('/image/upload/', `/image/upload/c_fill,g_face,w_${px},h_${px},f_auto,q_auto/`);
}
