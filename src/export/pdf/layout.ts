/**
 * Раскладка страницы раздела: картинка (экран или фрагмент схемы) по центру,
 * выноски в двух боковых колонках. Выноски распределяются по колонкам,
 * сортируются по Y якоря и по возможности выравниваются по нему;
 * что не поместилось — уходит на страницу-продолжение с той же картинкой.
 *
 * Чистый модуль: измеритель текста передаётся параметром.
 */

import type { Block, Callout } from './content';
import { jsonLines, monoLines, sanitizePdfText, type GlyphCheck } from './text';

export type LineStyle = 'title' | 'text' | 'muted' | 'label' | 'mono' | 'link';

export const FONT_SIZE: Record<LineStyle, number> = {
  title: 9, text: 8, muted: 8, label: 8, mono: 7, link: 8
};

export const LINE_HEIGHT: Record<LineStyle, number> = {
  title: 11.5, text: 10.5, muted: 10.5, label: 10.5, mono: 8.6, link: 10.5
};

/** место под « (стр. 000)» у внутренней ссылки */
export const PAGE_REF_RESERVE = 36;

export interface Measurer {
  /** перенос обычного текста по ширине (pt) */
  splitText(text: string, width: number, style: LineStyle): string[];
  /** сколько моноширинных символов помещается в ширину (pt) */
  monoChars(width: number): number;
  /** покрытие шрифтов глифами — символы вне шрифта заменяются (см. sanitizePdfText) */
  covers?: { sans: GlyphCheck; mono: GlyphCheck };
}

function clean(measurer: Measurer, text: string): string {
  return sanitizePdfText(text, { covers: measurer.covers?.sans });
}

export interface Line {
  style: LineStyle;
  text: string;
  target?: string;
  url?: string;
  /** последняя строка ссылки — после неё рисуется номер страницы */
  last?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Box extends Rect {
  callout: number;
  side: 'left' | 'right';
  lines: Line[];
  /** продолжение выноски с предыдущей страницы */
  continued: boolean;
  /** якорь на странице (pt) — только у первого куска выноски */
  anchor: { x: number; y: number } | null;
}

export interface LayoutPage {
  image: Rect;
  boxes: Box[];
}

export interface PageGeometry {
  width: number;
  height: number;
  margin: number;
  header: number;
  footer: number;
  column: number;
  gap: number;
}

/** A4 альбомная, pt. */
export const A4_LANDSCAPE: PageGeometry = {
  width: 842,
  height: 595,
  margin: 28,
  header: 20,
  footer: 18,
  column: 228,
  gap: 14
};

export const BOX_PAD = 5;
export const BOX_GAP = 8;

export function contentArea(g: PageGeometry): Rect {
  const y = g.margin + g.header;

  return { x: g.margin, y, width: g.width - 2 * g.margin, height: g.height - g.margin - g.footer - y };
}

export function columnRects(g: PageGeometry): { left: Rect; center: Rect; right: Rect } {
  const area = contentArea(g);
  const left = { x: area.x, y: area.y, width: g.column, height: area.height };
  const right = { x: area.x + area.width - g.column, y: area.y, width: g.column, height: area.height };
  const center = {
    x: left.x + left.width + g.gap,
    y: area.y,
    width: area.width - 2 * g.column - 2 * g.gap,
    height: area.height
  };

  return { left, center, right };
}

/** Вписать картинку с соотношением сторон aspect (w/h) в прямоугольник по центру. */
export function fitRect(bounds: Rect, aspect: number): Rect {
  const safe = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  let width = bounds.width;
  let height = width / safe;

  if (height > bounds.height) {
    height = bounds.height;
    width = height * safe;
  }

  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height
  };
}

/** Больше строк заголовок выноски не занимает: иначе он выше колонки и раскладка не сходится. */
export const MAX_TITLE_LINES = 3;

function titleLines(measurer: Measurer, text: string, inner: number): Line[] {
  let lines = measurer.splitText(clean(measurer, text), inner, 'title');

  if (lines.length > MAX_TITLE_LINES) {
    const last = lines[MAX_TITLE_LINES - 1];

    // «…» в конце последней строки; повторный перенос гарантирует ширину
    lines = [ ...lines.slice(0, MAX_TITLE_LINES - 1), measurer.splitText(`${ last.slice(0, Math.max(1, last.length - 2)) }…`, inner, 'title')[0] ];
  }

  return lines.map(line => ({ style: 'title' as const, text: line }));
}

/** Строки выноски: заголовок и тело. */
export function calloutLines(callout: Callout, measurer: Measurer, width: number): { title: Line[]; body: Line[] } {
  const inner = width - 2 * BOX_PAD;
  const title = titleLines(measurer, callout.title, inner);
  const body = callout.blocks.flatMap(block => blockLines(block, measurer, inner));

  return { title, body };
}

function blockLines(block: Block, measurer: Measurer, inner: number): Line[] {
  if (block.kind === 'mono') {
    const chars = measurer.monoChars(inner);
    const lines = block.json
      ? jsonLines(block.text, chars, measurer.covers?.mono)
      : monoLines(block.text, chars, measurer.covers?.mono);

    return lines.map(text => ({ style: 'mono' as const, text }));
  }

  if (block.kind === 'link') {
    const width = block.target ? inner - PAGE_REF_RESERVE : inner;
    const parts = measurer.splitText(clean(measurer, block.text), width, 'link');

    return parts.map((text, i) => ({
      style: 'link' as const,
      text,
      target: block.target,
      url: block.url,
      last: i === parts.length - 1
    }));
  }

  const style = block.style || 'text';

  return clean(measurer, block.text)
    .split('\n')
    .flatMap(paragraph => measurer.splitText(paragraph, inner, style))
    .map(text => ({ style, text }));
}

