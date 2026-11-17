/**
 * Действия уровня приложения: новый проект, открыть, сохранить, импорт и экспорт.
 * Вызываются из тулбара, горячих клавиш и drag-n-drop.
 */

import { bpmnBridge, emptyXml } from '../bpmn/bpmnBridge';
import { packFmg, unpackFmg } from '../io/fmg';
import {
  BPMN_TYPES,
  FMG_TYPES,
  baseName,
  downloadBlob,
  openFile,
  safeFileName,
  saveFile
} from '../io/file-io';
import { clearDraft } from '../io/draft';
import { isEditable } from './dom';
import { getAssetPaths } from '../model/project';
import type { ProjectMeta } from '../model/types';
import { assets } from '../store/assets';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

import exampleXml from '../resources/example.bpmn?raw';

const status = (...args: Parameters<ReturnType<typeof useUiStore.getState>['showStatus']>) =>
  useUiStore.getState().showStatus(...args);

export function confirmDiscard(): boolean {
  const { project, dirty } = useProjectStore.getState();

  return !project || !dirty ||
    window.confirm('Есть несохранённые изменения. Продолжить без сохранения?');
}

function reportWarnings(prefix: string, warnings: string[]) {
  if (warnings.length) {
    console.warn(prefix, warnings);
    status(`${ prefix }: предупреждений ${ warnings.length }, подробности в консоли`, 'warning', 8000);
  }
}

// проект ////////////////////

/** Черновик недоступен (приватный режим, запрет данных сайта) — работа продолжается без него. */
async function clearDraftSafely() {
  try {
    await clearDraft();
  } catch (error) {
    console.warn('Черновик не очищен', error);
  }
}

export async function createNewProject(meta: Partial<ProjectMeta>, cover?: { path: string; blob: Blob } | null) {
  bpmnBridge.stopPicking();
  await clearDraftSafely();
  assets.clear();

  if (cover) {
    assets.set(cover.path, cover.blob);
  }

  useProjectStore.getState().newProject(meta);
  useUiStore.setState({ activeLayer: 'prototype', mode: 'edit', selection: null });

  try {
    await bpmnBridge.importXml(emptyXml);
  } catch (error) {
    console.error(error);
  }

  status('Создан новый проект', 'success');
}

