import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';

import { LINK_BADGE_CLASS } from '../modeler/sm/constants.js';
import { getKind, getSafeLinks, getSummary } from '../modeler/sm/util.js';

import { stripInvalidXmlChars } from './xml-chars';

import {
  CAPTION_FONT_SIZE,
  getBadgeLocalBounds,
  getCaptionLocalBounds,
  getConnectionLinkBounds,
  parseViewBox,
  toAbsolute
} from './link-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const LINK_COLOR = '#000000';
const EXTRA_PADDING = 8;

/** Служебная графика diagram-js, которая не нужна в экспорте. */
const JUNK_SELECTORS = [
  '.djs-hit',
  '.djs-outline',
  '.djs-bendpoints',
  '.djs-segment-dragger',
  '.djs-resizer',
  '.djs-dragger'
];

/**
 * @typedef {Object} ElementInfo
 * @property {string} id
 * @property {string} name
 * @property {string} summary
 * @property {Array<{ title: string, href: string }>} links
 * @property {boolean} isConnection
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [width]
 * @property {number} [height]
 * @property {Array<{x:number,y:number}>} [waypoints]
 * @property {boolean} [labelBelow]  у фигуры внешняя подпись снизу (события)
 */

/**
 * Собрать данные элементов из модельера для постобработки SVG.
 *
 * @returns {ElementInfo[]}
 */
export function collectElementInfos(elementRegistry) {
  return elementRegistry
    .filter(element => {
      return element.businessObject &&
        !element.labelTarget &&
        element.parent &&
        !is(element, 'bpmn:Process') &&
        !is(element, 'bpmn:Collaboration');
    })
    .map(element => {
      const bo = getBusinessObject(element);
      const isConnection = !!element.waypoints;

      return {
        id: element.id,
        name: bo.get('name') || '',
        summary: getSummary(element),
        kind: getKind(element),
        links: getSafeLinks(element),
        isConnection,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        waypoints: isConnection ? element.waypoints.map(p => ({ x: p.x, y: p.y })) : undefined,
        labelBelow: !!(element.label && !element.label.hidden && element.label.y > element.y + element.height / 2)
      };
    });
}

/**
 * Постобработка SVG из modeler.saveSVG():
 *  - убирает служебную графику diagram-js;
 *  - добавляет <title> (имя + краткое описание) — подсказка в браузере;
 *  - делает ссылки элементов кликабельными (<a href>);
 *  - при нескольких ссылках рисует под фигурой подписи-ссылки;
 *  - при необходимости меняет шрифт (для PDF).
 *
 * @param {string} svgString
 * @param {ElementInfo[]} infos
 * @param {Object} [options]
 * @param {string} [options.fontFamily]  заменить шрифт во всех текстах
 * @param {boolean} [options.anchors=true]  оставить <a> в SVG; для PDF ссылки
 *        добавляются аннотациями по linkAreas, а <a> убираются, чтобы не было дублей
 *
 * @returns {{ doc: Document, viewBox: { x: number, y: number, width: number, height: number }, linkAreas: Array<{ x, y, width, height, href }> }}
 */
