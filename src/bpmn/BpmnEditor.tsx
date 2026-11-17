import { useEffect, useRef } from 'react';

import { createModeler } from './createModeler.js';
import { bpmnBridge } from './bpmnBridge';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import type { Screen } from '../model/types';

/** Связь схемы с прототипом для сервиса smProjectBridge (см. modeler/sm/SmProjectBridge.js). */
const smProject = {
  getScreens: () => (useProjectStore.getState().project?.screens ?? [])
    .map(screen => ({ id: screen.id, name: screen.name, code: screen.code })),
  onOpenScreen: (id: string) => useUiStore.getState().openScreen(id),
  isViewMode: () => false
};

/** Меняется, когда меняется то, что схема знает об экранах. */
function screensKey(screens: Screen[] | undefined): string {
  return (screens ?? []).map(s => `${ s.id }\u0000${ s.name }\u0000${ s.code }`).join('\u0001');
}

/**
 * Слой «Backend (BPMN)»: канва bpmn-js и панель свойств.
 *
 * Модельер создаётся один раз на монтирование; в StrictMode эффект
 * выполняется дважды — первый экземпляр уничтожается, мост переимпортирует XML во второй.
 */
export default function BpmnEditor({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const propertiesVisible = useUiStore(s => s.propertiesVisible);

  useEffect(() => {
    const container = canvasRef.current!;
    const propertiesParent = propertiesRef.current!;

    const modeler: any = createModeler({ container, propertiesParent, smProject });

    bpmnBridge.attach(modeler);

    // у Canvas нет своего ResizeObserver
    const observer = new ResizeObserver(() => {
      try {
        modeler.get('canvas').resized();
      } catch (error) {
        // модельер уже уничтожен
      }
    });

    observer.observe(container);

    // список экранов изменился — обновить панель свойств и значки на фигурах
    let key = screensKey(useProjectStore.getState().project?.screens);

    const unsubscribe = useProjectStore.subscribe(state => {
      const next = screensKey(state.project?.screens);

      if (next !== key) {
        key = next;
        modeler.get('smProjectBridge').notifyScreensChanged();
      }
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      bpmnBridge.detach(modeler);
      modeler.destroy();
    };
  }, []);

  // при показе слоя — пересчитать размеры канвы
  useEffect(() => {
    if (visible) {
      bpmnBridge.getModeler()?.get('canvas').resized();
    }
  }, [ visible, propertiesVisible ]);

  return (
    <div className="bpmn-layer">
      <div className="bpmn-canvas" ref={ canvasRef } />
      <aside
        className="bpmn-properties"
        ref={ propertiesRef }
        hidden={ !propertiesVisible }
        aria-label="Свойства элемента"
      />
    </div>
  );
}
