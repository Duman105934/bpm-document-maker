import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';

import {
  CheckboxEntry,
  Group,
  ListGroup,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry,
  isSelectEntryEdited,
  isTextAreaEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import {
  getColumns,
  getCompatibleKinds,
  getJsonBody,
  getJsonError,
  getKind,
  getKindConfig,
  getLinks,
  getParameters,
  isSafeUrl
} from '../modeler/sm/util.js';

import {
  addListItem,
  removeListItem,
  removeSingleExtension,
  setSingleExtension
} from './extension-utils.js';

import ScreenSelectEntry from './ScreenSelectEntry.js';

const LOW_PRIORITY = 500;

/**
 * Группы панели свойств для элементов state machine:
 * «State machine», «Параметры», «JSON», «Колонки таблицы», «Ссылки».
 */
export default class SmPropertiesProvider {

  constructor(propertiesPanel, injector) {
    this._injector = injector;

    propertiesPanel.registerProvider(LOW_PRIORITY, this);
  }

  getGroups(element) {
    return groups => {
      if (!hasBusinessObject(element)) {
        return groups;
      }

      const injector = this._injector;
      const cfg = getKindConfig(element);

      const smGroups = [
        GeneralGroup(element),
        cfg && cfg.parameters && ParametersGroup(element, injector),
        cfg && cfg.json && JsonGroup(element),
        cfg && cfg.columns && ColumnsGroup(element, injector)
      ].filter(Boolean);

      // свои группы — сразу после «General»
      const index = groups.findIndex(g => g.id === 'general');

      groups.splice(index === -1 ? 0 : index + 1, 0, ...smGroups);

      groups.push(LinksGroup(element, injector));

      return groups;
    };
  }
}

SmPropertiesProvider.$inject = [ 'propertiesPanel', 'injector' ];

function hasBusinessObject(element) {
  return !!(element && element.businessObject && !element.labelTarget);
}

// State machine ////////////////////

function GeneralGroup(element) {
  const cfg = getKindConfig(element);
  const entries = [];

  if (getCompatibleKinds(element).length) {
    entries.push({ id: 'sm-kind', component: KindEntry, isEdited: isSelectEntryEdited });
  }

  if (cfg) {
    cfg.fields.forEach(field => {
      const select = !!field.options || field.source === 'screens';

      entries.push({
        id: `sm-${ field.name }`,
        component: field.source === 'screens' ? ScreenSelectEntry : (field.options ? AttrSelectEntry : AttrTextEntry),
        attr: field.name,
        label: field.label,
        hint: field.hint,
        options: field.options,
        isEdited: select ? isSelectEntryEdited : isTextFieldEntryEdited
      });
    });
  }

  if (is(element, 'bpmn:SequenceFlow')) {
    entries.push({
      id: 'sm-trigger',
      component: AttrTextEntry,
      attr: 'trigger',
      label: 'Триггер перехода',
      hint: 'Событие или условие, по которому выполняется переход',
      isEdited: isTextFieldEntryEdited
    });
  }

  entries.push({
    id: 'sm-summary',
    component: SummaryEntry,
    isEdited: isTextAreaEntryEdited
  });

  return {
    id: 'sm-general',
    label: cfg ? `State machine · ${ cfg.title }` : 'Описание',
    entries,
    component: Group
  };
}

function KindEntry(props) {
  const { element } = props;

  const smElementFactory = useService('smElementFactory');

  const getOptions = () => [
    { value: '', label: '— обычный BPMN-элемент —' },
    ...getCompatibleKinds(element).map(cfg => ({ value: cfg.kind, label: `${ cfg.title } — ${ cfg.description }` }))
  ];

  return SelectEntry({
    element,
    id: 'sm-kind',
    label: 'Вид элемента',
    getValue: () => getKind(element) || '',
    setValue: value => smElementFactory.switchKind(element, value || null),
    getOptions
  });
}

function AttrTextEntry(props) {
  const { element, id, attr, label, hint } = props;

  const modeling = useService('modeling');
  const debounce = useService('debounceInput');

  return TextFieldEntry({
    element,
    id,
    label,
    description: hint,
    getValue: () => getBusinessObject(element).get(`sm:${ attr }`) || '',
    setValue: value => modeling.updateProperties(element, { [`sm:${ attr }`]: value || undefined }),
    debounce
  });
}

function AttrSelectEntry(props) {
  const { element, id, attr, label, hint, options } = props;

  const modeling = useService('modeling');

  return SelectEntry({
    element,
    id,
    label,
    description: hint,
    getValue: () => getBusinessObject(element).get(`sm:${ attr }`) || '',
    setValue: value => modeling.updateProperties(element, { [`sm:${ attr }`]: value || undefined }),
    getOptions: () => options
  });
}

function SummaryEntry(props) {
  const { element } = props;

  const modeling = useService('modeling');
  const debounce = useService('debounceInput');

  return TextAreaEntry({
    element,
    id: 'sm-summary',
    label: 'Краткое описание',
    description: 'Показывается во всплывающей подсказке при наведении',
    getValue: () => getBusinessObject(element).get('sm:summary') || '',
    setValue: value => modeling.updateProperties(element, { 'sm:summary': value || undefined }),
    debounce,
    rows: 3,
    autoResize: true
  });
}

// Параметры ////////////////////

function ParametersGroup(element, injector) {
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const items = getParameters(element).map((parameter, index) => {
    const id = `${ element.id }-sm-parameter-${ index }`;
    const direction = parameter.get('direction') === 'out' ? 'out' : 'in';

    return {
      id,
      label: `${ direction === 'out' ? '⇠ out' : '⇢ in' } · ${ parameter.get('name') || '<без имени>' }`,
      entries: [
        { id: `${ id }-name`, component: ModdleTextEntry, moddleElement: parameter, attr: 'name', label: 'Имя' },
        { id: `${ id }-direction`, component: DirectionEntry, parameter },
        { id: `${ id }-type`, component: ModdleTextEntry, moddleElement: parameter, attr: 'type', label: 'Тип', hint: 'string, number, boolean, object, …' },
        { id: `${ id }-required`, component: RequiredEntry, parameter },
        { id: `${ id }-description`, component: ModdleTextEntry, moddleElement: parameter, attr: 'description', label: 'Описание', multiline: true }
      ],
      autoFocusEntry: `${ id }-name`,
      remove: event => {
        event.stopPropagation();
        removeListItem({ element, commandStack, containerType: 'sm:Parameters', item: parameter });
      }
    };
  });

  return {
    id: 'sm-parameters',
    label: 'Параметры (вход / выход)',
    component: ListGroup,
    items,
    add: event => {
      event.stopPropagation();
      addListItem({
        element, bpmnFactory, commandStack,
        containerType: 'sm:Parameters',
        itemType: 'sm:Parameter',
        attrs: { direction: 'in' }
      });
    }
  };
}

function ModdleTextEntry(props) {
  const { element, id, moddleElement, attr, label, hint, multiline } = props;

  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');

  const options = {
    element: moddleElement,
    id,
    label,
    description: hint,
    getValue: () => moddleElement.get(attr) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement,
      properties: { [attr]: value || undefined }
    }),
    debounce
  };

  return multiline ? TextAreaEntry({ ...options, rows: 2, autoResize: true }) : TextFieldEntry(options);
}