export function linesHeight(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + LINE_HEIGHT[line.style], 0);
}

/**
 * Разложить выноски по страницам.
 * imageAspect — соотношение сторон картинки (w/h); null — картинки нет,
 * центральная область остаётся пустой.
 */
export function layoutSection(
  callouts: Callout[],
  imageAspect: number | null,
  measurer: Measurer,
  g: PageGeometry = A4_LANDSCAPE
): LayoutPage[] {
  const cols = columnRects(g);
  const image = imageAspect ? fitRect(cols.center, imageAspect) : { ...cols.center, height: 0 };
  const columnH = cols.left.height;

  type Placed = Omit<Box, 'x' | 'y'> & { page: number; desired: number | null };

  const placed: Placed[] = [];
  const pageCount = { left: 0, right: 0 };

  ([ 'left', 'right' ] as const).forEach(side => {
    const column = cols[side];
    const items = callouts
      .map((callout, index) => ({ callout, index }))
      .filter(({ callout }) => (callout.side ?? ((callout.anchor?.x ?? 0) < 0.5 ? 'left' : 'right')) === side)
      // без якоря — сверху; остальные по Y якоря (стабильно)
      .sort((a, b) => (a.callout.anchor?.y ?? -1) - (b.callout.anchor?.y ?? -1) || a.index - b.index);

    let page = 0;
    let used = 0;

    items.forEach(({ callout, index }) => {
      const { title, body } = calloutLines(callout, measurer, column.width);
      const contTitle = titleLines(measurer, `${ callout.title } (продолжение)`, column.width - 2 * BOX_PAD);
      let rest = body;
      let first = true;
      // каждая итерация либо забирает строки, либо один раз переходит на пустую страницу
      // (на пустой странице заголовок до трёх строк и хотя бы одна строка тела всегда помещаются),
      // поэтому итераций не больше 2 × строк + 2; превышение — ошибка, а не тихая потеря текста
      const guardLimit = 2 * body.length + 4;
      let guard = 0;

      for (;;) {
        if (guard++ > guardLimit) {
          throw new Error(`Раскладка выноски «${ callout.title.slice(0, 40) }» не сходится`);
        }

        const head = first ? title : contTitle;
        const headH = linesHeight(head) + 2 * BOX_PAD;
        const need = headH + linesHeight(rest);
        const avail = columnH - used - (used > 0 ? BOX_GAP : 0);

        const anchor = first && callout.anchor && image.height
          ? { x: image.x + callout.anchor.x * image.width, y: image.y + callout.anchor.y * image.height }
          : null;

        const push = (lines: Line[], height: number) => {
          placed.push({
            callout: index,
            side,
            lines,
            width: column.width,
            height,
            continued: !first,
            anchor,
            page,
            desired: anchor ? anchor.y - 8 : null
          });
        };

        if (need <= avail) {
          push([ ...head, ...rest ], need);
          used += (used > 0 ? BOX_GAP : 0) + need;
          break;
        }

        // целиком влезет на свежую страницу — переносим
        if (used > 0 && need <= columnH) {
          page++;
          used = 0;
          continue;
        }

        // делим: на текущей странице места мало — начинаем со свежей
        if (used > 0 && avail < headH + 3 * LINE_HEIGHT.mono) {
          page++;
          used = 0;
          continue;
        }

        let height = headH;
        let take = 0;

        while (take < rest.length && height + LINE_HEIGHT[rest[take].style] <= avail) {
          height += LINE_HEIGHT[rest[take].style];
          take++;
        }

        take = Math.max(1, take);
        push([ ...head, ...rest.slice(0, take) ], headH + linesHeight(rest.slice(0, take)));
        rest = rest.slice(take);
        first = false;
        page++;
        used = 0;

        if (!rest.length) {
          break;
        }
      }

      pageCount[side] = Math.max(pageCount[side], used > 0 ? page + 1 : page);
    });
  });

  const total = Math.max(1, pageCount.left, pageCount.right);
  const pages: LayoutPage[] = Array.from({ length: total }, () => ({ image, boxes: [] }));

  for (let p = 0; p < total; p++) {
    ([ 'left', 'right' ] as const).forEach(side => {
      const column = cols[side];
      const list = placed.filter(item => item.page === p && item.side === side);
      const ys = positionColumn(list.map(item => ({ height: item.height, desired: item.desired })), column.y, column.height);

      list.forEach((item, i) => {
        const { page: _page, desired: _desired, ...box } = item;

        pages[p].boxes.push({ ...box, x: column.x, y: ys[i] });
      });
    });
  }

  return pages;
}

/**
 * Вертикальные позиции блоков колонки: как можно ближе к желаемым,
 * без наложений и в пределах колонки (порядок блоков сохраняется).
 */
export function positionColumn(items: Array<{ height: number; desired: number | null }>, top: number, height: number): number[] {
  const bottom = top + height;
  const ys: number[] = [];
  let cursor = top;

  items.forEach(item => {
    const y = Math.max(cursor, item.desired ?? cursor);

    ys.push(y);
    cursor = y + item.height + BOX_GAP;
  });

  // снизу вверх: всё, что вылезло за низ, поджимаем
  let limit = bottom;

  for (let i = items.length - 1; i >= 0; i--) {
    ys[i] = Math.max(top, Math.min(ys[i], limit - items[i].height));
    limit = ys[i] - BOX_GAP;
  }

  return ys;
}
