import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  append as svgAppend,
  classes as svgClasses,
  create as svgCreate,
  innerSVG
} from 'tiny-svg';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { getBo, getKind, getLinks, getScreenId, isLabel } from './util.js';
import { getGlyphMarkup, getLinkGlyphMarkup, getScreenGlyphMarkup } from './icons.js';
import {
  LINK_BADGE_CLASS,
  LINK_BADGE_SIZE,
  SCREEN_BADGE_CLASS,
  SCREEN_BADGE_SIZE,
  getBadgeBounds,
  getScreenBadgeBounds
} from './constants.js';

const HIGH_PRIORITY = 1500;
const DEFAULT_STROKE = 'black';
const SCREEN_COLOR = '#2D5BE3';
const BROKEN_COLOR = '#B3261E';

export { LINK_BADGE_CLASS, LINK_BADGE_SIZE };

/**
 * Отрисовка элементов state machine.
 *
 * Фигура рисуется стандартным BpmnRenderer (задача, промежуточное событие,
 * объект/хранилище данных), поверх добавляется иконка вида — как у User Task
 * или Service Task. Цвета — стандартные (чёрно-белые) или заданные пользователем.
 *
 * Также дорисовывает значок ссылки на любых фигурах с sm:Links
 * и значок экрана прототипа на Cmd / Mobile с sm:screen.
 */
export default class SmRenderer extends BaseRenderer {

  constructor(eventBus, bpmnRenderer, smProjectBridge) {
    super(eventBus, HIGH_PRIORITY);

    this._bpmnRenderer = bpmnRenderer;
    this._smProjectBridge = smProjectBridge;
  }

  canRender(element) {
    if (!element || isLabel(element) || element.waypoints) {
      return false;
    }

    if (is(element, 'bpmn:Process') || is(element, 'bpmn:Collaboration')) {
      return false;
    }

    return !!getKind(element) || getLinks(element).length > 0;
  }

  drawShape(parentGfx, element, attrs = {}) {
    const shape = this._bpmnRenderer.drawShape(parentGfx, element, attrs);
    const kind = getKind(element);
    const color = getStrokeColor(element, DEFAULT_STROKE, attrs.stroke);

    if (kind === 'event') {
      this._glyph(parentGfx, kind, color, element.width / 2 - 9, element.height / 2 - 9, 18 / 16, 1.4);
    } else if (kind === 'json') {
      this._glyph(parentGfx, kind, color, element.width / 2 - 8, element.height / 2 - 4, 1, 1.4);
      this._dataArrow(parentGfx, element, color);
    } else if (kind === 'db') {
      this._glyph(parentGfx, kind, color, element.width / 2 - 8, element.height / 2 - 2, 1, 1.3);
    } else if (kind) {

      // как маркер типа задачи: левый верхний угол
      this._glyph(parentGfx, kind, color, 6, 6, 1, 1.3);
    }

    if (getLinks(element).length) {
      this._linkBadge(parentGfx, element, color);
    }

    const screenId = getScreenId(element);

    if (screenId) {
      this._screenBadge(parentGfx, element, screenId);
    }

    return shape;
  }

  getShapePath(element) {
    return this._bpmnRenderer.getShapePath(element);
  }

  _glyph(parentGfx, kind, color, x, y, scale, strokeWidth) {
    const group = svgCreate('g', {
      transform: `translate(${ x }, ${ y }) scale(${ scale })`
    });

    svgClasses(group).add('sm-kind-icon');
    innerSVG(group, getGlyphMarkup(kind, color, strokeWidth / scale));
    svgAppend(parentGfx, group);

    return group;
  }

  /** Стрелка входа/выхода данных, как у bpmn:DataInput / bpmn:DataOutput. */
  _dataArrow(parentGfx, element, color) {
    const direction = getBo(element).get('sm:direction');

    if (direction !== 'in' && direction !== 'out') {
      return;
    }

    const arrow = svgCreate('path', {
      d: 'M 0 3 L 6 3 L 6 0 L 11 5 L 6 10 L 6 7 L 0 7 Z',
      transform: 'translate(3, 3)',
      fill: direction === 'out' ? color : 'white',
      stroke: color,
      'stroke-width': 1,
      'stroke-linejoin': 'round'
    });

    svgAppend(parentGfx, arrow);
  }

  /** Значок экрана; красный, если экрана нет в проекте. */
  _screenBadge(parentGfx, element, screenId) {
    const bounds = getScreenBadgeBounds(element.width, element.height);
    const screen = this._smProjectBridge.getScreen(screenId);
    const color = screen ? SCREEN_COLOR : BROKEN_COLOR;

    const group = svgCreate('g', {
      transform: `translate(${ bounds.x }, ${ bounds.y })`
    });

    svgClasses(group).add(SCREEN_BADGE_CLASS);

    if (!screen) {
      svgClasses(group).add(`${ SCREEN_BADGE_CLASS }--broken`);
    }

    const title = svgCreate('title');

    title.textContent = screen
      ? `Экран прототипа: ${ screen.name || screen.id }. Клик — перейти`
      : `Экран ${ screenId } не найден в прототипе`;
    svgAppend(group, title);

    svgAppend(group, svgCreate('rect', {
      x: 0, y: 0, width: SCREEN_BADGE_SIZE, height: SCREEN_BADGE_SIZE,
      rx: 3, ry: 3,
      fill: 'white',
      stroke: color,
      'stroke-width': 1
    }));

    const glyph = svgCreate('g');

    innerSVG(glyph, getScreenGlyphMarkup(color, 1.2));
    svgAppend(group, glyph);
    svgAppend(parentGfx, group);

    return group;
  }

  _linkBadge(parentGfx, element, color) {
    const bounds = getBadgeBounds(element.width, element.height);
    const count = getLinks(element).length;
    const outside = bounds.y < 0;

    const group = svgCreate('g', {
      transform: `translate(${ bounds.x }, ${ bounds.y })`
    });

    svgClasses(group).add(LINK_BADGE_CLASS);

    // прозрачная подложка увеличивает область клика; снаружи фигуры — белый фон
    svgAppend(group, svgCreate('rect', {
      x: 0, y: 0, width: LINK_BADGE_SIZE, height: LINK_BADGE_SIZE,
      rx: 3, ry: 3,
      fill: outside ? 'white' : 'none',
      stroke: outside ? color : 'none',
      'stroke-width': outside ? 1 : 0
    }));

    const glyph = svgCreate('g');

    innerSVG(glyph, getLinkGlyphMarkup(color, 1.2));
    svgAppend(group, glyph);

    if (count > 1) {
      const text = svgCreate('text', {
        x: -1,
        y: 10,
        'text-anchor': 'end',
        'font-size': 8,
        'font-family': 'Arial, sans-serif',
        fill: color
      });

      text.textContent = String(count);
      svgAppend(group, text);
    }

    svgAppend(parentGfx, group);

    return group;
  }
}

SmRenderer.$inject = [ 'eventBus', 'bpmnRenderer', 'smProjectBridge' ];