function DirectionEntry(props) {
  const { element, id, parameter } = props;

  const commandStack = useService('commandStack');

  return SelectEntry({
    element: parameter,
    id,
    label: 'Направление',
    getValue: () => parameter.get('direction') === 'out' ? 'out' : 'in',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: parameter,
      properties: { direction: value }
    }),
    getOptions: () => [
      { value: 'in', label: 'in — входной' },
      { value: 'out', label: 'out — выходной' }
    ]
  });
}

function RequiredEntry(props) {
  const { element, id, parameter } = props;

  const commandStack = useService('commandStack');

  return CheckboxEntry({
    element: parameter,
    id,
    label: 'Обязательный',
    getValue: () => !!parameter.get('required'),
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: parameter,
      properties: { required: value || undefined }
    })
  });
}

// JSON ////////////////////

function JsonGroup(element) {
  return {
    id: 'sm-json',
    label: 'JSON',
    entries: [
      { id: 'sm-json-body', component: JsonBodyEntry, isEdited: isTextAreaEntryEdited }
    ],
    component: Group
  };
}

function JsonBodyEntry(props) {
  const { element } = props;

  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');

  const body = getJsonBody(element);
  const error = getJsonError(body);

  const setValue = value => {
    if (!value || !value.trim()) {
      removeSingleExtension({ element, commandStack, type: 'sm:Json' });
      return;
    }

    setSingleExtension({ element, bpmnFactory, commandStack, type: 'sm:Json', properties: { body: value } });
  };

  return TextAreaEntry({
    element,
    id: 'sm-json-body',
    label: 'Тело JSON (пример или схема)',
    description: error
      ? `⚠ JSON некорректен: ${ error }`
      : (body ? 'JSON корректен. В подсказке показывается отформатированным.' : 'Вставьте пример запроса/ответа'),
    getValue: () => getJsonBody(element),
    setValue,
    debounce,
    rows: 10,
    monospace: true,
    autoResize: true
  });
}

