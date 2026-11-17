import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';

import { KINDS, KIND_LIST } from './kinds.js';

/**
 * Бизнес-объект, к которому относятся свойства элемента.
 * Для пула (Participant) это сам participant, у пустого пула processRef может отсутствовать.
 */
export function getBo(elementOrBo) {
  return elementOrBo && elementOrBo.businessObject ? getBusinessObject(elementOrBo) : elementOrBo;
}

/** @returns {string|undefined} вид элемента state machine, если он задан и известен */
export function getKind(element) {
  const bo = getBo(element);

  if (!bo || !bo.get || !is(bo, 'bpmn:FlowElement') || is(bo, 'bpmn:SequenceFlow')) {
    return;
  }

  const kind = bo.get('sm:kind');

  return KINDS[kind] ? kind : undefined;
}

const FLOW_TYPES = [ 'bpmn:Task', 'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent' ];
const DATA_TYPES = [ 'bpmn:DataObjectReference', 'bpmn:DataStoreReference' ];

/**
 * Семья видов, в которую можно превратить элемент:
 * 'flow' — задачи и промежуточные события, 'data' — объекты и хранилища данных.
 */
export function getKindFamily(element) {
  const kind = getKind(element);

  if (kind) {
    return KINDS[kind].family;
  }

  if (!element || element.labelTarget || element.waypoints) {
    return null;
  }

  if (FLOW_TYPES.includes(element.type)) {
    return 'flow';
  }

  if (DATA_TYPES.includes(element.type)) {
    return 'data';
  }

  return null;
}

/** Виды, на которые можно переключить элемент. */
export function getCompatibleKinds(element) {
  const family = getKindFamily(element);

  return family ? KIND_LIST.filter(cfg => cfg.family === family) : [];
}

export function getKindConfig(element) {
  const kind = getKind(element);

  return kind ? KINDS[kind] : undefined;
}

/**
 * id экрана прототипа, к которому привязан элемент (sm:screen).
 * Только у видов, где есть поле экрана (Cmd, Mobile).
 *
 * @returns {string|undefined}
 */
export function getScreenId(element) {
  const cfg = getKindConfig(element);

  if (!cfg || !cfg.fields.some(field => field.source === 'screens')) {
    return;
  }

  return getBo(element).get('sm:screen') || undefined;
}

/** Метки (внешние подписи событий) не рисуем своим рендерером. */
export function isLabel(element) {
  return !!(element && element.labelTarget);
}

/** Первый extension element указанного типа. */
export function getExtension(element, type) {
  const bo = getBo(element);
  const extensionElements = bo && bo.get && bo.get('extensionElements');

  if (!extensionElements) {
    return;
  }

  return (extensionElements.get('values') || []).find(value => is(value, type));
}

/** @returns {Array<Object>} sm:Parameter[] */
export function getParameters(element) {
  const parameters = getExtension(element, 'sm:Parameters');

  return parameters ? parameters.get('values') : [];
}

/** @returns {Array<Object>} sm:Link[] */
export function getLinks(element) {
  const links = getExtension(element, 'sm:Links');

  return links ? links.get('values') : [];
}

/** Только ссылки с безопасным непустым URL. */
export function getSafeLinks(element) {
  return getLinks(element)
    .filter(link => isSafeUrl(link.get('href')))
    .map(link => ({
      title: link.get('title') || link.get('href'),
      href: link.get('href').trim()
    }));
}

/** @returns {Array<Object>} sm:Column[] */
export function getColumns(element) {
  const columns = getExtension(element, 'sm:Columns');

  return columns ? columns.get('values') : [];
}

/** Текст JSON элемента (sm:Json) или ''. */
export function getJsonBody(element) {
  const json = getExtension(element, 'sm:Json');

  return (json && json.get('body')) || '';
}

/**
 * Проверка JSON.
 *
 * @returns {string|null} текст ошибки или null, если JSON корректный или пустой
 */
export function getJsonError(text) {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    JSON.parse(text);

    return null;
  } catch (error) {
    return error.message;
  }
}

/** Отформатированный JSON (2 пробела); некорректный возвращается как есть. */
export function formatJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch (e) {
    return text;
  }
}

const SAFE_PROTOCOLS = [ 'http:', 'https:', 'mailto:' ];

/**
 * Разрешены только http(s) и mailto, чтобы в экспортированном SVG/PDF
 * не оказались ссылки вида javascript: или data:.
 */
export function isSafeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return SAFE_PROTOCOLS.includes(url.protocol);
  } catch (e) {
    return false;
  }
}

/** Краткое описание: sm:summary, иначе первые строки bpmn:documentation. */
export function getSummary(element) {
  const bo = getBo(element);

  if (!bo || !bo.get) {
    return '';
  }

  return bo.get('sm:summary') || '';
}

export function getDocumentation(element) {
  const bo = getBo(element);
  const documentation = bo && bo.get && bo.get('documentation');

  if (!documentation || !documentation.length) {
    return '';
  }

  return documentation.map(d => d.get('text') || '').join('\n').trim();
}
