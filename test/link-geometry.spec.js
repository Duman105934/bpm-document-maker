import { describe, it, expect } from 'vitest';

import {
  getBadgeLocalBounds,
  getCaptionLocalBounds,
  getConnectionLinkBounds,
  getPageLayout,
  parseViewBox,
  toAbsolute,
  toPageRect
} from '../src/export/link-geometry.js';

describe('link geometry', () => {

  it('parses viewBox', () => {
    expect(parseViewBox('-10 20.5 300 400')).toEqual({ x: -10, y: 20.5, width: 300, height: 400 });
    expect(() => parseViewBox('a b')).toThrow();
  });

  it('places badge inside large shapes and outside small ones', () => {
    expect(getBadgeLocalBounds(100, 80)).toEqual({ x: 81, y: 5, width: 14, height: 14 });
    expect(getBadgeLocalBounds(36, 36)).toEqual({ x: 31, y: -9, width: 14, height: 14 });
  });

  it('places captions below the shape, or above when label is below', () => {
    const shape = { x: 100, y: 50, width: 130, height: 230 };
    const links = [ { title: 'Figma' }, { title: 'Confluence' } ];

    const below = getCaptionLocalBounds(shape, links);
    expect(below[0].y).toBe(234);
    expect(below[1].y).toBe(246);

    const above = getCaptionLocalBounds(shape, links, { above: true });
    expect(above[0].y).toBe(-30);
    expect(above[1].y).toBe(-18);
    expect(above[1].y + above[1].height).toBeLessThan(0);

    expect(toAbsolute(shape, below[0])).toMatchObject({ x: 100 + below[0].x, y: 284 });
  });

  it('finds the middle of a connection', () => {
    const area = getConnectionLinkBounds([ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ]);

    expect(area).toEqual({ x: 90, y: 40, width: 20, height: 20 });
    expect(getConnectionLinkBounds([ { x: 0, y: 0 } ])).toBeNull();
  });

  it('maps diagram coordinates to page coordinates', () => {
    const viewBox = { x: 100, y: 50, width: 1000, height: 500 };
    const layout = getPageLayout(viewBox, { margin: 20 });

    expect(layout).toEqual({ margin: 20, scale: 1, width: 1040, height: 540 });

    expect(toPageRect({ x: 150, y: 60, width: 10, height: 20 }, viewBox, layout))
      .toEqual({ x: 70, y: 30, width: 10, height: 20 });
  });

  it('scales down diagrams larger than the PDF page limit', () => {
    const viewBox = { x: 0, y: 0, width: 28704, height: 1000 };
    const layout = getPageLayout(viewBox, { margin: 24, maxSize: 14400 });

    expect(layout.scale).toBeCloseTo(0.5);
    expect(layout.width).toBeCloseTo(14400);

    expect(toPageRect({ x: 1000, y: 100, width: 100, height: 40 }, viewBox, layout))
      .toEqual({ x: 524, y: 74, width: 50, height: 20 });
  });
});
