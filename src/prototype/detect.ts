/**
 * Поиск элементов интерфейса на картинке экрана: кнопки, поля, карточки, строки текста, иконки.
 *
 * Экран — растр, слоёв Figma в нём нет, поэтому элементы находятся анализом изображения:
 *   1. области одного цвета (заливка от «зерна»; градиент остаётся одной областью,
 *      а слабоконтрастная граница карточки — нет);
 *   2. область, плотно заполняющая свой прямоугольник, — блок (кнопка, поле, карточка);
 *   3. мелкие области (буквы, штрихи иконок) склеиваются по горизонтали в строки текста.
 *
 * Чистый модуль: принимает пиксели RGBA, возвращает прямоугольники в долях 0..1.
 */

import type { Rect } from '../model/types';

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, 4 байта на пиксель */
  data: ArrayLike<number>;
}

/**
 * Пиксель входит в область, если отличается от её первого пикселя не больше, чем на столько (на канал).
 * Сравнение с соседом дало бы цепочку: сглаженные пиксели скруглённого угла плавно ведут
 * от цвета карточки к цвету фона и сливают их в одну область.
 */
const SEED_TOLERANCE = 4;
/** Крупные соседние области с близким средним цветом — полосы одного градиента, они склеиваются. */
const MERGE_TOLERANCE = 6;

