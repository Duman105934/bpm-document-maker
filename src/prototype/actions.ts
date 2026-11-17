/**
 * Действия слоя прототипа. Каждое — одна запись в истории undo.
 * Картинки удалённых и заменённых экранов остаются в памяти (assets),
 * чтобы Ctrl+Z вернул экран с картинкой; в .fmg и черновик попадают
 * только картинки, на которые ссылается проект.
 */

import { invalidateDraftAsset } from '../io/draft';
import { isImageFile, nameFromFile, readImageFile } from '../io/images';
import { bpmnBridge, type PickResult } from '../bpmn/bpmnBridge';
import { DEFAULT_DISPLAY_WIDTH, createApiCall, extForMime, newId } from '../model/project';
import { deleteHotspot, deleteScreen } from '../model/refs';
import type { ApiCall, Hotspot, Project, Rect, Screen } from '../model/types';
import { assets } from '../store/assets';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

/** Расстояние между экранами, которые ставятся в ряд. */
export const SCREEN_GAP = 80;

const update = (recipe: (draft: Project) => void) => useProjectStore.getState().updateProject(recipe);

function findScreen(project: Project, id: string): Screen | undefined {
  return project.screens.find(s => s.id === id);
}

function findHotspot(project: Project, screenId: string, hotspotId: string): Hotspot | undefined {
  return findScreen(project, screenId)?.hotspots.find(h => h.id === hotspotId);
}

/** Позиция справа от последнего экрана. */
function nextPosition(project: Project): { x: number; y: number } {
  const last = project.screens[project.screens.length - 1];

  return last
    ? { x: last.position.x + last.displayWidth + SCREEN_GAP, y: last.position.y }
    : { x: 0, y: 0 };
}

// экраны ////////////////////

/**
 * Добавить экраны из картинок. Без at — в ряд справа от последнего,
 * с at — в ряд начиная с этой точки canvas.
 * @returns id добавленных экранов
 */
export async function addScreens(files: File[], at?: { x: number; y: number }): Promise<string[]> {
  const images = files.filter(isImageFile);
  const skipped = files.length - images.length;

  if (!images.length) {
    useUiStore.getState().showStatus('Нет картинок: подходят PNG, JPG, WebP, SVG, GIF', 'warning');
    return [];
  }

  const loaded = await Promise.all(images.map(async file => ({ file, info: await readImageFile(file) })));
  const ids: string[] = [];

  update(project => {
    let position = at ? { ...at } : nextPosition(project);

    loaded.forEach(({ file, info }) => {
      const id = newId('scr');
      const path = `screens/${ id }.${ extForMime(info.mime) }`;

      assets.set(path, info.blob);

      project.screens.push({
        id,
        name: nameFromFile(file.name) || 'Экран',
        code: '',
        description: '',
        asset: { path, mime: info.mime, width: info.width, height: info.height },
        position,
        displayWidth: DEFAULT_DISPLAY_WIDTH,
        hotspots: [],
        onOpenCalls: []
      });

      ids.push(id);
      position = { x: position.x + DEFAULT_DISPLAY_WIDTH + SCREEN_GAP, y: position.y };
    });

    if (!project.startScreenId) {
      project.startScreenId = ids[0];
    }
  });

  const message = `Добавлено экранов: ${ ids.length }` + (skipped ? `, пропущено файлов: ${ skipped }` : '');

  useUiStore.getState().showStatus(message, skipped ? 'warning' : 'success');

  return ids;
}

export function moveScreen(id: string, position: { x: number; y: number }) {
  const screen = findScreen(useProjectStore.getState().project!, id);

  if (!screen || (screen.position.x === position.x && screen.position.y === position.y)) {
    return;
  }

  update(project => {
    findScreen(project, id)!.position = { x: Math.round(position.x), y: Math.round(position.y) };
  });
}

export type ScreenPatch = Partial<Pick<Screen, 'name' | 'code' | 'description' | 'displayWidth'>>;

export function updateScreen(id: string, patch: ScreenPatch) {
  update(project => {
    const screen = findScreen(project, id);

    if (screen) {
      Object.assign(screen, patch);
    }
  });
}

export function setStartScreen(id: string) {
  update(project => {
    project.startScreenId = id;
  });
}

export async function replaceScreenImage(id: string, file: File) {
  if (!isImageFile(file)) {
    useUiStore.getState().showStatus('Это не картинка: подходят PNG, JPG, WebP, SVG, GIF', 'warning');
    return;
  }

  const info = await readImageFile(file);
  // новый путь, чтобы undo вернул прежнюю картинку
  const path = `screens/${ id }-${ newId('v').slice(2, 8) }.${ extForMime(info.mime) }`;

  assets.set(path, info.blob);
  invalidateDraftAsset(path);

  update(project => {
    const screen = findScreen(project, id);

    if (screen) {
      screen.asset = { path, mime: info.mime, width: info.width, height: info.height };
    }
  });

  useUiStore.getState().showStatus('Картинка экрана заменена', 'success');
}

export function removeScreen(id: string) {
  update(project => {
    deleteScreen(project, id);
  });

  const ui = useUiStore.getState();

  if (ui.selection && ui.selection.screenId === id) {
    ui.select(null);
  }

  ui.showStatus('Экран удалён. Ctrl/⌘+Z — отменить', 'info');
}

// зоны ////////////////////