export function enhanceSvgDocument(svgString, infos, options = {}) {
  // имя элемента с управляющим символом ломает разбор всего SVG
  const doc = new DOMParser().parseFromString(stripInvalidXmlChars(svgString), 'image/svg+xml');
  const root = doc.documentElement;

  if (!root || root.nodeName !== 'svg') {
    throw new Error('Некорректный SVG');
  }

  JUNK_SELECTORS.forEach(selector => {
    root.querySelectorAll(selector).forEach(node => node.remove());
  });

  const linkAreas = [];
  const extraBounds = [];

  infos.forEach(info => {
    const gfx = root.querySelector(`[data-element-id="${ cssEscape(info.id) }"]`);

    if (!gfx) {
      return;
    }

    addTitle(doc, gfx, info);

    if (!info.links.length) {
      return;
    }

    const visual = childByClass(gfx, 'djs-visual');

    if (!visual) {
      return;
    }

    const [ first ] = info.links;

    if (info.isConnection) {
      wrap(doc, visual, first);

      const area = getConnectionLinkBounds(info.waypoints);

      if (area) {
        linkAreas.push({ ...area, href: first.href });
      }

      return;
    }

    const badgeArea = toAbsolute(info, getBadgeLocalBounds(info.width, info.height));

    if (info.links.length === 1) {

      // одна ссылка — кликабельна вся фигура вместе со значком
      wrap(doc, visual, first);
      linkAreas.push({ x: info.x, y: info.y, width: info.width, height: info.height, href: first.href });
      linkAreas.push({ ...badgeArea, href: first.href });

      return;
    }

    // несколько ссылок — значок ведёт на первую, под фигурой подписи для каждой
    const badge = visual.querySelector(`.${ LINK_BADGE_CLASS }`);

    if (badge) {
      wrap(doc, badge, first);
      linkAreas.push({ ...badgeArea, href: first.href });
    }

    const captions = getCaptionLocalBounds(info, info.links, { above: info.labelBelow });
    const group = el(doc, 'g', { class: 'sm-link-captions' });

    info.links.forEach((link, index) => {
      const bounds = captions[index];
      const a = createLink(doc, link);

      a.appendChild(el(doc, 'rect', {
        x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
        fill: '#FFFFFF', 'fill-opacity': 0.85, stroke: 'none', rx: 2, ry: 2
      }));

      a.appendChild(el(doc, 'path', {
        d: chainIconPath(bounds.x + 1, bounds.y + 2),
        fill: 'none', stroke: LINK_COLOR, 'stroke-width': 1.1, 'stroke-linecap': 'round'
      }));

      const text = el(doc, 'text', {
        x: bounds.x + 12,
        y: bounds.baseline,
        'font-family': 'Arial, sans-serif',
        'font-size': CAPTION_FONT_SIZE,
        fill: LINK_COLOR
      });

      text.textContent = stripInvalidXmlChars(link.title);
      a.appendChild(text);

      // подчёркивание — признак ссылки в чёрно-белом документе
      a.appendChild(el(doc, 'path', {
        d: `M ${ bounds.x + 12 } ${ bounds.baseline + 1.5 } H ${ bounds.x + bounds.width - 2 }`,
        stroke: LINK_COLOR, 'stroke-width': 0.6, fill: 'none'
      }));
      group.appendChild(a);

      const area = toAbsolute(info, bounds);

      linkAreas.push({ ...area, href: link.href });
      extraBounds.push(area);
    });

    gfx.appendChild(group);
  });

  const viewBox = expandViewBox(root, extraBounds);

  if (options.fontFamily) {
    replaceFont(root, options.fontFamily);
  }

  if (options.anchors === false) {
    unwrapAnchors(root);
  }

  return { doc, viewBox, linkAreas };
}

/**
 * То же, что enhanceSvgDocument, но результат — строка SVG.
 *
 * @returns {{ svg: string, viewBox: Object, linkAreas: Array<{ x, y, width, height, href }> }}
 */
export function enhanceSvg(svgString, infos, options = {}) {
  const { doc, viewBox, linkAreas } = enhanceSvgDocument(svgString, infos, options);

  return {
    svg: stripInvalidXmlChars(new XMLSerializer().serializeToString(doc)),
    viewBox,
    linkAreas
  };
}

/**
 * SVG корневой плоскости. saveSVG() снимает только активную плоскость: если пользователь
 * зашёл внутрь подпроцесса, экспорт был бы плоскостью подпроцесса, а координаты графа —
 * корневые. На время снимка канва переключается на корень и возвращается обратно.
 */
async function saveRootSvg(modeler) {
  const canvas = modeler.get('canvas');
  const current = canvas.getRootElement();
  const root = modeler.get('elementRegistry').find(element => {
    return !element.parent && (is(element, 'bpmn:Process') || is(element, 'bpmn:Collaboration'));
  });

  if (!root || root === current) {
    return modeler.saveSVG();
  }

  const viewbox = canvas.viewbox();

  canvas.setRootElement(root);

  try {
    return await modeler.saveSVG();
  } finally {
    canvas.setRootElement(current);
    canvas.viewbox({ x: viewbox.x, y: viewbox.y, width: viewbox.width, height: viewbox.height });
  }
}

/**
 * Обработанный SVG схемы как Document — для вложения в другие документы.
 */
export async function exportSvgDocument(modeler, options = {}) {
  const { svg } = await saveRootSvg(modeler);
  const infos = collectElementInfos(modeler.get('elementRegistry'));

  return enhanceSvgDocument(svg, infos, options);
}

