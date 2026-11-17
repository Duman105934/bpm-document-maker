/**
 * Единый конфиг видов элементов state machine.
 *
 * Внешне элементы — стандартные BPMN-фигуры (задача, промежуточное событие,
 * объект данных, хранилище данных), отличаются только иконкой, как User Task
 * или Service Task. Палитра, отрисовка, панель свойств и подсказка берут данные отсюда.
 */

/**
 * @typedef {Object} FieldConfig
 * @property {string} name     имя атрибута без префикса (sm:<name>)
 * @property {string} label    подпись в панели свойств
 * @property {string} [hint]   пояснение под полем
 * @property {Array<{ value: string, label: string }>} [options]  если задано — выпадающий список
 * @property {'screens'} [source]  значения берутся из проекта: 'screens' — экраны прототипа
 */

/**
 * @typedef {Object} KindConfig
 * @property {string} kind
 * @property {string} type       BPMN-тип, на который отображается элемент
 * @property {'flow'|'data'} family  между видами одной семьи можно переключаться
 * @property {string} title      название для палитры и подсказки
 * @property {string} description
 * @property {{ width: number, height: number }} size
 * @property {FieldConfig[]} fields
 * @property {boolean} [parameters]  список входных/выходных параметров
 * @property {boolean} [json]        тело JSON
 * @property {boolean} [columns]     колонки таблицы БД
 */

const TASK_SIZE = { width: 100, height: 80 };

export const HTTP_METHODS = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ];

/** @type {Record<string, KindConfig>} */
export const KINDS = {
  event: {
    kind: 'event',
    type: 'bpmn:IntermediateCatchEvent',
    family: 'flow',
    title: 'Event',
    description: 'Событие, порождающее действие или переход',
    size: { width: 36, height: 36 },
    fields: [
      { name: 'code', label: 'Код события', hint: 'Например, PAYMENT_CONFIRMED' },
      { name: 'source', label: 'Источник', hint: 'Кто порождает событие: МП, клиент, внешняя система, таймер…' }
    ],
    parameters: true
  },

  state: {
    kind: 'state',
    type: 'bpmn:Task',
    family: 'flow',
    title: 'State',
    description: 'Состояние state machine',
    size: TASK_SIZE,
    fields: [
      { name: 'code', label: 'Код состояния', hint: 'Например, WAIT_CONFIRMATION' }
    ]
  },

  cmd: {
    kind: 'cmd',
    type: 'bpmn:Task',
    family: 'flow',
    title: 'Cmd',
    description: 'Команда мобильному приложению: выполнить действие и показать экран',
    size: TASK_SIZE,
    fields: [
      { name: 'code', label: 'Код команды', hint: 'Например, SHOW_OTP_SCREEN' },
      { name: 'screen', label: 'Экран прототипа', source: 'screens' }
    ],
    parameters: true
  },

  api: {
    kind: 'api',
    type: 'bpmn:Task',
    family: 'flow',
    title: 'API',
    description: 'Вызов API стороннего контроллера / сервиса',
    size: TASK_SIZE,
    fields: [
      { name: 'controller', label: 'Контроллер / сервис', hint: 'Например, otp-service / OtpController' },
      {
        name: 'method',
        label: 'HTTP-метод',
        options: [ { value: '', label: '—' }, ...HTTP_METHODS.map(m => ({ value: m, label: m })) ]
      },
      { name: 'endpoint', label: 'Endpoint', hint: 'Например, /api/v1/otp/send' }
    ],
    parameters: true
  },

  mobile: {
    kind: 'mobile',
    type: 'bpmn:Task',
    family: 'flow',
    title: 'Mobile',
    description: 'Экран мобильного приложения',
    size: TASK_SIZE,
    fields: [
      { name: 'code', label: 'Код экрана', hint: 'Например, OTP_INPUT. Ссылку на макет добавьте в «Ссылки»' },
      { name: 'screen', label: 'Экран прототипа', source: 'screens' }
    ],
    parameters: true
  },

  json: {
    kind: 'json',
    type: 'bpmn:DataObjectReference',
    family: 'data',
    title: 'JSON',
    description: 'Входящий или исходящий JSON',
    size: { width: 36, height: 50 },
    fields: [
      {
        name: 'direction',
        label: 'Направление',
        options: [
          { value: 'in', label: 'Входящий (request)' },
          { value: 'out', label: 'Исходящий (response)' }
        ]
      }
    ],
    json: true
  },

  db: {
    kind: 'db',
    type: 'bpmn:DataStoreReference',
    family: 'data',
    title: 'DB table',
    description: 'Таблица базы данных',
    size: { width: 50, height: 50 },
    fields: [
      { name: 'table', label: 'Таблица', hint: 'Например, payments' },
      { name: 'database', label: 'БД / схема', hint: 'Например, payments_db.public' }
    ],
    columns: true
  }
};

export const KIND_LIST = Object.values(KINDS);

/** Подписи атрибутов для подсказки и экспорта (порядок = порядок показа). */
export const FIELD_LABELS = {
  code: 'Код',
  source: 'Источник',
  controller: 'Контроллер',
  method: 'Метод',
  endpoint: 'Endpoint',
  direction: 'Направление',
  table: 'Таблица',
  database: 'БД / схема',
  trigger: 'Триггер'
};

export const DIRECTION_LABELS = {
  in: 'входящий',
  out: 'исходящий'
};
