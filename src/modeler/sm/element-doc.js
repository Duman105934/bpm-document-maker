import { is } from 'bpmn-js/lib/util/ModelUtil';

import { DIRECTION_LABELS, FIELD_LABELS } from './kinds.js';
import {
  getBo,
  getColumns,
  getDocumentation,
  getJsonBody,
  getJsonError,
  getKind,
  getKindConfig,
  getParameters,
  getSafeLinks,
  getScreenId,
  getSummary
} from './util.js';

/**
 * @typedef {Object} ElementDoc
 * @property {string|undefined} kind     вид sm, если задан
 * @property {string} title              название вида или BPMN-тип без префикса
 * @property {string} type               BPMN-тип
 * @property {string} name
 * @property {string} summary
 * @property {string} documentation
 * @property {Array<{ key: string, label: string, value: string }>} fields
 * @property {Array<{ name: string, direction: 'in'|'out', type: string, required: boolean, description: string }>} parameters
 * @property {Array<{ id: string, name: string, direction: string, body: string, error: string|null }>} json
 *           собственный JSON элемента (id = id элемента) и JSON связанных объектов данных
 * @property {Array<{ id: string, table: string, name: string, columns: Array<{ name, type, primaryKey, nullable, description }> }>} columns
 *           колонки собственной таблицы и связанных DB table
 * @property {Array<{ title: string, href: string }>} links
 * @property {{ id: string, name?: string, code?: string, missing: boolean }} [screen]
 */

/**
 * Описание узла схемы в виде данных: для подсказки, инфо-панели просмотра и выносок PDF.
 *
 * @param {Object} element      элемент diagram-js или бизнес-объект moddle
 * @param {Object} [bridge]     smProjectBridge — для имени экрана
 * @returns {ElementDoc}
 */
export function collectElementDoc(element, bridge) {
  const bo = getBo(element);
  const cfg = getKindConfig(element);
  const kind = getKind(element);

  const fields = Object.keys(FIELD_LABELS)
    .map(key => [ key, bo.get(`sm:${ key }`) ])
    .filter(([ , value ]) => value)
    .map(([ key, value ]) => ({
      key,
      label: FIELD_LABELS[key] || key,
      value: key === 'direction' ? (DIRECTION_LABELS[value] || value) : String(value)
    }));

  const parameters = getParameters(element).map(p => ({
    name: p.get('name') || '',
    direction: p.get('direction') === 'out' ? 'out' : 'in',
    type: p.get('type') || '',
    required: !!p.get('required'),
    description: p.get('description') || ''
  }));

  const json = [];
  const columns = [];

  addData(bo, json, columns);
  getAssociatedData(bo).forEach(data => addData(data, json, columns));

  const doc = {
    kind,
    title: cfg ? cfg.title : typeTitle(bo),
    type: bo.$type,
    name: bo.get('name') || '',
    summary: getSummary(element),
    documentation: getDocumentation(element),
    fields,
    parameters,
    json,
    columns,
    links: getSafeLinks(element)
  };

  const screenId = getScreenId(element);

  if (screenId) {
    const screen = bridge && bridge.getScreen(screenId);

    doc.screen = screen
      ? { id: screenId, name: screen.name, code: screen.code, missing: false }
      : { id: screenId, missing: true };
  }

  return doc;
}

/** Есть ли что показать в подсказке. */
export function hasDocContent(doc) {
  return !!(doc.kind || doc.summary || doc.documentation || doc.links.length || doc.fields.length || doc.screen);
}

function addData(bo, json, columns) {
  const body = getJsonBody(bo);

  if (body) {
    json.push({
      id: bo.id,
      name: bo.get('name') || '',
      direction: bo.get('sm:direction') || '',
      body,
      error: getJsonError(body)
    });
  }

  const items = getColumns(bo);

  if (items.length) {
    columns.push({
      id: bo.id,
      table: bo.get('sm:table') || '',
      name: bo.get('name') || '',
      columns: items.map(c => ({
        name: c.get('name') || '',
        type: c.get('type') || '',
        primaryKey: !!c.get('primaryKey'),
        nullable: !!c.get('nullable'),
        description: c.get('description') || ''
      }))
    });
  }
}

/** Название типа без вида sm: развилки и события по-русски, остальное — тип BPMN. */
function typeTitle(bo) {
  if (is(bo, 'bpmn:Gateway')) {
    return 'Развилка';
  }

  if (is(bo, 'bpmn:StartEvent')) {
    return 'Начало';
  }

  if (is(bo, 'bpmn:EndEvent')) {
    return 'Конец';
  }

  return String(bo.$type || '').replace('bpmn:', '');
}

function getList(bo, name) {
  try {
    return bo.get(name) || [];
  } catch (error) {
    // у типа нет такого свойства (строгий moddle)
    return [];
  }
}

/**
 * Объекты и хранилища данных, связанные с элементом через
 * dataInputAssociation (вход) и dataOutputAssociation (выход).
 * Не только задачи: события (Event) тоже могут быть связаны с данными.
 */
export function getAssociatedData(bo) {
  if (!bo || !bo.get) {
    return [];
  }

  const result = [];

  getList(bo, 'dataInputAssociations').forEach(association => {
    (association.get('sourceRef') || []).forEach(ref => result.push(ref));
  });

  getList(bo, 'dataOutputAssociations').forEach(association => {
    const target = association.get('targetRef');

    if (target) {
      result.push(target);
    }
  });

  return result.filter((ref, index) => ref && ref.$type && result.indexOf(ref) === index &&
    (is(ref, 'bpmn:DataObjectReference') || is(ref, 'bpmn:DataStoreReference')));
}