/**
 * Полный экспорт SVG из модельера.
 */
export async function exportSvg(modeler, options = {}) {
  const { svg } = await saveRootSvg(modeler);
  const infos = collectElementInfos(modeler.get('elementRegistry'));

  return enhanceSvg(svg, infos, options);
}

// helpers ////////////////////

function addTitle(doc, gfx, info) {
  const text = [ info.name, info.summary ].filter(Boolean).join(' — ');

  if (!text) {
    return;
  }

  const title = doc.createElementNS(SVG_NS, 'title');

  // имя и описание из модели могут нести управляющие символы (U+000B из Word)
  title.textContent = stripInvalidXmlChars(text);
  gfx.insertBefore(title, gfx.firstChild);
}

function createLink(doc, link) {
  const a = doc.createElementNS(SVG_NS, 'a');

  a.setAttribute('href', link.href);
  a.setAttributeNS(XLINK_NS, 'xlink:href', link.href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.setAttribute('class', 'sm-link');

  const title = doc.createElementNS(SVG_NS, 'title');

  title.textContent = stripInvalidXmlChars(`${ link.title } — ${ link.href }`);
  a.appendChild(title);

  return a;
}

function wrap(doc, node, link) {
  const a = createLink(doc, link);

  node.parentNode.insertBefore(a, node);
  a.appendChild(node);

  return a;
}

function el(doc, name, attrs) {
  const node = doc.createElementNS(SVG_NS, name);

  Object.entries(attrs).forEach(([ key, value ]) => node.setAttribute(key, String(value)));

  return node;
}

function childByClass(node, className) {
  return Array.from(node.children).find(child => child.classList && child.classList.contains(className));
}

function chainIconPath(x, y) {
  const p = (dx, dy) => `${ x + dx } ${ y + dy }`;

  return `M ${ p(4, 5.6) } L ${ p(3, 6.6) } A 1.4 1.4 0 0 1 ${ p(1, 4.6) } L ${ p(2.6, 3) } A 1.4 1.4 0 0 1 ${ p(4.6, 3) } ` +
    `M ${ p(5.6, 3.4) } L ${ p(6.6, 2.4) } A 1.4 1.4 0 0 1 ${ p(8.6, 4.4) } L ${ p(7, 6) } A 1.4 1.4 0 0 1 ${ p(5, 6) } ` +
    `M ${ p(3.6, 5) } L ${ p(6, 2.6) }`;
}

/** Расширить viewBox, чтобы подписи-ссылки не обрезались. */
function expandViewBox(root, extraBounds) {
  const viewBox = parseViewBox(root.getAttribute('viewBox'));

  if (!extraBounds.length) {
    return viewBox;
  }

  let minX = viewBox.x;
  let minY = viewBox.y;
  let maxX = viewBox.x + viewBox.width;
  let maxY = viewBox.y + viewBox.height;

  extraBounds.forEach(b => {
    minX = Math.min(minX, b.x - EXTRA_PADDING);
    minY = Math.min(minY, b.y - EXTRA_PADDING);
    maxX = Math.max(maxX, b.x + b.width + EXTRA_PADDING);
    maxY = Math.max(maxY, b.y + b.height + EXTRA_PADDING);
  });

  const result = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

  root.setAttribute('viewBox', `${ result.x } ${ result.y } ${ result.width } ${ result.height }`);
  root.setAttribute('width', String(result.width));
  root.setAttribute('height', String(result.height));

  return result;
}

function replaceFont(root, fontFamily) {
  root.querySelectorAll('[style*="font-family"]').forEach(node => {
    node.setAttribute('style', node.getAttribute('style').replace(/font-family\s*:[^;]+/g, `font-family: ${ fontFamily }`));
  });

  root.querySelectorAll('[font-family]').forEach(node => {
    node.setAttribute('font-family', fontFamily);
  });

  // текст без явного шрифта наследует его от корня
  root.setAttribute('font-family', fontFamily);
}

function unwrapAnchors(root) {
  root.querySelectorAll('a').forEach(a => {
    a.querySelectorAll(':scope > title').forEach(title => title.remove());

    while (a.firstChild) {
      a.parentNode.insertBefore(a.firstChild, a);
    }

    a.remove();
  });
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }

  return String(value).replace(/["\\]/g, '\\$&');
}
