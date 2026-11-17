/**
 * Единая точка работы с BPMN-схемой вне React-состояния.
 *
 * Модельер живёт в BpmnEditor; мост знает текущий экземпляр и умеет
 * импортировать XML даже до его создания (XML ждёт в pendingXml).
 */

import emptyXml from '../resources/empty.bpmn?raw';

import { buildBpmnGraph, emptyGraph, type BpmnGraph } from './graph';
import { normalizeSmNamespace } from './smNamespace';

type Modeler = any;
type Listener = () => void;
type RemapListener = (oldId: string, newId: string) => void;

export interface PickResult {
  id: string | null;
  /** выбор отменён извне (stopPicking, смена слоя, открытие проекта) */
  cancelled: boolean;
}

function isAny(element: any, types: string[]): boolean {
  const bo = element?.businessObject;

  return !!bo && typeof bo.$instanceOf === 'function' && types.some(type => bo.$instanceOf(type));
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ниже этого масштаба focusElement приближает схему до 100%. */
const MIN_FOCUS_ZOOM = 0.6;
const HIGHLIGHT_MARKER = 'fmg-highlight';
const PICK_PRIORITY = 5000;

class BpmnBridge {

  private modeler: Modeler | null = null;
  private pendingXml: string | null = null;
  private pendingResolvers: Array<(warnings: string[]) => void> = [];
  private pendingRejecters: Array<(error: Error) => void> = [];
  private importing = false;
  private changeListeners = new Set<Listener>();
  private graphListeners = new Set<Listener>();
  private remapListeners = new Set<RemapListener>();
  private graphCache: BpmnGraph | null = null;
  private graphRevision = 0;
  /** ссылка на элемент, а не id: id могут сменить в панели свойств, пока горит подсветка */
  private highlight: { element: any; timer: ReturnType<typeof setTimeout> } | null = null;
  private cancelPick: (() => void) | null = null;

  /** XML, который был импортирован последним — пока модельер не создан. */
  private lastXml: string = emptyXml;

  attach(modeler: Modeler) {
    this.modeler = modeler;

    modeler.on('commandStack.changed', (event: { trigger?: string }) => {
      if (this.importing || event?.trigger === 'clear') {
        return;
      }

      this.changeListeners.forEach(listener => listener());
    });

    // граф схемы устарел: правка, undo/redo, импорт
    modeler.on([ 'commandStack.changed', 'import.done' ], () => this.invalidateGraph());

    // ссылки прототипа на узлы не должны рваться при смене id
    modeler.on('element.updateId', (event: { element: any; newId: string }) => {
      if (!this.importing && event.element?.businessObject) {
        this.emitRemap(event.element.id, event.newId);
      }
    });

    // смена вида узла (bpmnReplace) создаёт новый элемент с новым id;
    // executed срабатывает и при redo, reverted — при undo
    modeler.on('commandStack.shape.replace.executed', (event: { context: any }) => {
      const { oldShape, newShape } = event.context || {};

      if (oldShape && newShape) {
        this.emitRemap(oldShape.id, newShape.id);
      }
    });

    modeler.on('commandStack.shape.replace.reverted', (event: { context: any }) => {
      const { oldShape, newShape } = event.context || {};

      if (oldShape && newShape) {
        this.emitRemap(newShape.id, oldShape.id);
      }
    });

    const xml = this.pendingXml ?? this.lastXml;

    this.runImport(modeler, xml).then(
      warnings => {
        if (this.modeler !== modeler) {
          return; // StrictMode: этот экземпляр уже уничтожен, XML ждёт следующего
        }

        this.pendingXml = null;
        this.pendingResolvers.splice(0).forEach(resolve => resolve(warnings));
        this.pendingRejecters = [];
      },
      error => {
        if (this.modeler !== modeler) {
          return;
        }

        this.pendingXml = null;
        this.pendingRejecters.splice(0).forEach(reject => reject(error));
        this.pendingResolvers = [];
      }
    );
  }

  detach(modeler: Modeler) {
    if (this.modeler === modeler) {
      this.cancelPick?.();
      this.clearHighlight();
      this.modeler = null;
      this.invalidateGraph();
    }
  }

  getModeler(): Modeler | null {
    return this.modeler;
  }

  isReady(): boolean {
    return !!this.modeler;
  }

  /** Импортировать схему. Возвращает предупреждения импорта. */
  importXml(source: string): Promise<string[]> {
    const xml = normalizeSmNamespace(source);

    if (!this.modeler) {
      this.pendingXml = xml;

      return new Promise((resolve, reject) => {
        this.pendingResolvers.push(resolve);
        this.pendingRejecters.push(reject);
      });
    }

    return this.runImport(this.modeler, xml);
  }

  async getXml(): Promise<string> {
    if (!this.modeler) {
      return this.pendingXml ?? this.lastXml;
    }

    const { xml } = await this.modeler.saveXML({ format: true });

    return xml;
  }

  /** Подписка на правки схемы пользователем (не на импорт). */
  onChanged(listener: Listener): () => void {
    this.changeListeners.add(listener);

    return () => this.changeListeners.delete(listener);
  }

  /** id узла изменился (смена вида, правка ID, их undo/redo). */
  onRemap(listener: RemapListener): () => void {
    this.remapListeners.add(listener);

    return () => this.remapListeners.delete(listener);
  }

  /** Подписка на изменение графа схемы (правка, импорт). */
  onGraphChanged(listener: Listener): () => void {
    this.graphListeners.add(listener);

    return () => this.graphListeners.delete(listener);
  }

  /** Растёт при каждом изменении графа — для useSyncExternalStore. */
  getGraphRevision(): number {
    return this.graphRevision;
  }

  /** Граф схемы из moddle; кэшируется до следующей правки. */
  getGraph(): BpmnGraph {
    if (!this.modeler) {
      return emptyGraph();
    }

    if (!this.graphCache) {
      this.graphCache = buildBpmnGraph(this.modeler.getDefinitions());
    }

    return this.graphCache;
  }

  hasElement(id: string): boolean {
    return !!(id && this.modeler?.get('elementRegistry').get(id));
  }

  /**
   * Показать узел: переключить плоскость, при мелком масштабе приблизить,
   * центрировать, выделить и подсветить на highlightMs.
   * @returns false, если узла нет
   */
  focusElement(id: string, { select = true, highlightMs = 2000 }: { select?: boolean; highlightMs?: number } = {}): boolean {
    const modeler = this.modeler;
    const element = modeler && id ? modeler.get('elementRegistry').get(id) : null;

    if (!element) {
      return false;
    }

    const canvas = modeler.get('canvas');

    centerOnElement(canvas, element);

    if (select) {
      modeler.get('selection').select(element);
    }

    if (highlightMs > 0) {
      this.clearHighlight();
      canvas.addMarker(element, HIGHLIGHT_MARKER);
      this.highlight = { element, timer: setTimeout(() => this.clearHighlight(), highlightMs) };
    }

    return true;
  }

  /**
   * Выбрать узел потока кликом по схеме.
   * Esc, пустое место, пул или дорожка — `{ id: null }`. Стрелки, объекты данных, аннотации
   * не выбираются: выбор продолжается, onHint получает подсказку.
   * stopPicking() и повторный вызов отменяют выбор — `{ id: null, cancelled: true }`.
   */
  pickElement({ onHint }: { onHint?: (message: string) => void } = {}): Promise<PickResult> {
    const modeler = this.modeler;

    this.cancelPick?.();

    if (!modeler) {
      return Promise.resolve({ id: null, cancelled: true });
    }

    const eventBus = modeler.get('eventBus');
    const canvas = modeler.get('canvas');
    const container: HTMLElement = canvas.getContainer();

    return new Promise(resolve => {
      const finish = (id: string | null, cancelled = false) => {
        eventBus.off('element.click', onClick);
        document.removeEventListener('keydown', onKeyDown, true);
        container.classList.remove('fmg-picking');
        this.cancelPick = null;
        resolve({ id, cancelled });
      };

      const onClick = (event: { element: any }) => {
        let element = event.element;

        if (element?.labelTarget) {
          element = element.labelTarget;
        }

        const isRoot = !element || element === canvas.getRootElement() || !element.parent;

        if (isRoot || isAny(element, [ 'bpmn:Participant', 'bpmn:Lane' ])) {
          // пул и дорожка — как пустое место
          finish(null);
        } else if (isAny(element, [ 'bpmn:FlowNode' ])) {
          finish(element.id);
        } else {
          onHint?.('Выберите узел: задачу, событие или развилку. Стрелки и объекты данных не привязываются');
        }

        // не выделять и не открывать context pad
        return false;
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(null);
        }
      };

      eventBus.on('element.click', PICK_PRIORITY, onClick);
      document.addEventListener('keydown', onKeyDown, true);
      container.classList.add('fmg-picking');
      this.cancelPick = () => finish(null, true);
    });
  }

  /** Отменить идущий выбор узла (результат — null). */
  stopPicking() {
    this.cancelPick?.();
  }

  /** SVG схемы как Document (без XML-пролога) и его viewBox — для общего экспорта. */
  async getSvgDocument(): Promise<{ doc: Document; viewBox: ViewBox }> {
    if (!this.modeler) {
      throw new Error('Редактор схемы не готов');
    }

    const { svg } = await this.modeler.saveSVG();
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    const [ x, y, width, height ] = (root.getAttribute('viewBox') || '0 0 0 0').split(/[\s,]+/).map(Number);

    return { doc, viewBox: { x, y, width, height } };
  }

  /** Название процесса (bpmn:Process name) — для экспорта. */
  getProcessName(): string | null {
    const root = this.modeler?.get('canvas').getRootElement();
    const bo = root && root.businessObject;

    return (bo && bo.get && bo.get('name')) || null;
  }

  private emitRemap(oldId: string, newId: string) {
    if (oldId && newId && oldId !== newId) {
      this.remapListeners.forEach(listener => listener(oldId, newId));
    }
  }

  private invalidateGraph() {
    this.graphCache = null;
    this.graphRevision++;
    this.graphListeners.forEach(listener => listener());
  }

  private clearHighlight() {
    if (!this.highlight) {
      return;
    }

    clearTimeout(this.highlight.timer);

    try {
      this.modeler?.get('canvas').removeMarker(this.highlight.element, HIGHLIGHT_MARKER);
    } catch (error) {
      // элемент уже удалён
    }

    this.highlight = null;
  }

  /**
   * Импорт с откатом. bpmn-js разбирает XML до очистки канвы, но ошибки после разбора
   * (например, «no diagram to display») приходят уже после clear() — тогда прежняя схема
   * импортируется обратно, а наружу уходит исходная ошибка.
   */
  private async runImport(modeler: Modeler, xml: string): Promise<string[]> {
    this.importing = true;

    const before = modeler.getDefinitions();
    let snapshot: string | null = this.lastXml;

    if (before) {
      try {
        snapshot = (await modeler.saveXML({ format: true })).xml;
      } catch (error) {
        // схему не снять — откатываемся к последнему импортированному XML
      }
    }

    try {
      const { warnings } = await modeler.importXML(xml);

      this.lastXml = xml;

      if (this.modeler === modeler) {
        modeler.get('canvas').zoom('fit-viewport', 'auto');
      }

      return (warnings || []).map((w: any) => w?.message || String(w));
    } catch (error) {
      // модельер уже уничтожен (StrictMode, смена проекта) — откатывать некуда;
      // разбор упал — канва и definitions не тронуты
      if (this.modeler !== modeler || (before && modeler.getDefinitions() === before)) {
        throw error;
      }

      if (snapshot && snapshot !== xml) {
        try {
          await modeler.importXML(snapshot);
          this.lastXml = snapshot;

          if (this.modeler === modeler) {
            modeler.get('canvas').zoom('fit-viewport', 'auto');
          }
        } catch (restoreError) {
          console.error('Не удалось вернуть прежнюю схему', restoreError);
        }
      }

      throw error;
    } finally {
      this.importing = false;
    }
  }
}

/**
 * Переключить плоскость на узел, при мелком масштабе приблизить до 100% и центрировать.
 * Общая для редактора и просмотрщика (canvas diagram-js).
 */
export function centerOnElement(canvas: any, element: any) {
  canvas.resized();

  // переключает плоскость, если узел во вложенном подпроцессе
  canvas.scrollToElement(element);

  if (canvas.zoom() < MIN_FOCUS_ZOOM) {
    canvas.zoom(1);
  }

  // scrollToElement только доводит до видимости — центрируем сами
  const viewbox = canvas.viewbox();
  const bounds = element.waypoints ? waypointsBounds(element.waypoints) : element;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  canvas.viewbox({
    x: cx - viewbox.width / 2,
    y: cy - viewbox.height / 2,
    width: viewbox.width,
    height: viewbox.height
  });
}

function waypointsBounds(waypoints: Array<{ x: number; y: number }>) {
  const xs = waypoints.map(p => p.x);
  const ys = waypoints.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export const bpmnBridge = new BpmnBridge();

export { emptyXml };