export async function openProjectFile(file?: File, handle?: unknown) {
  if (!confirmDiscard()) {
    return;
  }

  try {
    if (!file) {
      const opened = await openFile(FMG_TYPES);

      if (!opened) {
        return;
      }

      file = opened.file;
      handle = opened.handle;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { project, bpmnXml, assets: loaded, warnings } = await unpackFmg(bytes);

    // выбор узла относился к прежнему проекту
    bpmnBridge.stopPicking();

    const xml = bpmnXml || emptyXml;
    let importWarnings: string[] = [];
    let schemaBroken = false;
    const editorReady = bpmnBridge.isReady();

    if (editorReady) {
      // сначала схема: если она не читается, открытый проект остаётся нетронутым
      try {
        importWarnings = await bpmnBridge.importXml(xml);
      } catch (error) {
        throw new Error(`схема process.bpmn не читается (${ (error as Error).message })`);
      }
    }

    // черновик прежнего проекта: его картинки с теми же путями не должны попасть в новый
    await clearDraftSafely();

    assets.replaceAll(loaded);
    useProjectStore.getState().loadProject(project, { fileName: file.name, fileHandle: handle ?? null });
    useUiStore.setState({ activeLayer: 'prototype', mode: 'edit', selection: null });

    if (!editorReady) {
      // проекта не было — редактор схемы создаётся только сейчас, импорт ждёт его
      try {
        importWarnings = await bpmnBridge.importXml(xml);
      } catch (error) {
        console.error(error);
        schemaBroken = true;
        await bpmnBridge.importXml(emptyXml);
      }
    }

    // импорт схемы не помечает проект изменённым; битая схема — помечает,
    // чтобы сохранение «на место» не записало пустую схему молча
    useProjectStore.setState({ dirty: schemaBroken });

    if (schemaBroken) {
      status('Проект открыт, но схема process.bpmn не читается — открыта пустая схема. Подробности в консоли', 'warning', 0);
      return;
    }

    const all = [ ...warnings, ...importWarnings ];

    if (all.length) {
      reportWarnings('Проект открыт', all);
    } else {
      status(`Открыт ${ file.name }`, 'success');
    }
  } catch (error) {
    console.error(error);
    status(`Не удалось открыть проект: ${ (error as Error).message }`, 'error', 0);
  }
}

/**
 * Поле с курсором пишет в проект только на blur: снять фокус до чтения store
 * и вернуть его, чтобы курсор остался в поле.
 */
function commitFocusedField() {
  const active = document.activeElement;

  if (active instanceof HTMLElement && isEditable(active)) {
    active.blur();

    if (active.isConnected) {
      active.focus();
    }
  }
}

/** Идёт сохранение: повторный Ctrl+S не открывает второй диалог («File picker already active»). */
let saving = false;

export async function saveProject(saveAs = false) {
  if (saving) {
    return;
  }

  commitFocusedField();

  const { project, fileName, fileHandle, bpmnRevision } = useProjectStore.getState();

  if (!project) {
    return;
  }

  saving = true;

  try {
    const xml = await bpmnBridge.getXml();
    const missing = getAssetPaths(project).filter(path => !assets.has(path));
    const bytes = await packFmg(project, xml, assets.entries());
    const blob = new Blob([ bytes as BlobPart ], { type: 'application/octet-stream' });

    const suggestedName = fileName || `${ safeFileName(project.meta.code || project.meta.name) }.fmg`;

    const result = await saveFile(blob, {
      types: FMG_TYPES,
      handle: fileHandle,
      suggestedName,
      saveAs
    });

    if (!result) {
      return;
    }

    // правки, сделанные пока шла запись, остаются несохранёнными
    useProjectStore.getState().markSaved(result.name, result.handle ?? null, { project, bpmnRevision });

    if (missing.length) {
      console.warn('В файл не попали картинки', missing);
      status(`Сохранено: ${ result.name }, но без картинок: ${ missing.length } (подробности в консоли)`, 'warning', 10000);
    } else {
      status(`Сохранено: ${ result.name }`, 'success');
    }
  } catch (error) {
    console.error(error);
    status(`Ошибка сохранения: ${ (error as Error).message }`, 'error', 0);
  } finally {
    saving = false;
  }
}

// BPMN ////////////////////

export async function importBpmnFile(file?: File) {
  if (!useProjectStore.getState().project) {
    return;
  }

  try {
    if (!file) {
      const opened = await openFile(BPMN_TYPES);

      if (!opened) {
        return;
      }

      file = opened.file;
    }

    if (!window.confirm(`Заменить текущую BPMN-схему проекта схемой из «${ file.name }»?`)) {
      return;
    }

    await replaceBpmn(await file.text(), file.name);
  } catch (error) {
    console.error(error);
    status(`Не удалось импортировать схему: ${ (error as Error).message }`, 'error', 0);
  }
}

export async function importExampleBpmn() {
  if (!window.confirm('Заменить текущую BPMN-схему проекта примером «Подтверждение оплаты по OTP»?')) {
    return;
  }

  await replaceBpmn(exampleXml, 'example.bpmn');
}

async function replaceBpmn(xml: string, name: string) {
  // схему меняют в редакторе — просмотр показывал бы старую
  useUiStore.getState().exitView();

  try {
    const warnings = await bpmnBridge.importXml(xml);

    useProjectStore.getState().touchBpmn();
    useUiStore.getState().setLayer('bpmn');

    if (warnings.length) {
      reportWarnings(`Схема ${ name } импортирована`, warnings);
    } else {
      status(`Схема ${ name } импортирована`, 'success');
    }
  } catch (error) {
    console.error(error);
    status(`Не удалось открыть схему: ${ (error as Error).message }`, 'error', 0);
  }
}

// просмотр ////////////////////

/**
 * Режим «Просмотр»: схема снимается из редактора и открывается в NavigatedViewer.
 * Плеер начинает с выбранного экрана, иначе со стартового.
 */
export async function enterView() {
  const project = useProjectStore.getState().project;
  const ui = useUiStore.getState();

  if (!project || ui.mode === 'view') {
    return;
  }

  bpmnBridge.stopPicking();

  try {
    const xml = await bpmnBridge.getXml();
    const selected = ui.selection?.screenId;
    const screens = project.screens;
    const screenId = [ selected, project.startScreenId, screens[0]?.id ]
      .find(id => !!id && screens.some(screen => screen.id === id)) ?? null;

    useUiStore.getState().startView(xml, screenId);
  } catch (error) {
    console.error(error);
    status(`Не удалось открыть просмотр: ${ (error as Error).message }`, 'error', 0);
  }
}

export function exitView() {
  useUiStore.getState().exitView();
}

// экспорт ////////////////////

function exportBaseName(): string {
  const { project, fileName } = useProjectStore.getState();

  if (fileName) {
    return baseName(fileName);
  }

  return safeFileName(project?.meta.code || project?.meta.name || 'process', 'process');
}

function diagramTitle(): string {
  const project = useProjectStore.getState().project;

  return bpmnBridge.getProcessName() || project?.meta.name || exportBaseName();
}

async function runExport(label: string, fn: () => Promise<void>) {
  status(`Экспорт ${ label }…`, 'info', 0);

  try {
    await fn();
    status(`Экспорт ${ label } готов`, 'success');
  } catch (error) {
    console.error(error);
    status(`Ошибка экспорта ${ label }: ${ (error as Error).message }`, 'error', 0);
  }
}

function requireModeler() {
  const modeler = bpmnBridge.getModeler();

  if (!modeler) {
    throw new Error('редактор схемы ещё не готов');
  }

  return modeler;
}

export const exportActions = {
  async bpmn() {
    await runExport('BPMN', async () => {
      const xml = await bpmnBridge.getXml();

      downloadBlob(new Blob([ xml ], { type: 'application/xml' }), `${ exportBaseName() }.bpmn`);
    });
  },

  async schemaSvg() {
    await runExport('SVG', async () => {
      const { exportSvg } = await import('../export/svg-export.js');
      const { svg } = await exportSvg(requireModeler());

      downloadBlob(new Blob([ svg ], { type: 'image/svg+xml;charset=utf-8' }), `${ exportBaseName() }-schema.svg`);
    });
  },

  async overviewSvg() {
    await runExport('SVG всего флоу', async () => {
      const project = useProjectStore.getState().project;

      if (!project) {
        throw new Error('проект не открыт');
      }

      const [ { exportSvgDocument }, { buildOverviewSvg }, { rasterizeAsset } ] = await Promise.all([
        import('../export/svg-export.js'),
        import('../export/overview-svg'),
        import('../export/raster')
      ]);
      const { doc, viewBox } = await exportSvgDocument(requireModeler());
      const images = new Map<string, string>();

      // экран показывается шириной displayWidth — растр вдвое больше хватает и для приближения
      await Promise.all(project.screens.map(async screen => {
        const max = { width: Math.max(1, screen.displayWidth) * 2, height: 4000 };
        const image = await rasterizeAsset(assets.get(screen.asset.path), screen.asset, max);

        if (image) {
          images.set(screen.id, image.data);
        }
      }));

      const svg = buildOverviewSvg({ project, graph: bpmnBridge.getGraph(), bpmnDoc: doc, bpmnViewBox: viewBox, images });

      downloadBlob(new Blob([ svg ], { type: 'image/svg+xml;charset=utf-8' }), `${ exportBaseName() }-flow.svg`);
    });
  },

  async flowPdf() {
    await runExport('PDF документации', async () => {
      const project = useProjectStore.getState().project;

      if (!project) {
        throw new Error('проект не открыт');
      }

      const modeler = requireModeler();
      const [ { exportSvgDocument }, { exportFlowPdf }, { PDF_FONT }, { collectElementDoc } ] = await Promise.all([
        import('../export/svg-export.js'),
        import('../export/pdf/render'),
        import('../export/pdf/fonts'),
        import('../modeler/sm/element-doc.js')
      ]);
      const { doc } = await exportSvgDocument(modeler, { fontFamily: PDF_FONT, anchors: false });
      const elementRegistry = modeler.get('elementRegistry');
      const screenLookup = {
        getScreen: (id: string) => project.screens.find(screen => screen.id === id) ?? null
      };

      const blob = await exportFlowPdf({
        project,
        graph: bpmnBridge.getGraph(),
        bpmnDoc: doc,
        getNodeDoc: id => {
          const element = elementRegistry.get(id);

          return element ? collectElementDoc(element, screenLookup) : null;
        },
        getAsset: path => assets.get(path)
      });

      downloadBlob(blob, `${ exportBaseName() }-flow.pdf`);
    });
  },

  async schemaPdf() {
    await runExport('PDF', async () => {
      const { exportPdf } = await import('../export/pdf-export.js');
      const blob = await exportPdf(requireModeler(), { title: diagramTitle() });

      downloadBlob(blob, `${ exportBaseName() }-schema.pdf`);
    });
  },

  async schemaPng(scale: 2 | 4) {
    await runExport(`PNG ${ scale }x`, async () => {
      const { exportPng } = await import('../export/png-export.js');
      const blob = await exportPng(requireModeler(), { scale });

      downloadBlob(blob, `${ exportBaseName() }-schema@${ scale }x.png`);
    });
  }
};