// Колонки таблицы БД ////////////////////

function ColumnsGroup(element, injector) {
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const items = getColumns(element).map((column, index) => {
    const id = `${ element.id }-sm-column-${ index }`;
    const flags = [ column.get('primaryKey') ? 'PK' : '', column.get('type') || '' ].filter(Boolean).join(' · ');

    return {
      id,
      label: `${ column.get('name') || '<без имени>' }${ flags ? ' · ' + flags : '' }`,
      entries: [
        { id: `${ id }-name`, component: ModdleTextEntry, moddleElement: column, attr: 'name', label: 'Имя колонки' },
        { id: `${ id }-type`, component: ModdleTextEntry, moddleElement: column, attr: 'type', label: 'Тип', hint: 'uuid, varchar(64), numeric(18,2), timestamptz, …' },
        { id: `${ id }-pk`, component: ModdleCheckboxEntry, moddleElement: column, attr: 'primaryKey', label: 'Первичный ключ (PK)' },
        { id: `${ id }-nullable`, component: ModdleCheckboxEntry, moddleElement: column, attr: 'nullable', label: 'Может быть NULL' },
        { id: `${ id }-description`, component: ModdleTextEntry, moddleElement: column, attr: 'description', label: 'Описание', multiline: true }
      ],
      autoFocusEntry: `${ id }-name`,
      remove: event => {
        event.stopPropagation();
        removeListItem({ element, commandStack, containerType: 'sm:Columns', item: column });
      }
    };
  });

  return {
    id: 'sm-columns',
    label: 'Колонки таблицы',
    component: ListGroup,
    items,
    add: event => {
      event.stopPropagation();
      addListItem({
        element, bpmnFactory, commandStack,
        containerType: 'sm:Columns',
        itemType: 'sm:Column',
        attrs: {}
      });
    }
  };
}

function ModdleCheckboxEntry(props) {
  const { element, id, moddleElement, attr, label } = props;

  const commandStack = useService('commandStack');

  return CheckboxEntry({
    element: moddleElement,
    id,
    label,
    getValue: () => !!moddleElement.get(attr),
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement,
      properties: { [attr]: value || undefined }
    })
  });
}

// Ссылки ////////////////////

function LinksGroup(element, injector) {
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const items = getLinks(element).map((link, index) => {
    const id = `${ element.id }-sm-link-${ index }`;

    return {
      id,
      label: link.get('title') || link.get('href') || '<новая ссылка>',
      entries: [
        { id: `${ id }-title`, component: ModdleTextEntry, moddleElement: link, attr: 'title', label: 'Название', hint: 'Например: Swagger, Confluence, Figma' },
        { id: `${ id }-href`, component: LinkHrefEntry, link }
      ],
      autoFocusEntry: `${ id }-href`,
      remove: event => {
        event.stopPropagation();
        removeListItem({ element, commandStack, containerType: 'sm:Links', item: link });
      }
    };
  });

  return {
    id: 'sm-links',
    label: 'Ссылки',
    component: ListGroup,
    items,
    add: event => {
      event.stopPropagation();
      addListItem({
        element, bpmnFactory, commandStack,
        containerType: 'sm:Links',
        itemType: 'sm:Link',
        attrs: {}
      });
    }
  };
}

function LinkHrefEntry(props) {
  const { element, id, link } = props;

  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');

  return TextFieldEntry({
    element: link,
    id,
    label: 'URL',
    description: 'http(s):// или mailto:. Ссылка кликабельна в подсказке, SVG и PDF',
    getValue: () => link.get('href') || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: link,
      properties: { href: value ? value.trim() : undefined }
    }),
    validate: value => {
      if (value && !isSafeUrl(value)) {
        return 'Нужен полный URL: https://…, http://… или mailto:…';
      }
    },
    debounce
  });
}

