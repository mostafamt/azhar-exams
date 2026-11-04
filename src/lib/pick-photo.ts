import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** docs/profile-photo-plan.md §2 #10: checked on the picked file, before cropping shrinks it. */
const MAX_BYTES = 5 * 1024 * 1024;

export type PhotoSource = 'camera' | 'library';

export type PickedPhoto = { uri: string; width: number; height: number };

export type PickResult =
  | { status: 'picked'; photo: PickedPhoto }
  | { status: 'cancelled' }
  /** Permission was refused for good; only the system settings can grant it now. */
  | { status: 'blocked' };

/** Error codes are mapped to Arabic messages in auth-errors.ts. */
function photoError(code: 'too-big' | 'not-image') {
  return Object.assign(new Error(`photo/${code}`), { code: `photo/${code}` });
}

async function permitted(source: PhotoSource): Promise<boolean | 'blocked'> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;
  return permission.canAskAgain ? false : 'blocked';
}

/**
 * Takes or chooses one photo for the avatar. The picker's own crop UI isn't used (square on iOS,
 * missing on web, no zoom); the crop screen does that. Throws photo/too-big or photo/not-image.
 */
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  // Web: browsers only open the file chooser from the tap itself, so nothing may be awaited
  // before launching (and web has no permission prompts anyway).
  if (Platform.OS !== 'web') {
    const allowed = await permitted(source);
    if (allowed === 'blocked') return { status: 'blocked' };
    if (!allowed) return { status: 'cancelled' };
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: false, quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { status: 'cancelled' };
  if (asset.mimeType && !asset.mimeType.startsWith('image/')) throw photoError('not-image');
  const bytes = asset.fileSize ?? asset.file?.size;
  if (bytes && bytes > MAX_BYTES) throw photoError('too-big');
  return { status: 'picked', photo: { uri: asset.uri, width: asset.width, height: asset.height } };
}
