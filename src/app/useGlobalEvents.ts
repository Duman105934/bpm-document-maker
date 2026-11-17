import { useEffect, useState } from 'react';

import { isEditable } from './dom';
import { redoProject, undoProject, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { importBpmnFile, openProjectFile, saveProject } from './actions';

/**
 * Esc — выход из просмотра; Ctrl/⌘+S, Ctrl/⌘+Shift+S, Ctrl/⌘+O; на слое прототипа — Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y.
 * Undo схемы обрабатывает сам diagram-js: его клавиатура привязана к фокусу канвы.
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        const ui = useUiStore.getState();

        // Esc в просмотре: закрыть карточку вызова, затем выйти из просмотра
        if (ui.mode === 'view' && !ui.dialog && !isEditable(event.target)) {
          if (ui.viewCall) {
            ui.closeViewCall();
          } else {
            ui.exitView();
          }
        }

        return;
      }

      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      // event.code — чтобы работало и в русской раскладке
      const key = event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();

      if (key === 'z' || key === 'y') {
        const ui = useUiStore.getState();

        if (ui.activeLayer !== 'prototype' || ui.mode !== 'edit' || ui.dialog || isEditable(event.target)) {
          return;
        }

        event.preventDefault();

        if (key === 'y' || event.shiftKey) {
          redoProject();
        } else {
          undoProject();
        }
      } else if (key === 's') {
        event.preventDefault();

        // удержание клавиш не открывает несколько диалогов сохранения
        if (event.repeat) {
          return;
        }

        if (useProjectStore.getState().project) {
          saveProject(event.shiftKey);
        }
      } else if (key === 'o') {
        event.preventDefault();
        openProjectFile();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

function hasFiles(event: DragEvent): boolean {
  return !!event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files');
}

/** Элементы, которые сами принимают файлы (canvas прототипа — картинки экранов). */
function isOwnDropTarget(event: DragEvent): boolean {
  const target = event.target as HTMLElement | null;

  return !!target?.closest?.('[data-own-drop]');
}

/** Панель свойств схемы файлы не принимает — сброс там запрещён, но и браузер не уходит со страницы. */
function isNoDropZone(event: DragEvent): boolean {
  const target = event.target as HTMLElement | null;

  return !!target?.closest?.('.bpmn-properties');
}

/**
 * Drag-n-drop файла в окно: .fmg — открыть проект, .bpmn — заменить схему.
 * @returns true, пока файл тащат над окном
 */
export function useFileDrop(): boolean {
  const [ dragging, setDragging ] = useState(false);

  useEffect(() => {
    // счётчик входов и выходов по всем элементам: dragenter и dragleave приходят парами
    // для каждой цели, поэтому считаем симметрично, а оверлей прячем над «своими» зонами
    let depth = 0;
    let overOwn = false;

    const sync = () => setDragging(depth > 0 && !overOwn);

    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      depth++;
      overOwn = isOwnDropTarget(event);
      sync();
    };

    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      depth = Math.max(0, depth - 1);
      sync();
    };

    const onOver = (event: DragEvent) => {
      if (!hasFiles(event) || isOwnDropTarget(event)) {
        return;
      }

      // preventDefault всегда, иначе браузер откроет файл вместо страницы
      event.preventDefault();

      if (isNoDropZone(event) && event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
    };

    const onDrop = async (event: DragEvent) => {
      depth = 0;
      overOwn = false;
      setDragging(false);

      // файл уже принял кто-то внутри (canvas прототипа — картинки)
      if (!hasFiles(event) || event.defaultPrevented) {
        return;
      }

      event.preventDefault();

      if (isNoDropZone(event)) {
        return;
      }

      const files = Array.from(event.dataTransfer!.files);
      const fmg = files.find(f => /\.fmg$/i.test(f.name));
      const bpmn = files.find(f => /\.(bpmn|xml)$/i.test(f.name));

      if (fmg) {
        await openProjectFile(fmg);
      } else if (bpmn && useProjectStore.getState().project) {
        await importBpmnFile(bpmn);
      } else {
        useUiStore.getState().showStatus(
          useProjectStore.getState().project
            ? 'Сюда можно перетащить .fmg или .bpmn. Картинки экранов — на слой «Прототип».'
            : 'Перетащите файл проекта .fmg',
          'warning'
        );
      }
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return dragging;
}
