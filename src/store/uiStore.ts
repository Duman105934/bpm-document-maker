import { create } from 'zustand';

import { bpmnBridge } from '../bpmn/bpmnBridge';
import { viewerBridge } from '../bpmn/viewerBridge';
import type { ApiCall } from '../model/types';

export type Layer = 'prototype' | 'bpmn';
export type Mode = 'edit' | 'view';
export type StatusType = 'info' | 'success' | 'warning' | 'error';

export type Selection =
  | { type: 'screen'; screenId: string }
  | { type: 'hotspot'; screenId: string; hotspotId: string }
  | null;

/** Инструмент слоя прототипа: выбор/перемещение или рисование зон. */
export type PrototypeTool = 'select' | 'hotspot';

export interface UiState {
  activeLayer: Layer;
  mode: Mode;
  selection: Selection;
  tool: PrototypeTool;
  propertiesVisible: boolean;
  status: { message: string; type: StatusType } | null;
  dialog: 'new' | 'settings' | null;
  /** запрос показать экран на canvas прототипа (fitView); nonce — повторный запрос того же экрана */
  focusScreen: { screenId: string; nonce: number } | null;
  /** идёт выбор узла на схеме («Выбрать на схеме») */
  picking: boolean;
  problemsVisible: boolean;

  /** режим «Просмотр»: XML схемы, снятый при входе */
  viewXml: string | null;
  /** экран в плеере; им управляет единый проход (bpmn/tokenWalk.ts) */
  viewScreenId: string | null;
  /** открытая карточка вызова backend */
  viewCall: { call: ApiCall; screenId: string } | null;

  setLayer(layer: Layer): void;
  setMode(mode: Mode): void;
  select(selection: Selection): void;
  setTool(tool: PrototypeTool): void;
  toggleProperties(): void;
  openDialog(dialog: UiState['dialog']): void;
  showStatus(message: string, type?: StatusType, timeout?: number): void;
  setPicking(picking: boolean): void;
  toggleProblems(visible?: boolean): void;

  /** Слой «Прототип», показать и выделить экран (или зону). */
  openScreen(screenId: string, hotspotId?: string): void;
  /** Слой «Backend», центрировать и подсветить узел. @returns false, если узла нет */
  openBpmnElement(elementId: string): boolean;

  /** Войти в просмотр (XML уже снят), начиная с экрана screenId. */
  startView(xml: string, screenId: string | null): void;
  exitView(): void;
  /** Показать карточку вызова; если задан узел — перейти к нему на схеме. */
  viewOpenCall(call: ApiCall, screenId: string): void;
  closeViewCall(): void;
}

let statusTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>()((set, get) => ({
  activeLayer: 'prototype',
  mode: 'edit',
  selection: null,
  tool: 'select',
  propertiesVisible: true,
  status: null,
  dialog: null,
  focusScreen: null,
  picking: false,
  problemsVisible: false,
  viewXml: null,
  viewScreenId: null,
  viewCall: null,

  setLayer(activeLayer) {
    set({ activeLayer });
  },

  setMode(mode) {
    set({ mode });
  },

  select(selection) {
    set({ selection });
  },

  setTool(tool) {
    set({ tool });
  },

  toggleProperties() {
    set(state => ({ propertiesVisible: !state.propertiesVisible }));
  },

  openDialog(dialog) {
    set({ dialog });
  },

  showStatus(message, type = 'info', timeout = 4000) {
    clearTimeout(statusTimer);
    set({ status: { message, type } });

    if (timeout) {
      statusTimer = setTimeout(() => set({ status: null }), timeout);
    }
  },

  setPicking(picking) {
    set({ picking });
  },

  toggleProblems(visible) {
    set(state => ({ problemsVisible: visible ?? !state.problemsVisible }));
  },

  openScreen(screenId, hotspotId) {
    // уход со схемы отменяет «Выбрать на схеме»: иначе следующий клик по узлу привяжет его к старому вызову
    bpmnBridge.stopPicking();

    if (get().mode === 'view') {
      // в просмотре экран открывает единый проход: он же переключит слой
      viewerBridge.walkToScreen(screenId);
      return;
    }

    set(state => ({
      activeLayer: 'prototype',
      tool: 'select',
      selection: hotspotId ? { type: 'hotspot', screenId, hotspotId } : { type: 'screen', screenId },
      focusScreen: { screenId, nonce: (state.focusScreen?.nonce ?? 0) + 1 }
    }));
  },

  openBpmnElement(elementId) {
    bpmnBridge.stopPicking();

    if (get().mode === 'view') {
      if (!viewerBridge.hasElement(elementId)) {
        get().showStatus(`Узел ${ elementId } не найден на схеме`, 'warning');
        return false;
      }

      // токен прохода встаёт на узел и сам показывает слой схемы; дальше — «Шаг →» на панели прохода
      viewerBridge.walkTo(elementId);

      return true;
    }

    if (!bpmnBridge.hasElement(elementId)) {
      get().showStatus(`Узел ${ elementId } не найден на схеме`, 'warning');
      return false;
    }

    set({ activeLayer: 'bpmn' });

    // слой показывается в следующем кадре: сначала canvas.resized(), затем фокус
    requestAnimationFrame(() => bpmnBridge.focusElement(elementId));

    return true;
  },

  startView(xml, screenId) {
    set({
      mode: 'view',
      tool: 'select',
      picking: false,
      problemsVisible: false,
      viewXml: xml,
      viewScreenId: screenId,
      viewCall: null
    });
  },

  exitView() {
    set({ mode: 'edit', viewXml: null, viewScreenId: null, viewCall: null });
  },

  viewOpenCall(call, screenId) {
    set({ viewCall: { call, screenId } });

    if (call.bpmnElementId) {
      get().openBpmnElement(call.bpmnElementId);
    }
  },

  closeViewCall() {
    set({ viewCall: null });
  }
}));