/** доля прямоугольника, занятая областью, — с неё область считается блоком */
const BLOCK_FILL = 0.55;
/** фон и крупные подложки не элементы */
const MAX_AREA = 0.6;
/** полоса во всю ширину крупнее этой доли картинки — часть фона, а не шапка или панель вкладок */
const BACKDROP_AREA = 0.2;
/** подпись внутри блока не выше этого числа её высот (кнопка, поле, строка списка) — часть блока */
const LABEL_BLOCK_RATIO = 6;
/** больше не возвращаем: на «шумных» картинках кандидатов тысячи */
const MAX_ELEMENTS = 600;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function detectElements(image: PixelImage): Rect[] {
  const { width, height, data } = image;
  const total = width * height;

  if (!total || data.length < total * 4) {
    return [];
  }

  // размеры — относительно ширины: 375 pt макета ≈ ширина картинки
  const unit = width / 375;
  const minBlockW = Math.max(6, Math.round(14 * unit));
  const minBlockH = Math.max(5, Math.round(10 * unit));
  const smallSide = Math.round(44 * unit);
  const flatCount = Math.max(12, Math.round(36 * unit * unit));
  const joinX = Math.max(2, Math.round(6 * unit));
  const joinY = Math.max(1, Math.round(1.5 * unit));

  // 1. области одного цвета
  const labels = new Int32Array(total).fill(-1);
  const stack = new Int32Array(total);
  const counts: number[] = [];
  const boxes: Box[] = [];
  const sums: number[] = [];

  for (let start = 0; start < total; start++) {
    if (labels[start] !== -1) {
      continue;
    }

    const label = counts.length;
    const sr = data[start * 4];
    const sg = data[start * 4 + 1];
    const sb = data[start * 4 + 2];
    const box: Box = { x0: width, y0: height, x1: 0, y1: 0 };
    let count = 0;
    let sum = 0;
    let top = 0;

    labels[start] = label;
    stack[top++] = start;

    while (top) {
      const p = stack[--top];
      const x = p % width;
      const y = (p - x) / width;

      count++;
      sum += data[p * 4] + data[p * 4 + 1] + data[p * 4 + 2];

      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;

      for (let side = 0; side < 4; side++) {
        const q = side === 0 ? (x > 0 ? p - 1 : -1)
          : side === 1 ? (x < width - 1 ? p + 1 : -1)
            : side === 2 ? (y > 0 ? p - width : -1)
              : (y < height - 1 ? p + width : -1);

        if (q < 0 || labels[q] !== -1) {
          continue;
        }

        if (
          Math.abs(data[q * 4] - sr) <= SEED_TOLERANCE &&
          Math.abs(data[q * 4 + 1] - sg) <= SEED_TOLERANCE &&
          Math.abs(data[q * 4 + 2] - sb) <= SEED_TOLERANCE
        ) {
          labels[q] = label;
          stack[top++] = q;
        }
      }
    }

    counts.push(count);
    boxes.push(box);
    // средняя яркость (сумма каналов / 3) — для склейки полос градиента
    sums.push(sum / (3 * count));
  }

  mergeGradientBands(labels, counts, boxes, sums, width, height, flatCount, Math.max(6, Math.round(8 * unit)));

  // 2. блоки и «мелочь»
  const blocks: Box[] = [];
  const small = new Uint8Array(counts.length);

  for (let label = 0; label < counts.length; label++) {
    // область влилась в другую (градиент)
    if (!counts[label]) {
      continue;
    }

    const box = boxes[label];
    const w = box.x1 - box.x0 + 1;
    const h = box.y1 - box.y0 + 1;
    const fill = counts[label] / (w * h);

    if (w >= minBlockW && h >= minBlockH && fill >= BLOCK_FILL) {
      // фон и его части между разделителями во всю ширину — не элементы
      const backdrop = w * h > MAX_AREA * total || (w >= 0.96 * width && w * h >= BACKDROP_AREA * total);

      if (!backdrop) {
        blocks.push(box);
      }

      continue;
    }

    // буква, штрих иконки, шум сглаживания; длинные тонкие линии (разделители, рамки) — нет
    if (counts[label] < flatCount || (w <= smallSide && h <= smallSide)) {
      small[label] = w <= smallSide * 3 && h <= smallSide * 3 ? 1 : 0;
    }
  }

  // 3. строки текста и иконки: мелочь, растянутая по горизонтали, сливается в группы
  const mask = new Uint8Array(total);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!small[labels[y * width + x]]) {
        continue;
      }

      const xa = Math.max(0, x - joinX);
      const xb = Math.min(width - 1, x + joinX);
      const ya = Math.max(0, y - joinY);
      const yb = Math.min(height - 1, y + joinY);

      for (let yy = ya; yy <= yb; yy++) {
        mask.fill(1, yy * width + xa, yy * width + xb + 1);
      }
    }
  }

  const groups: Box[] = [];

  for (let start = 0; start < total; start++) {
    if (mask[start] !== 1) {
      continue;
    }

    const box: Box = { x0: width, y0: height, x1: 0, y1: 0 };
    let top = 0;

    mask[start] = 2;
    stack[top++] = start;

    while (top) {
      const p = stack[--top];
      const x = p % width;
      const y = (p - x) / width;

      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;

      if (x > 0 && mask[p - 1] === 1) { mask[p - 1] = 2; stack[top++] = p - 1; }
      if (x < width - 1 && mask[p + 1] === 1) { mask[p + 1] = 2; stack[top++] = p + 1; }
      if (y > 0 && mask[p - width] === 1) { mask[p - width] = 2; stack[top++] = p - width; }
      if (y < height - 1 && mask[p + width] === 1) { mask[p + width] = 2; stack[top++] = p + width; }
    }

    // вернуть растяжение: рамка группы — по самим буквам
    const group: Box = {
      x0: Math.min(box.x1, box.x0 + (box.x0 > 0 ? joinX : 0)),
      y0: Math.min(box.y1, box.y0 + (box.y0 > 0 ? joinY : 0)),
      x1: Math.max(box.x0, box.x1 - (box.x1 < width - 1 ? joinX : 0)),
      y1: Math.max(box.y0, box.y1 - (box.y1 < height - 1 ? joinY : 0))
    };
    const w = group.x1 - group.x0 + 1;
    const h = group.y1 - group.y0 + 1;

    // от шеврона «‹» и точки меню до абзаца; совсем мелкое — шум
    if (w >= Math.round(4 * unit) && h >= Math.round(5 * unit) && w * h >= 40 * unit * unit && w * h <= MAX_AREA * total * 0.5) {
      groups.push(group);
    }
  }

  // подпись внутри однострочного блока (кнопка, поле) — не отдельный элемент: зоной станет сам блок
  const labelsInside = (group: Box) => blocks.some(block => {
    const blockH = block.y1 - block.y0 + 1;
    const groupH = group.y1 - group.y0 + 1;

    return group.x0 >= block.x0 && group.x1 <= block.x1 && group.y0 >= block.y0 && group.y1 <= block.y1 &&
      blockH <= groupH * LABEL_BLOCK_RATIO;
  });

  // сглаживание на скруглённом углу блока даёт горстку мелких пикселей — это не элемент
  const cornerSize = Math.round(28 * unit);
  const near = Math.max(2, Math.round(2 * unit));
  const isCornerFringe = (group: Box) => {
    if (group.x1 - group.x0 + 1 > cornerSize || group.y1 - group.y0 + 1 > cornerSize) {
      return false;
    }

    return blocks.some(block =>
      group.x0 >= block.x0 - near && group.x1 <= block.x1 + near && group.y0 >= block.y0 - near && group.y1 <= block.y1 + near &&
      (Math.abs(group.x0 - block.x0) <= near || Math.abs(group.x1 - block.x1) <= near) &&
      (Math.abs(group.y0 - block.y0) <= near || Math.abs(group.y1 - block.y1) <= near));
  };

  // небольшой отступ вокруг текста и иконок: зона удобнее, чем рамка вплотную
  // у мелких (иконка, шеврон) отступ больше — зона должна быть удобной для нажатия
  const padded = groups.filter(group => !labelsInside(group) && !isCornerFringe(group)).map(group => {
    const tiny = group.x1 - group.x0 < 20 * unit && group.y1 - group.y0 < 20 * unit;
    const pad = Math.round((tiny ? 7 : 3) * unit);

    return {
      x0: Math.max(0, group.x0 - pad),
      y0: Math.max(0, group.y0 - pad),
      x1: Math.min(width - 1, group.x1 + pad),
      y1: Math.min(height - 1, group.y1 + pad)
    };
  });

  const area = (box: Box) => (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1);

  // просвет внутри крупной буквы («а», «0») — не блок
  const isCounter = (block: Box) => groups.some(group =>
    block.x0 >= group.x0 && block.x1 <= group.x1 && block.y0 >= group.y0 && block.y1 <= group.y1 &&
    area(block) < 0.3 * area(group));

  const all = [ ...blocks.filter(block => !isCounter(block)), ...padded ].sort((a, b) => area(a) - area(b));
  const result: Box[] = [];

  // почти совпадающие рамки (блок и его контур) — оставить одну
  for (const box of all) {
    if (!result.some(kept => overlap(kept, box) > 0.85)) {
      result.push(box);
    }

    if (result.length >= MAX_ELEMENTS) {
      break;
    }
  }

  return result.map(box => ({
    x: box.x0 / width,
    y: box.y0 / height,
    w: (box.x1 - box.x0 + 1) / width,
    h: (box.y1 - box.y0 + 1) / height
  }));
}

