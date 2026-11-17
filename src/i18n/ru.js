/**
 * Русская локализация bpmn-js, панели свойств и своих элементов.
 *
 * Неизвестные строки остаются на английском. Добавить перевод = дописать строку в словарь.
 */
export const RU = {

  // палитра и инструменты
  'Activate hand tool': 'Рука (перемещение холста)',
  'Activate lasso tool': 'Лассо (выделение области)',
  'Activate create/remove space tool': 'Добавить/убрать пространство',
  'Activate global connect tool': 'Соединить элементы',
  'Create start event': 'Начальное событие',
  'Create intermediate/boundary event': 'Промежуточное событие',
  'Create end event': 'Конечное событие',
  'Create gateway': 'Шлюз',
  'Create task': 'Задача',
  'Create data object reference': 'Объект данных',
  'Create data store reference': 'Хранилище данных',
  'Create expanded sub-process': 'Развёрнутый подпроцесс',
  'Create pool/participant': 'Пул / участник',
  'Create group': 'Группа',
  'Create {kind}': 'Создать {kind}',
  'Search in diagram': 'Поиск по диаграмме',

  // context pad
  'Append {kind}': 'Добавить следующим: {kind}',
  'Append end event': 'Добавить конечное событие',
  'Append gateway': 'Добавить шлюз',
  'Append task': 'Добавить задачу',
  'Append intermediate/boundary event': 'Добавить промежуточное событие',
  'Append receive task': 'Добавить задачу получения',
  'Append message intermediate catch event': 'Добавить событие-сообщение',
  'Append timer intermediate catch event': 'Добавить событие-таймер',
  'Append conditional intermediate catch event': 'Добавить условное событие',
  'Append signal intermediate catch event': 'Добавить событие-сигнал',
  'Append compensation activity': 'Добавить компенсирующее действие',
  'Add text annotation': 'Добавить аннотацию',
  'Add lane above': 'Добавить дорожку выше',
  'Add lane below': 'Добавить дорожку ниже',
  'Divide into two lanes': 'Разделить на две дорожки',
  'Divide into three lanes': 'Разделить на три дорожки',
  'Change element': 'Изменить тип элемента',
  'Change type': 'Изменить тип',
  'Connect to other element': 'Соединить с другим элементом',
  'Connect using association': 'Соединить ассоциацией',
  'Connect using data input association': 'Соединить входной ассоциацией данных',
  'Delete': 'Удалить',

  // popup menu
  'Plain BPMN element (no kind)': 'Обычный BPMN-элемент (без вида)',
  'Search': 'Поиск',
  'No matching entries found.': 'Ничего не найдено.',
  'Loop': 'Цикл',
  'Parallel multi-instance': 'Параллельный мульти-экземпляр',
  'Sequential multi-instance': 'Последовательный мульти-экземпляр',
  'Toggle non-interrupting': 'Непрерывающее',
  'Collection': 'Коллекция',
  'Participant multiplicity': 'Множественный участник',
  'Task': 'Задача',
  'Send task': 'Задача отправки',
  'Receive task': 'Задача получения',
  'User task': 'Пользовательская задача',
  'Manual task': 'Ручная задача',
  'Business rule task': 'Задача бизнес-правила',
  'Service task': 'Сервисная задача',
  'Script task': 'Задача-скрипт',
  'Call activity': 'Вызов процесса',
  'Sub-process (collapsed)': 'Подпроцесс (свёрнутый)',
  'Sub-process (expanded)': 'Подпроцесс (развёрнутый)',
  'Start event': 'Начальное событие',
  'Intermediate throw event': 'Промежуточное событие (бросающее)',
  'End event': 'Конечное событие',
  'Message start event': 'Начальное событие-сообщение',
  'Timer start event': 'Начальное событие-таймер',
  'Conditional start event': 'Условное начальное событие',
  'Signal start event': 'Начальное событие-сигнал',
  'Exclusive gateway': 'Исключающий шлюз',
  'Parallel gateway': 'Параллельный шлюз',
  'Inclusive gateway': 'Включающий шлюз',
  'Complex gateway': 'Комплексный шлюз',
  'Event-based gateway': 'Шлюз по событиям',
  'Sequence flow': 'Поток управления',
  'Default flow': 'Поток по умолчанию',
  'Conditional flow': 'Условный поток',

  // панель свойств
  'General': 'Общие',
  'Name': 'Имя',
  'ID': 'ID',
  'Documentation': 'Документация',
  'Element documentation': 'Полное описание элемента',
  'Process documentation': 'Описание процесса',
  'Version tag': 'Версия',
  'Executable': 'Исполняемый',
  'Process name': 'Имя процесса',
  'Process ID': 'ID процесса',
  'Participant': 'Участник',
  'Condition': 'Условие',
  'Type': 'Тип',
  'Value': 'Значение',
  'Expression': 'Выражение',
  'Script': 'Скрипт',
  'Format': 'Формат',
  'Timer': 'Таймер',
  'Message': 'Сообщение',
  'Signal': 'Сигнал',
  'Error': 'Ошибка',
  'Escalation': 'Эскалация',
  'Link': 'Ссылка',
  'Compensation': 'Компенсация',
  'Multi-instance': 'Мульти-экземпляр',
  'Select an element to edit its properties.': 'Выберите элемент, чтобы редактировать его свойства.',
  'Multiple elements are selected. Select a single one to edit its properties.':
    'Выбрано несколько элементов. Выберите один, чтобы редактировать свойства.',
  'Create new list item': 'Добавить',
  'Delete item': 'Удалить',
  'Toggle section': 'Свернуть / развернуть',
  'List contains {numOfItems} item': 'В списке {numOfItems} элемент',
  'List contains {numOfItems} items': 'В списке {numOfItems} элементов',
  'Section contains data': 'В разделе есть данные',
  'Section contains an error': 'В разделе есть ошибка',
  'Element must have an unique id.': 'ID элемента должен быть уникальным.',
  'ID must not be empty.': 'ID не может быть пустым.',
  'ID must not contain spaces.': 'ID не может содержать пробелы.',
  'ID must be a valid QName.': 'ID должен быть корректным QName.'
};

/**
 * Функция translate в формате diagram-js: шаблон + подстановки {key}.
 */
export function translate(template, replacements) {
  replacements = replacements || {};

  const translated = RU[template] || template;

  return translated.replace(/{([^}]+)}/g, (_, key) => {
    return key in replacements ? replacements[key] : `{${ key }}`;
  });
}

export default {
  translate: [ 'value', translate ]
};
