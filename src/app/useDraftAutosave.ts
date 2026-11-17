import { useEffect } from 'react';

import { bpmnBridge } from '../bpmn/bpmnBridge';
import { saveDraft } from '../io/draft';
import { assets } from '../store/assets';
import { useProjectStore, type ProjectState } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

const DEBOUNCE_MS = 1000;

type DraftFields = Pick<ProjectState, 'project' | 'dirty' | 'fileName' | 'bpmnRevision'>;

/** Изменилось ли то, что лежит в черновике. */
export function draftChanged(state: DraftFields, prev: DraftFields): boolean {
  return state.project !== prev.project ||
    state.dirty !== prev.dirty ||
    state.fileName !== prev.fileName ||
    // импорт схемы в уже изменённый проект меняет только ревизию
    state.bpmnRevision !== prev.bpmnRevision;
}

/** Автосохранение черновика в IndexedDB на любые изменения проекта и схемы. */
export function useDraftAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let warned = false;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        write();
      }, DEBOUNCE_MS);
    };

    async function write() {
      const { project, fileName, dirty } = useProjectStore.getState();

      if (!project) {
        return;
      }

      try {
        const bpmnXml = await bpmnBridge.getXml();

        await saveDraft({ project, bpmnXml, fileName, dirty }, assets.entries());
        warned = false;
      } catch (error) {
        console.error('Черновик не сохранён', error);

        if (!warned) {
          warned = true;
          useUiStore.getState().showStatus(
            'Не удалось сохранить черновик в браузере. Сохраните проект в файл.', 'warning', 10000
          );
        }
      }
    }

    // вкладку прячут или закрывают — отложенную запись выполнить сразу
    const flush = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
        write();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    const unsubscribeStore = useProjectStore.subscribe((state, prev) => {
      if (draftChanged(state, prev)) {
        schedule();
      }
    });

    const unsubscribeBpmn = bpmnBridge.onChanged(schedule);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      clearTimeout(timer);
      unsubscribeStore();
      unsubscribeBpmn();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
}
