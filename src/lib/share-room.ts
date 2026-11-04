import * as Linking from 'expo-linking';
import { Share } from 'react-native';

/**
 * Shares a room's code and link. The link opens the app straight into the room
 * (src/app/join/[code].tsx). Share isn't available in every browser; callers keep the code on screen.
 */
export function shareRoom(code: string) {
  const link = Linking.createURL(`/join/${code}`);
  const message = [
    `تحدّاني في مباراة! افتح الرابط: ${link}`,
    `أو من «العب مباراة» اختر «تحدَّ صديقاً» ثم «انضم بكود» واكتب الكود: ${code}`,
  ].join('\n');
  Share.share({ message }).catch(() => {});
}
