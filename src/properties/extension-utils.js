import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';

import { getExtension } from '../modeler/sm/util.js';

/**
 * Помощники для работы с bpmn:extensionElements через commandStack
 * (все изменения отменяются одним Ctrl+Z).
 */

const MULTI_COMMAND = 'properties-panel.multi-command-executor';

function createElement(bpmnFactory, type, attrs, parent) {
  const element = bpmnFactory.create(type, attrs);

  if (parent) {
    element.$parent = parent;
  }

  return element;
}

/**
 * Найти или создать extensionElements и контейнер нужного типа.
 * Команды создания добавляются в `commands`.
 */
function ensureContainer({ element, bpmnFactory, containerType, containerAttrs = {}, commands }) {
  const bo = getBusinessObject(element);

  let extensionElements = bo.get('extensionElements');

  if (!extensionElements) {
    extensionElements = createElement(bpmnFactory, 'bpmn:ExtensionElements', { values: [] }, bo);

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: bo, properties: { extensionElements } }
    });
  }

  let container = (extensionElements.get('values') || []).find(v => is(v, containerType));

  if (!container) {
    container = createElement(bpmnFactory, containerType, containerAttrs, extensionElements);

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: extensionElements,
        properties: { values: [ ...extensionElements.get('values'), container ] }
      }
    });
  }

  return container;
}

/** Удалить контейнер из extensionElements (и сам extensionElements, если он опустел). */
function removeContainerCommands(element, container) {
  const bo = getBusinessObject(element);
  const extensionElements = bo.get('extensionElements');
  const values = extensionElements.get('values').filter(v => v !== container);

  if (!values.length) {
    return [ {
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: bo, properties: { extensionElements: undefined } }
    } ];
  }

  return [ {
    cmd: 'element.updateModdleProperties',
    context: { element, moddleElement: extensionElements, properties: { values } }
  } ];
}

/**
 * Добавить элемент в список (sm:Parameters/sm:Parameter, sm:Links/sm:Link).
 */
export function addListItem({ element, bpmnFactory, commandStack, containerType, itemType, attrs = {} }) {
  const commands = [];

  const container = ensureContainer({ element, bpmnFactory, containerType, containerAttrs: { values: [] }, commands });
  const item = createElement(bpmnFactory, itemType, attrs, container);

  commands.push({
    cmd: 'element.updateModdleProperties',
    context: {
      element,
      moddleElement: container,
      properties: { values: [ ...container.get('values'), item ] }
    }
  });

  commandStack.execute(MULTI_COMMAND, commands);

  return item;
}

/**
 * Удалить элемент списка; пустой контейнер тоже удаляется.
 */
export function removeListItem({ element, commandStack, containerType, item }) {
  const container = getExtension(element, containerType);

  if (!container) {
    return;
  }

  const values = container.get('values').filter(v => v !== item);

  const commands = values.length ? [ {
    cmd: 'element.updateModdleProperties',
    context: { element, moddleElement: container, properties: { values } }
  } ] : removeContainerCommands(element, container);

  commandStack.execute(MULTI_COMMAND, commands);
}

/**
 * Создать или обновить одиночный extension element (sm:Screenshot).
 */
export function setSingleExtension({ element, bpmnFactory, commandStack, type, properties }) {
  const commands = [];
  const existing = getExtension(element, type);

  if (existing) {
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: existing, properties }
    });
  } else {
    ensureContainer({ element, bpmnFactory, containerType: type, containerAttrs: properties, commands });
  }

  commandStack.execute(MULTI_COMMAND, commands);
}

export function removeSingleExtension({ element, commandStack, type }) {
  const existing = getExtension(element, type);

  if (!existing) {
    return;
  }

  commandStack.execute(MULTI_COMMAND, removeContainerCommands(element, existing));
}
