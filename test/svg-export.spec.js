import { describe, it, expect } from 'vitest';

import { enhanceSvg } from '../src/export/svg-export.js';
import { isSafeUrl } from '../src/modeler/sm/util.js';

const SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="300" viewBox="0 0 400 300" version="1.1">
  <g class="djs-group"><g class="djs-element djs-shape" data-element-id="Task_1" transform="matrix(1 0 0 1 100 50)">
    <g class="djs-visual"><rect width="140" height="70"/><text style="font-family: Arial, sans-serif; font-size: 12px;">Задача</text>
      <g class="sm-link-badge"><rect width="16" height="16"/></g></g>
    <rect class="djs-hit djs-hit-all" width="140" height="70"/>
    <rect class="djs-outline" width="150" height="80"/>
  </g></g>
  <g class="djs-group"><g class="djs-element djs-shape" data-element-id="Mobile_1" transform="matrix(1 0 0 1 300 50)">
    <g class="djs-visual"><rect width="130" height="230"/><g class="sm-link-badge"><rect width="16" height="16"/></g></g>
  </g></g>
  <g class="djs-group"><g class="djs-element djs-connection" data-element-id="Flow_1">
    <g class="djs-visual"><path d="M 0 0 L 100 0"/></g>
  </g></g>
  <g class="djs-group"><g class="djs-element djs-shape" data-element-id="Plain_1" transform="matrix(1 0 0 1 10 10)">
    <g class="djs-visual"><rect width="10" height="10"/></g>
  </g></g>
</svg>`;

const INFOS = [
  {
    id: 'Task_1', name: 'Задача', summary: 'Краткое описание', isConnection: false,
    x: 100, y: 50, width: 140, height: 70,
    links: [ { title: 'Swagger', href: 'https://example.com/swagger' } ]
  },
  {
    id: 'Mobile_1', name: 'Экран', summary: '', isConnection: false,
    x: 300, y: 50, width: 130, height: 230,
    links: [
      { title: 'Figma', href: 'https://example.com/figma' },
      { title: 'Confluence', href: 'https://example.com/wiki' }
    ]
  },
  {
    id: 'Flow_1', name: '', summary: 'Переход', isConnection: true,
    waypoints: [ { x: 0, y: 0 }, { x: 100, y: 0 } ],
    links: [ { title: 'Jira', href: 'https://example.com/jira' } ]
  },
  {
    id: 'Plain_1', name: '', summary: '', isConnection: false,
    x: 10, y: 10, width: 10, height: 10, links: []
  }
];

function parse(svg) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

describe('enhanceSvg', () => {

  it('removes diagram-js helper graphics', () => {
    const root = parse(enhanceSvg(SVG, INFOS).svg);

    expect(root.querySelectorAll('.djs-hit').length).toBe(0);
    expect(root.querySelectorAll('.djs-outline').length).toBe(0);
  });

  it('adds <title> with name and summary', () => {
    const root = parse(enhanceSvg(SVG, INFOS).svg);
    const title = root.querySelector('[data-element-id="Task_1"] > title');

    expect(title.textContent).toBe('Задача — Краткое описание');
    expect(root.querySelector('[data-element-id="Plain_1"] > title')).toBeNull();
  });

  it('wraps the whole shape into a link when it has one link', () => {
    const { svg, linkAreas } = enhanceSvg(SVG, INFOS);
    const root = parse(svg);
    const a = root.querySelector('[data-element-id="Task_1"] > a');

    expect(a.getAttribute('href')).toBe('https://example.com/swagger');
    expect(a.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('https://example.com/swagger');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.querySelector('.djs-visual')).not.toBeNull();

    expect(linkAreas).toContainEqual({ x: 100, y: 50, width: 140, height: 70, href: 'https://example.com/swagger' });
  });

  it('adds a caption link per link when there are several', () => {
    const { svg, linkAreas, viewBox } = enhanceSvg(SVG, INFOS);
    const root = parse(svg);
    const gfx = root.querySelector('[data-element-id="Mobile_1"]');

    const captions = gfx.querySelectorAll('.sm-link-captions > a');

    expect(Array.from(captions).map(a => a.getAttribute('href')))
      .toEqual([ 'https://example.com/figma', 'https://example.com/wiki' ]);
    expect(Array.from(captions).map(a => a.querySelector('text').textContent))
      .toEqual([ 'Figma', 'Confluence' ]);

    // значок ведёт на первую ссылку
    expect(gfx.querySelector('a > .sm-link-badge').parentNode.getAttribute('href')).toBe('https://example.com/figma');

    // подписи под фигурой (y = 50 + 230 + 4 = 284) попали в viewBox
    expect(viewBox.y + viewBox.height).toBeGreaterThan(284 + 24);
    expect(root.getAttribute('viewBox')).toBe(`${ viewBox.x } ${ viewBox.y } ${ viewBox.width } ${ viewBox.height }`);

    expect(linkAreas.filter(a => a.href === 'https://example.com/wiki')).toHaveLength(1);
  });

  it('makes connections clickable', () => {
    const { svg, linkAreas } = enhanceSvg(SVG, INFOS);
    const root = parse(svg);

    expect(root.querySelector('[data-element-id="Flow_1"] > a').getAttribute('href')).toBe('https://example.com/jira');
    expect(linkAreas).toContainEqual({ x: 40, y: -10, width: 20, height: 20, href: 'https://example.com/jira' });
  });

  it('replaces fonts for PDF', () => {
    const root = parse(enhanceSvg(SVG, INFOS, { fontFamily: 'PTSans' }).svg);

    expect(root.querySelector('text').getAttribute('style')).toContain('font-family: PTSans');
    expect(root.querySelector('.sm-link-captions text').getAttribute('font-family')).toBe('PTSans');
    expect(root.getAttribute('font-family')).toBe('PTSans');
  });
});

describe('isSafeUrl', () => {

  it('allows http(s) and mailto only', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://example.com/a?b=c')).toBe(true);
    expect(isSafeUrl('mailto:team@example.com')).toBe(true);

    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl(' JavaScript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,hi')).toBe(false);
    expect(isSafeUrl('example.com')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });
});

describe('enhanceSvg for PDF', () => {

  it('removes <a> but keeps content and link areas', () => {
    const { svg, linkAreas } = enhanceSvg(SVG, INFOS, { anchors: false });
    const root = parse(svg);

    expect(root.querySelectorAll('a').length).toBe(0);
    expect(root.querySelectorAll('.sm-link-captions text').length).toBe(2);
    expect(root.querySelector('[data-element-id="Task_1"] > .djs-visual')).not.toBeNull();
    expect(linkAreas.length).toBe(6);
  });
});

describe('enhanceSvg — управляющие символы (B5)', () => {

  it('имя элемента с U+000B не ломает SVG', () => {
    const infos = INFOS.map(info => (info.id === 'Task_1' ? { ...info, name: 'Задача\u000Bиз Word' } : info));
    const { svg } = enhanceSvg(SVG, infos);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');

    expect(doc.querySelector('parsererror')).toBeNull();
    expect(svg).not.toMatch(/\u000B/);
  });
});
