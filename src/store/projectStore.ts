import { create } from 'zustand';
import { temporal } from 'zundo';

import { createProject } from '../model/project';
import { hasBpmnRef, remapBpmnRef } from '../model/refs';
import type { Project, ProjectMeta } from '../model/types';
import type { FileHandle } from '../io/file-io';
import { useUiStore } from './uiStore';

export interface ProjectState {
  project: Project | null;
  fileName: string | null;
  fileHandle: FileHandle | null;
  dirty: boolean;
  /** растёт при каждом изменении BPMN-схемы (сама схема живёт в модельере) */
  bpmnRevision: number;
  /** растёт при создании и открытии проекта: по нему пересоздаётся canvas прототипа */
  session: number;

  newProject(meta: Partial<ProjectMeta>): void;
  loadProject(project: Project, opts?: { fileName?: string | null; fileHandle?: FileHandle | null; dirty?: boolean }): void;
  closeProject(): void;

  /**
   * Изменить проект: recipe получает глубокую копию и может её мутировать.
   * Вернул false или ничего не изменил — проект, dirty и история (в том числе redo) не трогаются.
   */
  updateProject(recipe: (draft: Project) => void | boolean): void;
  updateMeta(patch: Partial<ProjectMeta>): void;

  /**
   * Файл записан. `saved` — снимок, который упаковали: если проект или схема
   * с тех пор изменились, `dirty` остаётся (обновляются только имя и handle).
   */
  markSaved(fileName: string, fileHandle?: FileHandle | null, saved?: { project: Project | null; bpmnRevision: number }): void;
  markDirty(): void;
  touchBpmn(): void;

  /**
   * id узла схемы изменился — перенести ссылки вызовов.
   * Не создаёт запись undo: правка идёт из стека команд модельера.
   */
  remapBpmnRef(oldId: string, newId: string): void;
}

/** Срез состояния, который попадает в историю undo/redo. */
type Tracked = Pick<ProjectState, 'project'>;

const HISTORY_LIMIT = 200;

export const useProjectStore = create<ProjectState>()(
  temporal<ProjectState, [], [], Tracked>(
    (set, get) => ({
      project: null,
      fileName: null,
      fileHandle: null,
      dirty: false,
      bpmnRevision: 0,
      session: 0,

      newProject(meta) {
        set(state => ({
          project: createProject(meta),
          fileName: null,
          fileHandle: null,
          dirty: true,
          bpmnRevision: 0,
          session: state.session + 1
        }));
        clearHistory();
      },

      loadProject(project, { fileName = null, fileHandle = null, dirty = false } = {}) {
        set(state => ({ project, fileName, fileHandle, dirty, bpmnRevision: 0, session: state.session + 1 }));
        clearHistory();
      },

      closeProject() {
        set(state => ({
          project: null,
          fileName: null,
          fileHandle: null,
          dirty: false,
          bpmnRevision: 0,
          session: state.session + 1
        }));
        clearHistory();
      },

      updateProject(recipe) {
        const current = get().project;

        if (!current) {
          return;
        }

        const draft = structuredClone(current);

        // «Сохранить» без правок, Delete по уже удалённой зоне, поздний результат выбора узла
        if (recipe(draft) === false || sameProject(draft, current)) {
          return;
        }

        set({ project: draft, dirty: true });
      },

      updateMeta(patch) {
        get().updateProject(project => {
          project.meta = { ...project.meta, ...patch };
        });
      },

      markSaved(fileName, fileHandle = null, saved) {
        const state = get();
        const unchanged = !saved || (saved.project === state.project && saved.bpmnRevision === state.bpmnRevision);

        set({ fileName, fileHandle, dirty: unchanged ? false : state.dirty });
      },

      markDirty() {
        if (!get().dirty) {
          set({ dirty: true });
        }
      },

      touchBpmn() {
        set(state => ({ bpmnRevision: state.bpmnRevision + 1, dirty: true }));
      },

      remapBpmnRef(oldId, newId) {
        const history = useProjectStore.temporal.getState();
        const remap = (project: Project | null) => {
          if (!project || !hasBpmnRef(project, oldId)) {
            return project;
          }

          const draft = structuredClone(project);

          remapBpmnRef(draft, oldId, newId);

          return draft;
        };

        // история тоже: иначе Ctrl+Z в прототипе вернёт старый id
        const remapStates = (states: Tracked[]) => states.map(state => {
          const project = remap(state.project);

          return project === state.project ? state : { ...state, project };
        });

        useProjectStore.temporal.setState({
          pastStates: remapStates(history.pastStates as Tracked[]),
          futureStates: remapStates(history.futureStates as Tracked[])
        });

        const current = get().project;
        const next = remap(current);

        if (next !== current) {
          history.pause();
          set({ project: next, dirty: true });
          history.resume();
        }
      }
    }),
    {
      partialize: state => ({ project: state.project }),
      // запись в историю только при смене проекта, а не dirty / fileName / bpmnRevision
      equality: (past, current) => past.project === current.project,
      limit: HISTORY_LIMIT
    }
  )
);

function sameProject(a: Project, b: Project): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clearHistory() {
  useProjectStore.temporal.getState().clear();
}

/**
 * Undo/redo слоя прототипа. У BPMN-схемы свой стек команд в модельере.
 * @returns false, если отменять или повторять нечего
 */
export function undoProject(): boolean {
  const history = useProjectStore.temporal.getState();

  if (!history.pastStates.length) {
    return false;
  }

  history.undo();
  useProjectStore.getState().markDirty();
  pruneSelection();

  return true;
}

export function redoProject(): boolean {
  const history = useProjectStore.temporal.getState();

  if (!history.futureStates.length) {
    return false;
  }

  history.redo();
  useProjectStore.getState().markDirty();
  pruneSelection();

  return true;
}

/** После undo/redo выделение может указывать на объект, которого больше нет, — сбросить до существующего. */
function pruneSelection() {
  const ui = useUiStore.getState();
  const selection = ui.selection;
  const screen = selection && useProjectStore.getState().project?.screens.find(s => s.id === selection.screenId);

  if (!selection) {
    return;
  }

  if (!screen) {
    ui.select(null);
  } else if (selection.type === 'hotspot' && !screen.hotspots.some(h => h.id === selection.hotspotId)) {
    ui.select({ type: 'screen', screenId: screen.id });
  }
}
