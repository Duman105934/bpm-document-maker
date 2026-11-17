/**
 * Картинки для экспорта (PDF, общий SVG): растр уменьшается, SVG растеризуется,
 * результат — JPEG data URI. Большие скриншоты иначе раздувают файл.
 */

import type { Asset } from '../model/types';

export interface RasterImage {
  data: string;
  width: number;
  height: number;
}

/**
 * Картинка в JPEG не больше max (px). SVG без своих размеров рисуется вдвое крупнее, чтобы не было мыла.
 * null — картинки нет или она не читается.
 */
export async function rasterizeAsset(
    blob: Blob | undefined,
    asset: Asset,
    max: { width: number; height: number }
): Promise<RasterImage | null> {
  if (!blob) {
    return null;
  }

  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const naturalW = img.naturalWidth || asset.width || 800;
    const naturalH = img.naturalHeight || asset.height || 1600;
    const scale = Math.min(1, max.height / naturalH, max.width / naturalW);
    const svgBoost = asset.mime === 'image/svg+xml' && naturalH * scale < max.height / 2 && naturalW * scale < max.width / 2 ? 2 : 1;
    const width = Math.max(1, Math.round(naturalW * scale * svgBoost));
    const height = Math.max(1, Math.round(naturalH * scale * svgBoost));
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return { data: canvas.toDataURL('image/jpeg', 0.85), width, height };
  } catch (error) {
    console.warn('Не удалось подготовить картинку для экспорта', asset.path, error);

    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('картинка не загрузилась'));
    img.src = url;
  });
}
