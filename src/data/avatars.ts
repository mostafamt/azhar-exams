import { collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, type DocumentSnapshot } from 'firebase/firestore';

import { auth } from '@/lib/auth';
import { deleteByToken, uploadAvatar } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';

/**
 * avatars/{uid}: the Cloudinary URL of a student's profile photo (docs/profile-photo-plan.md).
 * Readable by any signed-in user, so opponents and the leaderboard can show it; only the owner
 * writes it. ../azhar-exams-dashboard/firestore.rules accept only URLs under azhar-avatars/{uid}/.
 * No document = no photo.
 */
export type Avatar = {
  /** secure_url of the 512 px original; show it through avatarUrl(url, size). */
  url: string;
  /** Cloudinary public_id, so the cleanup script can match files to students. */
  publicId: string;
};

export const avatarRef = (uid: string) => doc(db, 'avatars', uid);

export function toAvatar(snapshot: DocumentSnapshot): Avatar | null {
  const data = snapshot.data();
  return typeof data?.url === 'string' ? { url: data.url, publicId: data.publicId } : null;
}

// Photo URL per uid for this session, so lists and match screens read each avatar once.
// undefined = not read yet, null = no photo.
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export function cachedAvatarUrl(uid: string) {
  return cache.get(uid);
}

/** The photo URL of `uid`, read once per session; null when there's none or it can't be read. */
export function loadAvatarUrl(uid: string): Promise<string | null> {
  if (cache.has(uid)) return Promise.resolve(cache.get(uid) ?? null);
  let request = pending.get(uid);
  if (!request) {
    request = getDoc(avatarRef(uid))
      .then((snapshot) => {
        const url = toAvatar(snapshot)?.url ?? null;
        cache.set(uid, url);
        return url;
      })
      // Not cached, so a later screen tries again (e.g. after the connection comes back).
      .catch(() => null)
      .finally(() => pending.delete(uid));
    pending.set(uid, request);
  }
  return request;
}

/** Keeps the cache in step with a live snapshot of the same document (my own avatar). */
export function rememberAvatarUrl(uid: string, url: string | null) {
  cache.set(uid, url);
}

/**
 * Uploads a cropped 512 px JPEG (base64, no `data:` prefix) and makes it the signed-in student's
 * photo. If the Firestore write fails, the upload is rolled back so it doesn't linger unused.
 * The previous photo stays on Cloudinary until the dashboard's cleanup script removes it.
 */
export async function setAvatar(base64Jpeg: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  // A Firestore auto-id: 20 random letters and digits, which the rules' URL pattern allows.
  const id = doc(collection(db, 'avatars')).id;
  const uploaded = await uploadAvatar(base64Jpeg, user.uid, id);
  try {
    await setDoc(avatarRef(user.uid), {
      url: uploaded.secureUrl,
      publicId: uploaded.publicId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteByToken(uploaded.deleteToken);
    throw error;
  }
  cache.set(user.uid, uploaded.secureUrl);
}

/** Removes the signed-in student's photo; the file itself is left for the cleanup script. */
export async function removeAvatar() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await deleteDoc(avatarRef(user.uid));
  cache.set(user.uid, null);
}
