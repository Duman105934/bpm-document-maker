import { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

import { SmViewModule, smModdleDescriptor } from '../modeler/sm/index.js';
import { collectElementDoc } from '../modeler/sm/element-doc.js';
import RuTranslateModule from '../i18n/ru.js';
import { viewerBridge } from './viewerBridge';
import { tokenWalk } from './tokenWalk';
import ElementInfo, { type ElementDoc } from './ElementInfo';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

/** В просмотре клик по фигуре Cmd / Mobile с sm:screen открывает экран в плеере. */
const smProject = {
  getScreens: () => (useProjectStore.getState().project?.screens ?? [])
    .map(screen => ({ id: screen.id, name: screen.name, code: screen.code })),
  onOpenScreen: (id: string) => useUiStore.getState().openScreen(id),
  isViewMode: () => true
};

/** Выше SmScreenBadgeClick (1500): инфо-панель обновляется и при переходе на экран. */
const INFO_CLICK_PRIORITY = 2000;
/** Ещё выше: во время прохода клик по следующему узлу или ветке — это шаг, а не переход на экран. */
const WALK_CLICK_PRIORITY = 2100;

/**
 * Слой «Backend» в режиме «Просмотр»: схема без палитры, context pad и перетаскивания.
 * Клик по узлу показывает его описание справа; токен по схеме ведёт единый проход (WalkBar).
 */
export default function BpmnViewer({ xml, visible }: { xml: string; visible: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [ doc, setDoc ] = useState<ElementDoc | null>(null);

  useEffect(() => {
    const container = canvasRef.current!;
    let disposed = false;

    const viewer: any = new NavigatedViewer({
      container,
      additionalModules: [ SmViewModule, RuTranslateModule ],
      moddleExtensions: { sm: smModdleDescriptor },
      smProject
    });

    viewerBridge.attach(viewer);

    const describe = (element: any) => {
      const target = element?.labelTarget || element;

      if (!target || !target.parent || target === viewer.get('canvas').getRootElement()) {
        setDoc(null);
        return;
      }

      setDoc({ id: target.id, ...collectElementDoc(target, viewer.get('smProjectBridge')) });
    };

    viewer.on('element.click', WALK_CLICK_PRIORITY, (event: { element: any }) => {
      const walk = tokenWalk.getSnapshot();
      const id = (event.element?.labelTarget || event.element)?.id;
      const option = walk.active && !walk.animating
        ? walk.options.find(o => (o.targetType === 'node' && o.targetId === id) || (!!o.flowId && o.flowId === id))
        : undefined;

      if (option) {
        void tokenWalk.step(option.key);

        // шаг сам покажет описание узла; экран Cmd / Mobile не открывать
        return false;
      }
    });

    viewer.on('element.click', INFO_CLICK_PRIORITY, (event: { element: any }) => describe(event.element));
    viewer.on('fmg.viewer.focus', (event: { element: any }) => describe(event.element));

    viewer.importXML(xml)
      .then(({ warnings }: { warnings: unknown[] }) => {
        if (disposed) {
          return;
        }

        if (warnings?.length) {
          console.warn('Просмотр схемы', warnings);
        }

        viewer.get('canvas').zoom('fit-viewport', 'auto');
        viewerBridge.markReady(viewer);
      })
      .catch((error: Error) => {
        if (!disposed) {
          console.error(error);
          useUiStore.getState().showStatus(`Не удалось показать схему: ${ error.message }`, 'error', 0);
        }
      });

    const observer = new ResizeObserver(() => {
      try {
        viewer.get('canvas').resized();
      } catch (error) {
        // просмотрщик уже уничтожен
      }
    });

    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      viewerBridge.detach(viewer);
      viewer.destroy();
    };
  }, [ xml ]);

  useEffect(() => {
    if (visible) {
      try {
        viewerBridge.resized();
      } catch (error) {
        // ещё не создан
      }
    }
  }, [ visible, doc ]);

  return (
    <div className="bpmn-layer bpmn-layer--view">
      <div className="bpmn-view-main">
        <div className="bpmn-canvas" ref={ canvasRef } />
      </div>
      { doc && <ElementInfo doc={ doc } onClose={ () => setDoc(null) } /> }
    </div>
  );
}
