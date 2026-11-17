import { describe, expect, it } from 'vitest';

import { getGlyphMarkup, getLinkGlyphMarkup, getScreenGlyphMarkup, safeColor } from '../src/modeler/sm/icons.js';

function parse(markup) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${ markup }</svg>`, 'image/svg+xml');

  return doc.documentElement;
}

describe('sm icons — цвет из файла (C1)', () => {

  it('цвет с кавычкой и < не создаёт лишних элементов', () => {
    const evil = 'red"/><image href="x" onerror="alert(1)"/><g x="';

    [ getGlyphMarkup('cmd', evil), getLinkGlyphMarkup(evil), getScreenGlyphMarkup(evil) ].forEach(markup => {
      const root = parse(markup);

      expect(root.querySelector('parsererror')).toBeNull();
      expect(root.querySelector('image')).toBeNull();
      expect(markup).not.toContain('onerror');
      expect(root.firstElementChild.getAttribute('stroke')).toBe('#000');
    });
  });

  it('обычные цвета проходят', () => {
    expect(safeColor('#1A73E8')).toBe('#1A73E8');
    expect(safeColor('rgb(10, 20, 30)')).toBe('rgb(10, 20, 30)');
    expect(safeColor('hsla(10, 50%, 50%, 0.5)')).toBe('hsla(10, 50%, 50%, 0.5)');
    expect(safeColor('red')).toBe('red');
    expect(safeColor('url(#x)')).toBe('#000');
  });
});
