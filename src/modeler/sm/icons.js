/**
 * Иконки видов в стиле маркеров BPMN (как у User Task / Service Task):
 * чёрный контур, без заливки, рамка 16×16.
 *
 * Одна и та же разметка используется на фигурах, в палитре и в меню.
 */

const GLYPHS = {
  state: '<path d="M3.5 15 V1.5"/><path d="M3.5 2 H13 L10.5 5.25 L13 8.5 H3.5"/>',
  cmd: '<rect x="1" y="2.5" width="14" height="11" rx="1.5"/><path d="M4 6 L6.5 8 L4 10 M8 10.5 H12"/>',
  api: '<path d="M1.5 5 H13 M10 2 L13 5 L10 8 M14.5 11 H3 M6 8 L3 11 L6 14"/>',
  mobile: '<rect x="3.5" y="0.75" width="9" height="14.5" rx="1.8"/><path d="M6.75 12.75 H9.25"/>',
  event: '<path d="M9.2 1.5 L4 9 L7.6 9 L6.6 14.5 L12 6.6 L8.6 6.6 Z"/>',
  json: '<path d="M6 2 C4 2 4.5 4 4.5 5.5 C4.5 7 3.5 8 2.5 8 C3.5 8 4.5 9 4.5 10.5 C4.5 12 4 14 6 14"/>' +
        '<path d="M10 2 C12 2 11.5 4 11.5 5.5 C11.5 7 12.5 8 13.5 8 C12.5 8 11.5 9 11.5 10.5 C11.5 12 12 14 10 14"/>',
  db: '<rect x="1" y="2" width="14" height="12" rx="1"/><path d="M1 5.5 H15 M1 9.5 H15 M6 5.5 V14"/>'
};

const LINK_GLYPH =
  '<path d="M6.4 8.6 L5 10 A2 2 0 0 1 2.2 7.2 L4.3 5.1 A2 2 0 0 1 7.1 5.1"/>' +
  '<path d="M7.6 5.4 L9 4 A2 2 0 0 1 11.8 6.8 L9.7 8.9 A2 2 0 0 1 6.9 8.9"/>' +
  '<path d="M5.6 8.4 L8.4 5.6"/>';

/** Экран прототипа: рамка экрана со стрелкой «открыть». */
const SCREEN_GLYPH =
  '<rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/>' +
  '<path d="M5 9 L9.5 4.5 M6 4.5 H9.5 V8"/>';

/**
 * Разметка иконки вида (без внешнего <svg>).
 *
 * @param {string} kind
 * @param {string} [color]
 * @param {number} [strokeWidth]
 */
export function getGlyphMarkup(kind, color = '#000', strokeWidth = 1.3) {
  return wrap(GLYPHS[kind], color, strokeWidth);
}

/** Иконка ссылки (рамка 14×14). */
export function getLinkGlyphMarkup(color = '#000', strokeWidth = 1.2) {
  return wrap(LINK_GLYPH, color, strokeWidth);
}

/** Иконка экрана прототипа (рамка 14×14). */
export function getScreenGlyphMarkup(color = '#000', strokeWidth = 1.2) {
  return wrap(SCREEN_GLYPH, color, strokeWidth);
}

const FALLBACK_COLOR = '#000';

/**
 * Цвет из файла (bioc:stroke, color:border-color) идёт в разметку — пропускаем только
 * #hex, rgb()/rgba()/hsl()/hsla() из чисел и имя из букв. Иначе чужой .bpmn мог бы
 * закрыть атрибут и вставить элемент с обработчиком события.
 */
export function safeColor(color) {
  const value = String(color ?? '').trim();

  if (
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^(rgb|hsl)a?\(\s*[\d.%]+\s*(,\s*[\d.%]+\s*){2,3}\)$/i.test(value) ||
    /^[a-z]{1,30}$/i.test(value)
  ) {
    return value;
  }

  return FALLBACK_COLOR;
}

function wrap(markup, color, strokeWidth) {
  const width = Number.isFinite(Number(strokeWidth)) ? Number(strokeWidth) : 1.2;

  return `<g fill="none" stroke="${ safeColor(color) }" stroke-width="${ width }" stroke-linecap="round" stroke-linejoin="round">${ markup }</g>`;
}

/**
 * Иконка для палитры / context pad / popup menu: стандартная форма BPMN + иконка вида.
 */
export function getKindIconUrl(kind) {
  const c = '#22242a';
  let body;

  if (kind === 'event') {
    body = `<circle cx="14" cy="14" r="11" fill="#fff" stroke="${ c }" stroke-width="1.5"/>` +
      `<circle cx="14" cy="14" r="8.6" fill="none" stroke="${ c }" stroke-width="1.2"/>` +
      `<g transform="translate(8 8) scale(0.75)">${ getGlyphMarkup('event', c, 1.6) }</g>`;
  } else if (kind === 'json') {
    body = `<path d="M7 3 H17 L22 8 V25 H7 Z M17 3 V8 H22" fill="#fff" stroke="${ c }" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<g transform="translate(9 11) scale(0.7)">${ getGlyphMarkup('json', c, 1.8) }</g>`;
  } else if (kind === 'db') {
    body = '<path d="M4 7 C4 3.5 24 3.5 24 7 V21 C24 24.5 4 24.5 4 21 Z" fill="#fff" stroke="' + c + '" stroke-width="1.5"/>' +
      `<path d="M4 7 C4 10.5 24 10.5 24 7" fill="none" stroke="${ c }" stroke-width="1.2"/>` +
      `<g transform="translate(9 12) scale(0.62)">${ getGlyphMarkup('db', c, 1.9) }</g>`;
  } else {
    body = `<rect x="2" y="5" width="24" height="18" rx="3" fill="#fff" stroke="${ c }" stroke-width="1.5"/>` +
      `<g transform="translate(4.5 7) scale(0.62)">${ getGlyphMarkup(kind, c, 1.9) }</g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">${ body }</svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