/** Новая зона; navigateTo — сразу с переходом на экран (одна запись в истории). */
export function addHotspot(screenId: string, rect: Rect, navigateTo?: string): string {
  const id = newId('hs');

  update(project => {
    const screen = findScreen(project, screenId);

    screen?.hotspots.push({
      id,
      name: `Зона ${ screen.hotspots.length + 1 }`,
      rect,
      action: navigateTo ? { type: 'navigate', targetScreenId: navigateTo } : null
    });
  });

  return id;
}

export function setHotspotRect(screenId: string, hotspotId: string, rect: Rect) {
  update(project => {
    const hotspot = findHotspot(project, screenId, hotspotId);

    if (hotspot) {
      hotspot.rect = rect;
    }
  });
}

export function renameHotspot(screenId: string, hotspotId: string, name: string) {
  update(project => {
    const hotspot = findHotspot(project, screenId, hotspotId);

    if (hotspot) {
      hotspot.name = name;
    }
  });
}

/** Переход на экран; null — снять действие. */
export function setHotspotNavigate(screenId: string, hotspotId: string, targetScreenId: string | null) {
  update(project => {
    const hotspot = findHotspot(project, screenId, hotspotId);

    if (hotspot) {
      hotspot.action = targetScreenId ? { type: 'navigate', targetScreenId } : null;
    }
  });
}

/** Снять переходы у нескольких зон одной записью истории (удаление стрелок). */
export function clearNavigations(refs: Array<{ screenId: string; hotspotId: string }>) {
  if (!refs.length) {
    return;
  }

  update(project => {
    refs.forEach(({ screenId, hotspotId }) => {
      const hotspot = findHotspot(project, screenId, hotspotId);

      if (hotspot?.action?.type === 'navigate') {
        hotspot.action = null;
      }
    });
  });
}

export function removeHotspot(screenId: string, hotspotId: string) {
  update(project => {
    deleteHotspot(project, screenId, hotspotId);
  });

  const ui = useUiStore.getState();

  if (ui.selection?.type === 'hotspot' && ui.selection.hotspotId === hotspotId) {
    ui.select({ type: 'screen', screenId });
  }
}

// вызовы backend ////////////////////

/** Где лежит вызов: в gateway-зоне или в списке «Вызовы при открытии». */
export type CallRef =
  | { screenId: string; hotspotId: string }
  | { screenId: string; callId: string };

export type ApiCallPatch = Partial<Omit<ApiCall, 'id'>>;

function findCall(project: Project, ref: CallRef): ApiCall | undefined {
  if ('hotspotId' in ref) {
    const action = findHotspot(project, ref.screenId, ref.hotspotId)?.action;

    return action?.type === 'gateway' ? action.call : undefined;
  }

  return findScreen(project, ref.screenId)?.onOpenCalls.find(c => c.id === ref.callId);
}

export function getCall(ref: CallRef): ApiCall | undefined {
  const project = useProjectStore.getState().project;

  return project ? findCall(project, ref) : undefined;
}

/** Действие зоны «Вызов через gateway». */
export function setHotspotGateway(screenId: string, hotspotId: string) {
  update(project => {
    const hotspot = findHotspot(project, screenId, hotspotId);

    if (hotspot && hotspot.action?.type !== 'gateway') {
      hotspot.action = { type: 'gateway', call: createApiCall({ name: hotspot.name }) };
    }
  });
}

export function updateCall(ref: CallRef, patch: ApiCallPatch) {
  update(project => {
    const call = findCall(project, ref);

    if (call) {
      Object.assign(call, patch);

      if (!call.bpmnElementId) {
        delete call.bpmnElementId;
      }
    }
  });
}

/** @returns id нового вызова */
export function addOnOpenCall(screenId: string): string {
  const call = createApiCall({ method: 'GET' });

  update(project => {
    const screen = findScreen(project, screenId);

    if (screen) {
      call.name = `Вызов ${ screen.onOpenCalls.length + 1 }`;
      screen.onOpenCalls.push(call);
    }
  });

  return call.id;
}

export function removeOnOpenCall(screenId: string, callId: string) {
  update(project => {
    const screen = findScreen(project, screenId);

    if (screen) {
      screen.onOpenCalls = screen.onOpenCalls.filter(c => c.id !== callId);
    }
  });
}

/**
 * «Выбрать на схеме»: показать слой схемы, дождаться клика по узлу
 * и вернуться на прежний слой. Если выбор отменён сменой слоя или проекта,
 * слой не трогаем — его уже выбрал пользователь. @returns id узла или null
 */
export async function pickBpmnNode(): Promise<string | null> {
  const ui = useUiStore.getState();
  const previousLayer = ui.activeLayer;
  const session = useProjectStore.getState().session;

  ui.setPicking(true);
  ui.setLayer('bpmn');

  let result: PickResult = { id: null, cancelled: true };

  try {
    result = await bpmnBridge.pickElement({
      onHint: message => useUiStore.getState().showStatus(message, 'warning')
    });
  } finally {
    const after = useUiStore.getState();

    after.setPicking(false);

    if (!result.cancelled) {
      after.setLayer(previousLayer);
    }
  }

  // за время выбора открыли другой проект — узел к старому вызову не привязываем
  return result.cancelled || useProjectStore.getState().session !== session ? null : result.id;
}

/** Выбрать узел на схеме и записать его в вызов. */
export async function pickCallNode(ref: CallRef) {
  const id = await pickBpmnNode();

  if (id) {
    updateCall(ref, { bpmnElementId: id });
    useUiStore.getState().showStatus(`Узел ${ id } привязан к вызову`, 'success');
  }
}
