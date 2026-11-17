import { is } from 'bpmn-js/lib/util/ModelUtil';

import { getKindIconUrl } from './icons.js';
import { formatJson, getBo, isLabel } from './util.js';
import { collectElementDoc, hasDocContent } from './element-doc.js';

const SHOW_DELAY = 350;
const HIDE_DELAY = 250;
const MAX_DOC_LENGTH = 280;
const MAX_JSON_LENGTH = 1500;

/**
 * Всплывающая подсказка при наведении на элемент.
 *
 * Подсказка «липкая»: скрывается с задержкой, а наведение на неё отменяет скрытие —
 * так по ссылкам внутри можно кликнуть. Во время перетаскивания, изменения
 * размера, прямого редактирования и прокрутки подсказка скрыта.
 */
export default class SmTooltip {

  constructor(eventBus, canvas, smProjectBridge) {
    this._canvas = canvas;
    this._smProjectBridge = smProjectBridge;
    this._container = canvas.getContainer();

    this._showTimer = null;
    this._hideTimer = null;
    this._current = null;
    this._suspended = false;

    this._el = document.createElement('div');
    this._el.className = 'sm-tooltip';
    this._el.setAttribute('role', 'tooltip');
    this._el.hidden = true;
    this._container.appendChild(this._el);

    this._el.addEventListener('mouseenter', () => this._cancelHide());
    this._el.addEventListener('mouseleave', () => this._scheduleHide());

    eventBus.on('element.hover', event => {
      const element = event.element;

      if (this._suspended || !shouldShow(element)) {
        return;
      }

      this._cancelHide();
      clearTimeout(this._showTimer);

      if (this._current === resolve(element) && !this._el.hidden) {
        return;
      }

      this._showTimer = setTimeout(() => this.show(element), SHOW_DELAY);
    });

    eventBus.on('element.out', () => {
      clearTimeout(this._showTimer);
      this._scheduleHide();
    });

    const suspend = () => {
      this._suspended = true;
      this.hide();
    };

    const resume = () => {
      this._suspended = false;
    };

    [
      'drag.init', 'shape.move.start', 'resize.start', 'connect.start',
      'create.start', 'directEditing.activate', 'popupMenu.open', 'lasso.start'
    ].forEach(e => eventBus.on(e, suspend));

    [
      'drag.cleanup', 'directEditing.deactivate', 'popupMenu.close', 'lasso.end', 'lasso.canceled'
    ].forEach(e => eventBus.on(e, resume));

    eventBus.on([ 'canvas.viewbox.changing', 'diagram.clear', 'import.done' ], () => this.hide());

    eventBus.on('elements.changed', ({ elements }) => {
      if (this._current && elements.includes(this._current) && !this._el.hidden) {
        this.show(this._current);
      }
    });

    eventBus.on('shape.remove', ({ element }) => {
      if (element === this._current) {
        this.hide();
      }
    });
  }

  show(element) {
    element = resolve(element);

    const html = renderContent(element, this._smProjectBridge);

    if (!html) {
      return this.hide();
    }

    this._current = element;
    this._el.innerHTML = html;
    this._el.hidden = false;
    this._position(element);
  }

  hide() {
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    this._current = null;
    this._el.hidden = true;
  }

  _scheduleHide() {
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this.hide(), HIDE_DELAY);
  }

  _cancelHide() {
    clearTimeout(this._hideTimer);
  }

  _position(element) {
    const bbox = this._canvas.getAbsoluteBBox(element);
    const containerRect = this._container.getBoundingClientRect();
    const tip = this._el;
    const gap = 10;

    // по умолчанию справа от элемента, иначе слева, иначе снизу
    tip.style.left = '0px';
    tip.style.top = '0px';

    const { width: tw, height: th } = tip.getBoundingClientRect();

    let left = bbox.x + bbox.width + gap;
    let top = bbox.y;

    if (left + tw > containerRect.width - 8) {
      left = bbox.x - tw - gap;
    }

    if (left < 8) {
      left = Math.max(8, Math.min(bbox.x, containerRect.width - tw - 8));
      top = bbox.y + bbox.height + gap;
    }

    top = Math.max(8, Math.min(top, containerRect.height - th - 8));

    tip.style.left = `${ Math.round(left) }px`;
    tip.style.top = `${ Math.round(top) }px`;
  }
}

SmTooltip.$inject = [ 'eventBus', 'canvas', 'smProjectBridge' ];

// helpers ////////////////////

function resolve(element) {
  return isLabel(element) ? element.labelTarget : element;
}