/**
 * Склеить полосы градиента: крупные области с длинной общей границей и близкой средней яркостью.
 * Мелкие (сглаживание краёв) не участвуют — иначе карточка слилась бы с фоном через свой контур.
 * Метки влившихся областей переписываются, их counts обнуляются.
 */
function mergeGradientBands(
    labels: Int32Array,
    counts: number[],
    boxes: Box[],
    means: number[],
    width: number,
    height: number,
    minCount: number,
    minShared: number
) {
  const shared = new Map<number, number>();
  const n = counts.length;

  const touch = (a: number, b: number) => {
    if (a !== b && counts[a] >= minCount && counts[b] >= minCount && Math.abs(means[a] - means[b]) <= MERGE_TOLERANCE) {
      const key = a < b ? a * n + b : b * n + a;

      shared.set(key, (shared.get(key) ?? 0) + 1);
    }
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;

      if (x < width - 1) touch(labels[p], labels[p + 1]);
      if (y < height - 1) touch(labels[p], labels[p + width]);
    }
  }

  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }

    return i;
  };

  let merged = false;

  shared.forEach((length, key) => {
    if (length < minShared) {
      return;
    }

    const a = root(Math.floor(key / n));
    const b = root(key % n);

    if (a !== b) {
      parent[b] = a;
      merged = true;
    }
  });

  if (!merged) {
    return;
  }

  for (let label = 0; label < n; label++) {
    const target = root(label);

    if (target === label) {
      continue;
    }

    const from = boxes[label];
    const to = boxes[target];

    to.x0 = Math.min(to.x0, from.x0);
    to.y0 = Math.min(to.y0, from.y0);
    to.x1 = Math.max(to.x1, from.x1);
    to.y1 = Math.max(to.y1, from.y1);
    counts[target] += counts[label];
    counts[label] = 0;
  }

  for (let p = 0; p < labels.length; p++) {
    labels[p] = root(labels[p]);
  }
}

/** Пересечение к объединению. */
function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1;
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1;

  if (w <= 0 || h <= 0) {
    return 0;
  }

  const inter = w * h;
  const union = (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1) + (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - inter;

  return inter / union;
}

/** Пересечение к объединению для прямоугольников в долях. */
export function rectOverlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

  if (w <= 0 || h <= 0) {
    return 0;
  }

  const inter = w * h;

  return inter / (a.w * a.h + b.w * b.h - inter);
}

/**
 * Элемент под указателем: самый маленький из содержащих точку.
 * Элементы, уже занятые зонами (taken), не предлагаются.
 */
export function elementAt(elements: Rect[], point: { x: number; y: number }, taken: Rect[] = []): Rect | null {
  let best: Rect | null = null;

  for (const rect of elements) {
    if (point.x < rect.x || point.x > rect.x + rect.w || point.y < rect.y || point.y > rect.y + rect.h) {
      continue;
    }

    if (taken.some(zone => rectOverlap(zone, rect) > 0.7)) {
      continue;
    }

    if (!best || rect.w * rect.h < best.w * best.h) {
      best = rect;
    }
  }

  return best;
}
