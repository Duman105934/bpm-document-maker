/**
 * Геометрия зон экрана. Все прямоугольники — в долях 0..1 от картинки,
 * поэтому не зависят ни от ширины показа, ни от zoom canvas.
 */

import type { Rect } from './types';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Минимальный размер зоны в долях картинки. */
export interface MinSize {
  w: number;
  h: number;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const RESIZE_HANDLES: ResizeHandle[] = [ 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w' ];

const NO_MIN: MinSize = { w: 0, h: 0 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampPoint(p: Point): Point {
  return { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) };
}

/** Прямоугольник по двум углам в любом порядке, обрезанный границами картинки. */
export function normalizeRect(a: Point, b: Point): Rect {
  const p = clampPoint(a);
  const q = clampPoint(b);

  return {
    x: Math.min(p.x, q.x),
    y: Math.min(p.y, q.y),
    w: Math.abs(p.x - q.x),
    h: Math.abs(p.y - q.y)
  };
}

/** Вписать прямоугольник в картинку, не меньше min (если min помещается). */
export function clampRect(r: Rect, min: MinSize = NO_MIN): Rect {
  const w = clamp(r.w, Math.min(min.w, 1), 1);
  const h = clamp(r.h, Math.min(min.h, 1), 1);

  return {
    x: clamp(r.x, 0, 1 - w),
    y: clamp(r.y, 0, 1 - h),
    w,
    h
  };
}

/** Сдвиг без изменения размера; зона не выходит за картинку. */
export function moveRect(r: Rect, dx: number, dy: number): Rect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy });
}

/** Изменение размера за маркер; противоположная сторона остаётся на месте. */
export function resizeRect(r: Rect, handle: ResizeHandle, dx: number, dy: number, min: MinSize = NO_MIN): Rect {
  let x1 = r.x;
  let y1 = r.y;
  let x2 = r.x + r.w;
  let y2 = r.y + r.h;

  if (handle.includes('w')) {
    x1 = clamp(x1 + dx, 0, Math.max(0, x2 - min.w));
  }

  if (handle.includes('e')) {
    x2 = clamp(x2 + dx, Math.min(1, x1 + min.w), 1);
  }

  if (handle.includes('n')) {
    y1 = clamp(y1 + dy, 0, Math.max(0, y2 - min.h));
  }

  if (handle.includes('s')) {
    y2 = clamp(y2 + dy, Math.min(1, y1 + min.h), 1);
  }

  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function fracToPx(r: Rect, size: Size): Rect {
  return {
    x: r.x * size.width,
    y: r.y * size.height,
    w: r.w * size.width,
    h: r.h * size.height
  };
}

export function pxToFrac(r: Rect, size: Size): Rect {
  if (!size.width || !size.height) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: r.x / size.width,
    y: r.y / size.height,
    w: r.w / size.width,
    h: r.h / size.height
  };
}

export function containsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Высота показа экрана по ширине показа и пропорциям картинки. */
export function displayHeight(displayWidth: number, asset: { width: number; height: number }): number {
  const ratio = asset.width > 0 && asset.height > 0 ? asset.height / asset.width : 812 / 375;

  return Math.round(displayWidth * ratio);
}
