import { describe, it, expect } from 'vitest';

import {
  clampRect,
  containsPoint,
  displayHeight,
  fracToPx,
  moveRect,
  normalizeRect,
  pxToFrac,
  resizeRect
} from '../src/model/geometry';
import type { Rect } from '../src/model/types';

const close = (actual: Rect, expected: Rect) => {
  ([ 'x', 'y', 'w', 'h' ] as const).forEach(key => expect(actual[key]).toBeCloseTo(expected[key], 10));
};

describe('geometry', () => {

  it('normalizeRect: углы в любом порядке и обрезка границами', () => {
    close(normalizeRect({ x: 0.6, y: 0.5 }, { x: 0.2, y: 0.1 }), { x: 0.2, y: 0.1, w: 0.4, h: 0.4 });
    close(normalizeRect({ x: -0.5, y: 0.5 }, { x: 0.3, y: 1.7 }), { x: 0, y: 0.5, w: 0.3, h: 0.5 });
  });

  it('clampRect вписывает зону в картинку и соблюдает минимум', () => {
    close(clampRect({ x: 0.9, y: -0.1, w: 0.3, h: 0.2 }), { x: 0.7, y: 0, w: 0.3, h: 0.2 });
    close(clampRect({ x: 0.5, y: 0.5, w: 0.001, h: 0 }, { w: 0.05, h: 0.02 }), { x: 0.5, y: 0.5, w: 0.05, h: 0.02 });
    close(clampRect({ x: 0, y: 0, w: 3, h: 2 }), { x: 0, y: 0, w: 1, h: 1 });
  });

  it('moveRect не меняет размер и упирается в границы', () => {
    const r = { x: 0.1, y: 0.1, w: 0.3, h: 0.2 };

    close(moveRect(r, 0.2, 0.1), { x: 0.3, y: 0.2, w: 0.3, h: 0.2 });
    close(moveRect(r, 5, -5), { x: 0.7, y: 0, w: 0.3, h: 0.2 });
  });

  it('resizeRect: противоположная сторона на месте, минимум и границы', () => {
    const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const min = { w: 0.1, h: 0.1 };

    close(resizeRect(r, 'se', 0.1, 0.1, min), { x: 0.2, y: 0.2, w: 0.5, h: 0.5 });
    close(resizeRect(r, 'nw', -0.1, -0.05, min), { x: 0.1, y: 0.15, w: 0.5, h: 0.45 });
    close(resizeRect(r, 'e', -1, 0, min), { x: 0.2, y: 0.2, w: 0.1, h: 0.4 });
    close(resizeRect(r, 'w', 1, 0, min), { x: 0.5, y: 0.2, w: 0.1, h: 0.4 });
    close(resizeRect(r, 'n', 0, -1, min), { x: 0.2, y: 0, w: 0.4, h: 0.6 });
    close(resizeRect(r, 's', 5, 5, min), { x: 0.2, y: 0.2, w: 0.4, h: 0.8 });
  });

  it('fracToPx и pxToFrac взаимно обратны', () => {
    const size = { width: 320, height: 640 };
    const frac = { x: 0.25, y: 0.5, w: 0.5, h: 0.125 };
    const px = fracToPx(frac, size);

    expect(px).toEqual({ x: 80, y: 320, w: 160, h: 80 });
    expect(pxToFrac(px, size)).toEqual(frac);
    expect(pxToFrac(px, { width: 0, height: 0 })).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('containsPoint и displayHeight', () => {
    expect(containsPoint({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, { x: 0.2, y: 0.3 })).toBe(true);
    expect(containsPoint({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, { x: 0.4, y: 0.2 })).toBe(false);
    expect(displayHeight(320, { width: 1080, height: 2340 })).toBe(693);
    expect(displayHeight(375, { width: 0, height: 0 })).toBe(812);
  });
});
