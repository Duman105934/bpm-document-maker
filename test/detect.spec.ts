import { describe, expect, it } from 'vitest';

import { detectElements, elementAt, rectOverlap, type PixelImage } from '../src/prototype/detect';
import type { Rect } from '../src/model/types';

type Color = [ number, number, number ];

const WHITE: Color = [ 255, 255, 255 ];
const BLUE: Color = [ 26, 115, 232 ];
const DARK: Color = [ 32, 33, 36 ];
const GRAY: Color = [ 242, 242, 247 ];

/** Картинка 375×600 с белым фоном. */
function canvas(width = 375, height = 600) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const image: PixelImage = { width, height, data };

  const fill = (x: number, y: number, w: number, h: number, [ r, g, b ]: Color) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * width + xx) * 4;

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }
  };

  /** «Текст»: буквы 6×10 с шагом 8, слова через пробел. */
  const text = (x: number, y: number, words: number[], color: Color = DARK) => {
    let cursor = x;

    words.forEach(length => {
      for (let i = 0; i < length; i++) {
        fill(cursor, y, 6, 10, color);
        cursor += 8;
      }

      cursor += 5;
    });

    return cursor - 5 - 2 - x;
  };

  return { image, fill, text, width, height };
}

/** Прямоугольник в пикселях по долям. */
function px(rect: Rect, width: number, height: number) {
  return { x: Math.round(rect.x * width), y: Math.round(rect.y * height), w: Math.round(rect.w * width), h: Math.round(rect.h * height) };
}

function find(elements: Rect[], target: { x: number; y: number; w: number; h: number }, width: number, height: number) {
  const wanted = { x: target.x / width, y: target.y / height, w: target.w / width, h: target.h / height };

  return elements.find(rect => rectOverlap(rect, wanted) > 0.7);
}

describe('detectElements', () => {

  it('находит кнопку; подпись внутри неё — не отдельный элемент', () => {
    const { image, fill, text, width, height } = canvas();

    fill(40, 480, 295, 48, BLUE);
    text(150, 499, [ 8 ], WHITE);

    const elements = detectElements(image);
    const button = find(elements, { x: 40, y: 480, w: 295, h: 48 }, width, height);

    expect(button).toBeDefined();
    expect(px(button!, width, height)).toEqual({ x: 40, y: 480, w: 295, h: 48 });
    // внутри кнопки других элементов нет
    expect(elements.filter(rect => rect !== button && rectOverlap(rect, button!) > 0)).toEqual([]);
  });

  it('склеивает буквы в строку текста, строки — раздельно', () => {
    const { image, text, width, height } = canvas();
    const w1 = text(40, 100, [ 5, 7, 4 ]);

    text(40, 130, [ 9 ]);

    const elements = detectElements(image);
    const line1 = find(elements, { x: 37, y: 97, w: w1 + 6, h: 16 }, width, height);
    const line2 = find(elements, { x: 37, y: 127, w: 9 * 8 + 4, h: 16 }, width, height);

    expect(line1).toBeDefined();
    expect(line2).toBeDefined();
    expect(line1).not.toBe(line2);
    expect(elements).toHaveLength(2);
  });

  it('слабоконтрастная карточка и её содержимое', () => {
    const { image, fill, text, width, height } = canvas();

    fill(16, 200, 343, 160, GRAY);
    text(32, 220, [ 6, 6 ]);
    fill(32, 290, 120, 40, BLUE);

    const elements = detectElements(image);

    expect(find(elements, { x: 16, y: 200, w: 343, h: 160 }, width, height)).toBeDefined();
    expect(find(elements, { x: 32, y: 290, w: 120, h: 40 }, width, height)).toBeDefined();
    // строка текста в высокой карточке остаётся отдельным элементом
    expect(elements).toHaveLength(3);
  });

  it('сглаженный край не сливает слабоконтрастную карточку с фоном', () => {
    const { image, fill, width, height } = canvas();

    // плавный переход фон → карточка: 255, 252, 249, 246, 242
    [ 252, 249, 246 ].forEach((v, i) => fill(16 + i, 200 + i, 343 - 2 * i, 160 - 2 * i, [ v, v, v ]));
    fill(19, 203, 337, 154, GRAY);

    const card = find(detectElements(image), { x: 19, y: 203, w: 337, h: 154 }, width, height);

    expect(card).toBeDefined();
  });

  it('просветы в крупных буквах — не элементы', () => {
    const { image, fill, width, height } = canvas();

    // три «буквы» 24×30 штрихом в 3 px, внутри просвет 18×24
    [ 0, 1, 2 ].forEach(i => {
      fill(40 + i * 30, 100, 24, 30, DARK);
      fill(43 + i * 30, 103, 18, 24, WHITE);
    });

    const elements = detectElements(image);

    expect(elements).toHaveLength(1);
    expect(px(elements[0], width, height).w).toBeGreaterThan(80);
  });

  it('градиентная кнопка — один элемент', () => {
    const { image, width, height } = canvas();

    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 295; x++) {
        const i = ((300 + y) * width + 40 + x) * 4;

        const data = image.data as Uint8ClampedArray;

        data[i] = 20 + Math.round(y * 0.6);
        data[i + 1] = 100 + Math.round(y * 0.6);
        data[i + 2] = 220;
      }
    }

    const elements = detectElements(image);

    expect(elements).toHaveLength(1);
    expect(px(elements[0], width, height)).toEqual({ x: 40, y: 300, w: 295, h: 48 });
  });

  it('фон и разделители — не элементы; пустая картинка — пусто', () => {
    const { image, fill } = canvas();

    fill(0, 300, 375, 1, GRAY);

    expect(detectElements(image)).toEqual([]);
    expect(detectElements({ width: 0, height: 0, data: [] })).toEqual([]);
  });
});

describe('elementAt', () => {

  const card: Rect = { x: 0.1, y: 0.1, w: 0.8, h: 0.5 };
  const button: Rect = { x: 0.2, y: 0.4, w: 0.3, h: 0.1 };

  it('самый маленький элемент под точкой', () => {
    expect(elementAt([ card, button ], { x: 0.3, y: 0.45 })).toBe(button);
    expect(elementAt([ card, button ], { x: 0.8, y: 0.2 })).toBe(card);
    expect(elementAt([ card, button ], { x: 0.95, y: 0.95 })).toBeNull();
  });

  it('элемент, уже занятый зоной, не предлагается', () => {
    const zone: Rect = { x: 0.2, y: 0.4, w: 0.3, h: 0.11 };

    expect(elementAt([ card, button ], { x: 0.3, y: 0.45 }, [ zone ])).toBe(card);
  });
});
