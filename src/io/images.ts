/** Чтение загруженных картинок экранов. */

const FALLBACK_SIZE = { width: 375, height: 812 };

export interface ImageInfo {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

export function isImageFile(file: File): boolean {
  return /^image\/(png|jpe?g|webp|svg\+xml|gif)$/i.test(file.type) ||
    /\.(png|jpe?g|webp|svg|gif)$/i.test(file.name);
}

export async function readImageFile(file: File): Promise<ImageInfo> {
  const mime = file.type || guessMime(file.name);
  // копия байтов в памяти: File — лишь ссылка на файл на диске, и если его перезапишут
  // или удалят до сохранения, чтение упадёт с NotReadableError
  const blob = new Blob([ await file.arrayBuffer() ], { type: mime });
  const { width, height } = await measure(blob);

  return { blob, mime, width, height };
}

function measure(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // SVG без width/height даёт 0
      resolve(img.naturalWidth && img.naturalHeight
        ? { width: img.naturalWidth, height: img.naturalHeight }
        : FALLBACK_SIZE);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(FALLBACK_SIZE);
    };

    img.src = url;
  });
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
  case 'jpg':
  case 'jpeg': return 'image/jpeg';
  case 'webp': return 'image/webp';
  case 'svg': return 'image/svg+xml';
  case 'gif': return 'image/gif';
  default: return 'image/png';
  }
}

/** Имя экрана из имени файла: «02 OTP input.png» → «02 OTP input». */
export function nameFromFile(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim();
}
