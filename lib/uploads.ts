import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

type UploadResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string }
  | { ok: false; cancelled: true };

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

function extFromMime(mime?: string | null): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  return 'jpg';
}

async function pickImage(opts: {
  aspect?: [number, number];
  quality?: number;
}): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: opts.aspect,
    quality: opts.quality ?? 0.8,
    exif: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0];
}

export async function pickAndUploadAvatar(
  userId: string,
): Promise<UploadResult> {
  const asset = await pickImage({ aspect: [1, 1], quality: 0.8 });
  if (!asset) return { ok: false, cancelled: true };
  const ext = extFromMime(asset.mimeType);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const buf = await uriToArrayBuffer(asset.uri);
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, buf, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl, path };
}

export async function pickAndUploadCarPhoto(
  userId: string,
  carId: string,
): Promise<UploadResult> {
  const asset = await pickImage({ aspect: [4, 3], quality: 0.85 });
  if (!asset) return { ok: false, cancelled: true };
  const ext = extFromMime(asset.mimeType);
  const path = `${userId}/${carId}/${Date.now()}.${ext}`;
  const buf = await uriToArrayBuffer(asset.uri);
  const { error } = await supabase.storage
    .from('car-photos')
    .upload(path, buf, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from('car-photos').getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl, path };
}

export async function pickAndUploadEventHero(): Promise<UploadResult> {
  const asset = await pickImage({ aspect: [16, 9], quality: 0.85 });
  if (!asset) return { ok: false, cancelled: true };
  const ext = extFromMime(asset.mimeType);
  const path = `events/${Date.now()}.${ext}`;
  const buf = await uriToArrayBuffer(asset.uri);
  const { error } = await supabase.storage
    .from('events-public')
    .upload(path, buf, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from('events-public').getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl, path };
}
