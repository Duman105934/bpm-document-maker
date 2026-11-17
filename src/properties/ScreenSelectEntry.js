import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

import { SelectEntry } from '@bpmn-io/properties-panel';
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';

import { useService } from 'bpmn-js-properties-panel';

/**
 * Выбор экрана прототипа для sm:screen.
 *
 * Список экранов берётся из smProjectBridge при каждом рендере
 * и обновляется по событию smProject.screensChanged.
 */
export default function ScreenSelectEntry(props) {
  const { element, id, attr, label, hint } = props;

  const modeling = useService('modeling');
  const eventBus = useService('eventBus');
  const smProjectBridge = useService('smProjectBridge');

  const [ , setRevision ] = useState(0);

  useEffect(() => {
    const onChanged = () => setRevision(revision => revision + 1);

    eventBus.on('smProject.screensChanged', onChanged);

    return () => eventBus.off('smProject.screensChanged', onChanged);
  }, [ eventBus ]);

  const getValue = () => getBusinessObject(element).get(`sm:${ attr }`) || '';

  const current = getValue();
  const missing = !!current && !smProjectBridge.getScreen(current);

  return SelectEntry({
    element,
    id,
    label,
    description: missing
      ? '⚠ Экран не найден в прототипе'
      : (hint || 'Значок на фигуре и «Перейти к экрану» открывают экран в прототипе'),
    getValue,
    setValue: value => modeling.updateProperties(element, { [`sm:${ attr }`]: value || undefined }),
    getOptions: () => smProjectBridge.getScreenOptions(getValue())
  });
}