function shouldShow(element) {
  element = resolve(element);

  if (!element || !element.businessObject || element.type === 'label') {
    return false;
  }

  return !(is(element, 'bpmn:Process') || is(element, 'bpmn:Collaboration'));
}

/**
 * HTML подсказки по описанию узла (см. element-doc.js).
 * В подсказке — только собственные JSON и колонки элемента, без связанных данных.
 */
export function renderContent(element, bridge) {
  const doc = collectElementDoc(element, bridge);

  // для стандартных элементов без данных подсказка не нужна
  if (!hasDocContent(doc)) {
    return '';
  }

  const ownId = getBo(element).id;
  const json = doc.json.find(item => item.id === ownId);
  const table = doc.columns.find(item => item.id === ownId);

  const parts = [];

  parts.push('<div class="sm-tooltip-head">');

  if (doc.kind) {
    parts.push(`<img class="sm-tooltip-icon" src="${ getKindIconUrl(doc.kind) }" alt="" />`);
  }

  parts.push(`<span class="sm-tooltip-badge">${ esc(doc.title) }</span>`);
  parts.push(`<span class="sm-tooltip-name">${ esc(doc.name || 'Без названия') }</span>`);
  parts.push('</div>');

  if (doc.summary) {
    parts.push(`<div class="sm-tooltip-summary">${ esc(doc.summary) }</div>`);
  }

  if (doc.fields.length) {
    parts.push('<dl class="sm-tooltip-attrs">');
    doc.fields.forEach(field => {
      parts.push(`<dt>${ esc(field.label) }</dt><dd><code>${ esc(field.value) }</code></dd>`);
    });
    parts.push('</dl>');
  }

  if (doc.screen) {
    parts.push(doc.screen.missing
      ? `<div class="sm-tooltip-warning">Экран прототипа не найден: ${ esc(doc.screen.id) }</div>`
      : `<div class="sm-tooltip-screen">Экран прототипа: <b>${ esc(doc.screen.name || doc.screen.id) }</b></div>`);
  }

  const documentation = doc.documentation;

  if (documentation && documentation !== doc.summary) {
    const text = documentation.length > MAX_DOC_LENGTH ? documentation.slice(0, MAX_DOC_LENGTH) + '…' : documentation;

    parts.push(`<div class="sm-tooltip-doc">${ esc(text) }</div>`);
  }

  if (doc.parameters.length) {
    parts.push('<table class="sm-tooltip-table"><thead><tr><th></th><th>Параметр</th><th>Тип</th></tr></thead><tbody>');

    doc.parameters.forEach(p => {
      const required = p.required ? '<span class="sm-required" title="обязательный">*</span>' : '';
      const description = p.description ? `<div class="sm-cell-desc">${ esc(p.description) }</div>` : '';

      parts.push(
        `<tr><td><span class="sm-dir">${ p.direction }</span></td>` +
        `<td><code>${ esc(p.name || '—') }</code>${ required }${ description }</td>` +
        `<td>${ esc(p.type) }</td></tr>`
      );
    });

    parts.push('</tbody></table>');
  }

  if (table) {
    parts.push('<table class="sm-tooltip-table"><thead><tr><th>Колонка</th><th>Тип</th><th></th></tr></thead><tbody>');

    table.columns.forEach(c => {
      const flags = [ c.primaryKey ? 'PK' : '', c.nullable ? 'NULL' : '' ].filter(Boolean).join(' ');
      const description = c.description ? `<div class="sm-cell-desc">${ esc(c.description) }</div>` : '';

      parts.push(
        `<tr><td><code>${ esc(c.name || '—') }</code>${ description }</td>` +
        `<td>${ esc(c.type) }</td><td class="sm-flags">${ esc(flags) }</td></tr>`
      );
    });

    parts.push('</tbody></table>');
  }

  if (json) {
    const pretty = json.error ? json.body : formatJson(json.body);
    const text = pretty.length > MAX_JSON_LENGTH ? pretty.slice(0, MAX_JSON_LENGTH) + '\n…' : pretty;

    parts.push(`<pre class="sm-tooltip-json">${ esc(text) }</pre>`);

    if (json.error) {
      parts.push(`<div class="sm-tooltip-warning">JSON некорректен: ${ esc(json.error) }</div>`);
    }
  }

  if (doc.links.length) {
    parts.push('<ul class="sm-tooltip-links">');
    doc.links.forEach(link => {
      parts.push(`<li><a href="${ esc(link.href) }" target="_blank" rel="noopener noreferrer">${ esc(link.title) } ↗</a></li>`);
    });
    parts.push('</ul>');
  }

  return parts.join('');
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
