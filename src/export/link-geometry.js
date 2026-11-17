import { getBadgeBounds } from '../modeler/sm/constants.js';

/**
 * Геометрия кликабельных областей в координатах диаграммы.
 * Одни и те же области используются для <a> в SVG и для link-аннотаций в PDF.
 */

export const CAPTION_FONT_SIZE = 9;
export const CAPTION_LINE_HEIGHT = 12;
const CAPTION_CHAR_WIDTH = 4.6;
const CAPTION_ICON_WIDTH = 12;

/** Прямоугольник значка ссылки в локальных координатах фигуры (совпадает с SmRenderer). */
export function getBadgeLocalBounds(width, height) {
  return getBadgeBounds(width, height);
}

/**
 * Подписи-ссылки под фигурой (или над ней, если снизу внешняя подпись события).
 *
 * @returns {Array<{ x: number, y: number, width: number, height: number, baseline: number }>}
 *          локальные координаты относительно фигуры
 */
export function getCaptionLocalBounds(shape, links, { above = false } = {}) {
  return links.map((link, index) => {
    const width = CAPTION_ICON_WIDTH + Math.max(link.title.length, 3) * CAPTION_CHAR_WIDTH;
    const y = above
      ? -6 - (links.length - index) * CAPTION_LINE_HEIGHT
      : shape.height + 4 + index * CAPTION_LINE_HEIGHT;

    return {
      x: Math.round(shape.width / 2 - width / 2),
      y,
      width,
      height: CAPTION_LINE_HEIGHT,
      baseline: y + CAPTION_FONT_SIZE + 0.5
    };
  });
}

/** Перенести локальный прямоугольник в координаты диаграммы. */
export function toAbsolute(shape, bounds) {
  return {
    x: shape.x + bounds.x,
    y: shape.y + bounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

/** Небольшая область вокруг середины соединения (для ссылок на переходах). */
export function getConnectionLinkBounds(waypoints, size = 20) {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }

  const mid = Math.floor((waypoints.length - 1) / 2);
  const a = waypoints[mid];
  const b = waypoints[mid + 1];

  return {
    x: (a.x + b.x) / 2 - size / 2,
    y: (a.y + b.y) / 2 - size / 2,
    width: size,
    height: size
  };
}

/** Разбор viewBox="x y w h". */
export function parseViewBox(value) {
  const [ x, y, width, height ] = String(value || '').trim().split(/[\s,]+/).map(Number);

  if ([ x, y, width, height ].some(n => !Number.isFinite(n))) {
    throw new Error(`invalid viewBox <${ value }>`);
  }

  return { x, y, width, height };
}

/**
 * Перевод области из координат диаграммы в координаты страницы PDF.
 *
 * @param {Object} area     { x, y, width, height } в координатах диаграммы
 * @param {Object} viewBox  { x, y } — начало экспортированной области SVG
 * @param {Object} page     { margin, scale }
 */
export function toPageRect(area, viewBox, { margin, scale }) {
  return {
    x: margin + (area.x - viewBox.x) * scale,
    y: margin + (area.y - viewBox.y) * scale,
    width: area.width * scale,
    height: area.height * scale
  };
}

/**
 * Размер страницы PDF и масштаб. Диаграмма уменьшается только если не помещается
 * в лимит формата PDF (14400 pt); это вектор, детали видны при увеличении.
 */
export function getPageLayout(viewBox, { margin = 24, maxSize = 14400 } = {}) {
  const available = maxSize - margin * 2;
  const scale = Math.min(1, available / viewBox.width, available / viewBox.height);

  return {
    margin,
    scale,
    width: viewBox.width * scale + margin * 2,
    height: viewBox.height * scale + margin * 2
  };
}
