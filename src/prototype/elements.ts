/**
 * Элементы экрана для выбора «как в Figma»: картинка рисуется на canvas,
 * анализируется (detect.ts), результат кэшируется по пути картинки.
 * Путь уникален для каждой версии картинки (см. replaceScreenImage).
 */

import type { Rect } from '../model/types';
import { assets } from '../store/assets';
import { detectElements } from './detect';

/** ширина, до которой уменьшается картинка для анализа */
const ANALYSIS_WIDTH = 420;
/** предел площади: «скролл»-экраны уменьшаются сильнее */
const MAX_PIXELS = 1_400_000;

const cache = new Map<string, Promise<Rect[]>>();

/** Элементы картинки экрана; пустой массив, если картинки нет или она не читается. */
export function getScreenElements(path: string): Promise<Rect[]> {
  let result = cache.get(path);

  if (!result) {
    result = analyse(path).catch(error => {
      console.warn('Не удалось найти элементы на экране', path, error);

      return [];
    });
    cache.set(path, result);
  }

  return result;
}

async function analyse(path: string): Promise<Rect[]> {
  const blob = assets.get(path);

  if (!blob) {
    // картинка может появиться позже (восстановление черновика) — не запоминать пустой ответ
    cache.delete(path);

    return [];
  }

  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const naturalW = img.naturalWidth || 375;
    const naturalH = img.naturalHeight || 812;
    const scale = Math.min(1, ANALYSIS_WIDTH / naturalW, Math.sqrt(MAX_PIXELS / (naturalW * naturalH)));
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // прозрачные места — как на белой подложке экрана
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    // без сглаживания: размытая граница слабоконтрастной карточки слила бы её с фоном
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, width, height);

    return detectElements(ctx.getImageData(0, 0, width, height));
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
