import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const BUCKET = 'gym-images';

export async function uploadImage(file: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function deleteImage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error('deleteImage failed:', path, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteImage exception:', path, err);
    return false;
  }
}

export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(file);
    }, 10000);
    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      const MAX_WIDTH = 1200;
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const isPng = file.type === 'image/png';
      canvas.toBlob(
        (blob) => resolve(blob || file),
        isPng ? 'image/png' : 'image/jpeg',
        isPng ? 1 : 0.82
      );
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
