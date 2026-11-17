import { describe, it, expect } from 'vitest';

import type { Callout } from '../src/export/pdf/content';
import {
  A4_LANDSCAPE,
  columnRects,
  fitRect,
  layoutSection,
  positionColumn,
  type Measurer
} from '../src/export/pdf/layout';

/** Грубый измеритель: символ = 0.5 размера шрифта, перенос по словам. */
const measurer: Measurer = {
  splitText(text, width) {
    const max = Math.floor(width / 4);
    const lines: string[] = [];
    let line = '';

    text.split(' ').forEach(word => {
      if (line && (line + ' ' + word).length > max) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${ line } ${ word }` : word;
      }
    });

    lines.push(line);

    return lines;
  },
  monoChars(width) {
    return Math.floor(width / 4.2);
  }
};

function callout(id: string, x: number, y: number, extra: Partial<Callout> = {}): Callout {
  return { id, anchor: { x, y }, title: id, blocks: [ { kind: 'text', text: 'текст' } ], ...extra };
}

describe('pdf/layout', () => {

  it('картинка вписывается в центральную область с сохранением пропорций', () => {
    const center = columnRects(A4_LANDSCAPE).center;
    const rect = fitRect(center, 0.5);

    expect(rect.height).toBeCloseTo(center.height);
    expect(rect.width).toBeCloseTo(center.height * 0.5);
    expect(rect.x + rect.width / 2).toBeCloseTo(center.x + center.width / 2);
  });

  it('выноски уходят в колонку по стороне якоря и сортируются по Y', () => {
    const pages = layoutSection([
      callout('r', 0.9, 0.2),
      callout('l2', 0.1, 0.7),
      callout('l1', 0.2, 0.1)
    ], 0.5, measurer);

    expect(pages).toHaveLength(1);

    const cols = columnRects(A4_LANDSCAPE);
    const left = pages[0].boxes.filter(b => b.side === 'left');
    const right = pages[0].boxes.filter(b => b.side === 'right');

    expect(left.map(b => b.lines[0].text)).toEqual([ 'l1', 'l2' ]);
    expect(left.every(b => b.x === cols.left.x)).toBe(true);
    expect(right.map(b => b.lines[0].text)).toEqual([ 'r' ]);
    expect(right[0].x).toBe(cols.right.x);
    // выравнивание по якорю: вторая выноска ниже первой и рядом со своей зоной
    expect(left[1].y).toBeGreaterThan(left[0].y + left[0].height);
    expect(left[0].anchor).not.toBeNull();
  });

  it('длинный JSON переносится на страницу-продолжение без потери строк', () => {
    const json = JSON.stringify(Object.fromEntries(Array.from({ length: 120 }, (_, i) => [ `field${ i }`, i ])));
    const pages = layoutSection([ callout('big', 0.1, 0.5, { blocks: [ { kind: 'mono', text: json, json: true } ] }) ], 0.5, measurer);
    const area = columnRects(A4_LANDSCAPE).left;

    expect(pages.length).toBeGreaterThan(1);

    const boxes = pages.flatMap(p => p.boxes);

    expect(boxes[0].continued).toBe(false);
    expect(boxes.slice(1).every(b => b.continued && b.anchor === null)).toBe(true);
    expect(boxes[1].lines[0].text).toContain('(продолжение)');
    boxes.forEach(b => expect(b.y + b.height).toBeLessThanOrEqual(area.y + area.height + 0.01));

    const mono = boxes.flatMap(b => b.lines.filter(l => l.style === 'mono'));

    expect(mono).toHaveLength(122);
    // все страницы с той же картинкой
    expect(pages.every(p => p.image === pages[0].image)).toBe(true);
  });

  it('много выносок — переполнение колонки уходит на следующую страницу', () => {
    const many = Array.from({ length: 30 }, (_, i) => callout(`c${ i }`, 0.1, i / 30, {
      blocks: [ { kind: 'text', text: 'строка '.repeat(30) } ]
    }));
    const pages = layoutSection(many, 0.5, measurer);
    const ids = pages.flatMap(p => p.boxes.map(b => b.lines[0].text));

    expect(pages.length).toBeGreaterThan(1);
    expect(ids).toEqual(many.map(c => c.id));
  });

  it('positionColumn: без наложений и в пределах колонки', () => {
    const ys = positionColumn([
      { height: 50, desired: 480 },
      { height: 50, desired: 490 },
      { height: 50, desired: null }
    ], 0, 500);

    expect(ys[2] + 50).toBeLessThanOrEqual(500);
    expect(ys[1] + 50).toBeLessThanOrEqual(ys[2]);
    expect(ys[0] + 50).toBeLessThanOrEqual(ys[1]);
  });
});

describe('layoutSection — экстремальные данные (B10)', () => {

  it('огромный заголовок ограничен тремя строками, блоки помещаются в колонку', () => {
    const huge = callout('h', 0.1, 0.1, { title: 'слово '.repeat(1000), blocks: [ { kind: 'text', text: 'x '.repeat(500) } ] });
    const pages = layoutSection([ huge ], 1, measurer);
    const columnH = columnRects(A4_LANDSCAPE).left.height;

    pages.forEach(page => page.boxes.forEach(box => {
      expect(box.height).toBeLessThanOrEqual(columnH);
      expect(box.lines.filter(l => l.style === 'title').length).toBeLessThanOrEqual(3);
    }));
    expect(pages[0].boxes[0].lines[2].text.endsWith('…')).toBe(true);
  });

  it('длинное тело не теряет строк', () => {
    const text = Array.from({ length: 3000 }, (_, i) => `"k${ i }": ${ i }`).join('\n');
    const long = callout('l', 0.1, 0.1, { blocks: [ { kind: 'mono', text } ] });
    const pages = layoutSection([ long ], 1, measurer);
    const body = pages.flatMap(page => page.boxes.flatMap(box => box.lines.filter(l => l.style === 'mono')));

    expect(body).toHaveLength(3000);
  });
});
