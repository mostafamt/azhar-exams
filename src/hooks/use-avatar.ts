import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { avatarRef, cachedAvatarUrl, loadAvatarUrl, rememberAvatarUrl, toAvatar } from '@/data/avatars';
import { useAuth } from '@/hooks/use-auth';

/**
 * Someone's photo URL; null while loading or without one. My own is live (useMyAvatar), so the
 * match rows and lists never show a stale «no photo» after I change it; anyone else's is read once
 * per session (see data/avatars.ts).
 */
export function useAvatar(uid: string | null | undefined) {
  const { user } = useAuth();
  const mine = !!uid && uid === user?.uid;
  const live = useMyAvatar(mine ? uid : null);
  const cached = useCachedAvatar(mine ? null : uid);
  return mine ? live.url : cached;
}

function useCachedAvatar(uid: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ uid: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!uid || cachedAvatarUrl(uid) !== undefined) return;
    let active = true;
    loadAvatarUrl(uid).then((url) => active && setLoaded({ uid, url }));
    return () => {
      active = false;
    };
  }, [uid]);

  if (!uid) return null;
  return cachedAvatarUrl(uid) ?? (loaded?.uid === uid ? loaded.url : null);
}

/** My own photo URL, live, so a change shows at once on Profile, Home and in matches. */
export function useMyAvatar(uid: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ uid: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      avatarRef(uid),
      (snapshot) => {
        const url = toAvatar(snapshot)?.url ?? null;
        rememberAvatarUrl(uid, url);
        setLoaded({ uid, url });
      },
      () => setLoaded({ uid, url: null })
    );
  }, [uid]);

  const known = !!uid && loaded?.uid === uid;
  return { url: known ? loaded.url : null, loading: !!uid && !known };
}
