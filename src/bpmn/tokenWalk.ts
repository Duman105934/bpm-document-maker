/**
 * Единый проход по флоу в режиме «Просмотр»: экраны мобильного приложения и схема backend
 * в одном пути, с одной панелью управления (WalkBar).
 *
 * Логика шагов — в walk.ts; здесь токен на канве просмотрщика (SVG), его движение по потоку,
 * подсветка следа, слежение камерой и переключение слоёв: позиция «экран» показывает слой
 * «Прототип», позиция «узел» — слой «Backend». Состояние отдаётся в React через
 * subscribe / getSnapshot (useSyncExternalStore).
 */

import type { ApiCall, Screen } from '../model/types';
import { buildBpmnGraph, emptyGraph, type BpmnGraph } from './graph';
import {
  backWalk,
  canBack,
  currentPos,
  currentStep,
  jumpWalk,
  pointOnPolyline,
  polylineLength,
  samePos,
  startWalk,
  stepCall,
  stepWalk,
  tokenNodeId,
  visitedBefore,
  walkOptions,
  walkStart,
  walkTrail,
  type WalkContext,
  type WalkOption,
  type WalkPos,
  type WalkState
} from './walk';

type Viewer = any;
type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

/** Связь прохода с приложением: проект и то, что показано на экране. Задаётся в app/walkHost.ts. */
export interface WalkHost {
  getScreens(): Screen[];
  /** стартовый экран проекта */
  startScreenId(): string | null;
  /** экран, открытый в плеере при входе в просмотр */
  viewScreenId(): string | null;
  /** показать слой «Прототип» с экраном */
  showScreen(id: string): void;
  /** показать слой «Backend» */
  showSchema(): void;
  /** показать карточку вызова backend; null — убрать */
  showCall(view: { call: ApiCall; screenId: string } | null): void;
}

export interface WalkSnapshot {
  /** схема импортирована, проход можно начинать */
  ready: boolean;
  active: boolean;
  /** текущая позиция: экран или узел */
  pos: WalkPos | null;
  /** узел, на котором стоит токен (текущий или последний пройденный) */
  nodeId: string | null;
  currentName: string;
  options: WalkOption[];
  canBack: boolean;
  /** идёт шаг: токен движется или «нажимается» зона */
  animating: boolean;
  /** авто-проход включён (на развилке ждёт выбора и продолжает сам) */
  auto: boolean;
  /** номер шага, с 1 */
  step: number;
  /** зона экрана, которую «нажимает» текущий шаг */
  pressing: string | null;
  /** есть с чего начать проход */
  canStart: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export const WALK_DONE_MARKER = 'fmg-walk-done';
export const WALK_CURRENT_MARKER = 'fmg-walk-current';
export const WALK_OPTION_MARKER = 'fmg-walk-option';

/** скорость токена, px схемы в мс, и границы длительности одного шага */
const TOKEN_SPEED = 0.38;
const MIN_STEP_MS = 380;
const MAX_STEP_MS = 1400;
/** паузы авто-прохода: на узле, на узле с карточкой вызова, на экране */
const AUTO_NODE_MS = 500;
const AUTO_CALL_MS = 1700;
const AUTO_SCREEN_MS = 1500;
/** сколько подсвечивается зона, которую «нажимает» шаг */
const PRESS_MS = 550;
/** отступ от края видимой области, px экрана */
const VIEW_MARGIN = 70;
/** фигуры не шире этого (события, развилки) — токен встаёт в центр */
const SMALL_SHAPE = 60;

const EMPTY: WalkSnapshot = {
  ready: false,
  active: false,
  pos: null,
  nodeId: null,
  currentName: '',
  options: [],
  canBack: false,
  animating: false,
  auto: false,
  step: 0,
  pressing: null,
  canStart: false
};

const NO_HOST: WalkHost = {
  getScreens: () => [],
  startScreenId: () => null,
  viewScreenId: () => null,
  showScreen() {},
  showSchema() {},
  showCall() {}
};

class TokenWalk {

  private viewer: Viewer | null = null;
  private host: WalkHost = NO_HOST;
  private ready = false;
  private graph: BpmnGraph = emptyGraph();
  private state: WalkState | null = null;
  private pendingJump: WalkPos | null = null;

  private animating = false;
  private auto = false;
  private pressing: string | null = null;
  /** меняется при любом действии, которое должно прервать движение и авто-проход */
  private run = 0;
  /** номер текущего цикла авто-прохода: ручной шаг заменяет цикл новым */
  private autoLoop = 0;

  private token: SVGGElement | null = null;
  private tokenPos: Point | null = null;
  private marked = new Map<string, string>();

  private snapshot: WalkSnapshot = EMPTY;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  setHost(host: WalkHost) {
    this.host = host;
  }

  // жизненный цикл ////////////////////

  attach(viewer: Viewer) {
    this.reset();
    this.viewer = viewer;
    this.emit();
  }

  /** Схема импортирована — проход начинается сам: с экрана, открытого в плеере. */
  markReady(viewer: Viewer) {
    if (this.viewer !== viewer) {
      return;
    }

    this.ready = true;
    this.graph = buildBpmnGraph(viewer.getDefinitions());

    const pending = this.pendingJump;

    this.pendingJump = null;
    this.begin(pending ?? walkStart(this.ctx(), this.host.viewScreenId() ?? this.host.startScreenId()));
  }

  detach(viewer: Viewer) {
    if (this.viewer === viewer) {
      this.reset();
      this.emit();
    }
  }

  private reset() {
    this.run++;
    this.autoLoop++;
    this.viewer = null;
    this.ready = false;
    this.graph = emptyGraph();
    this.state = null;
    this.pendingJump = null;
    this.animating = false;
    this.auto = false;
    this.pressing = null;
    this.token = null;
    this.tokenPos = null;
    this.marked.clear();
  }

  private ctx(): WalkContext {
    return { graph: this.graph, screens: this.host.getScreens() };
  }

  private options(): WalkOption[] {
    return walkOptions(this.ctx(), this.state);
  }

  // действия ////////////////////

  hasNode(id: string): boolean {
    return this.graph.nodes.has(id) && !!this.element(id);
  }

  private exists(pos: WalkPos): boolean {
    return pos.type === 'node' ? this.hasNode(pos.id) : this.host.getScreens().some(screen => screen.id === pos.id);
  }

  /** Начать проход с позиции (прежний след стирается); null — начинать не с чего. */
  private begin(pos: WalkPos | null) {
    this.interrupt();
    this.state = pos && this.exists(pos) ? startWalk(pos) : null;

    if (!this.state) {
      this.removeToken();
    }

    void this.present(true);
  }

  /** Начать сначала: со стартового экрана, без экранов — с начала схемы. */
  restart() {
    if (this.ready) {
      this.begin(walkStart(this.ctx(), this.host.startScreenId()));
    }
  }

  /**
   * Перейти на позицию без шага: выбор экрана в плеере, «поставить токен сюда»,
   * переход по ссылке из карточки. След сохраняется. До импорта схемы запрос откладывается.
   *
   * @returns false, если такой позиции нет
   */
  jump(pos: WalkPos): boolean {
    if (!this.viewer || !this.ready) {
      this.pendingJump = pos;

      return true;
    }

    if (!this.exists(pos)) {
      return false;
    }

    this.interrupt();
    this.state = jumpWalk(this.state, pos);
    void this.present(true);

    return true;
  }

  /** Шаг по варианту (ключ WalkOption); без ключа — по единственному варианту. */
  async step(key?: string): Promise<void> {
    if (!this.state || this.animating) {
      return;
    }

    // ручной шаг заменяет идущий цикл авто-прохода; включённое авто после шага продолжается
    this.autoLoop++;

    if (await this.advance(key) && this.auto) {
      void this.runAuto(false);
    } else {
      this.emit();
    }
  }

  /**
   * Нажатие зоны экрана в плеере.
   * @returns false, если зона не ведёт ни на экран, ни на узел схемы — плеер обработает её сам
   */
  async pressZone(screenId: string, hotspotId: string): Promise<boolean> {
    return this.press(screenId, option => option.hotspotId === hotspotId);
  }

  /** Вызов при открытии экрана, выбранный в плеере. */
  async pressCall(screenId: string, callId: string): Promise<boolean> {
    return this.press(screenId, option => option.callId === callId && !option.hotspotId);
  }

  private async press(screenId: string, match: (option: WalkOption) => boolean): Promise<boolean> {
    if (!this.ready) {
      return false;
    }

    if (this.animating) {
      return true;
    }

    const pos: WalkPos = { type: 'screen', id: screenId };
    const state = samePos(currentPos(this.state), pos) ? this.state : jumpWalk(this.state, pos);
    const option = walkOptions(this.ctx(), state).find(match);

    if (!option) {
      return false;
    }

    if (state !== this.state) {
      // экран открыт в плеере не шагом прохода — проход продолжается с него
      this.interrupt();
      this.state = state;
      this.sync();
    }

    await this.step(option.key);

    return true;
  }

  back() {
    if (!this.state || !canBack(this.state)) {
      return;
    }

    this.interrupt();
    this.state = backWalk(this.state);
    void this.present(false);
  }

  /** Авто-проход: идти самому; на развилке ждать выбора; стоп в конце и на уже пройденном месте. */
  toggleAuto() {
    if (!this.state) {
      return;
    }

    this.autoLoop++;

    if (this.auto) {
      this.auto = false;
      this.emit();

      return;
    }

    this.auto = true;
    this.emit();
    void this.runAuto(true);
  }

  /** Размер канвы изменился (открылась инфо-панель, показан слой) — токен должен остаться на виду. */
  resized() {
    const id = currentPos(this.state)?.type === 'node' ? tokenNodeId(this.state) : null;
    const element = id && this.element(id);

    if (element && !this.animating) {
      this.ensureVisible(element);
    }
  }

  // шаг ////////////////////

  private async advance(key?: string): Promise<boolean> {
    const state = this.state;
    const viewer = this.viewer;

    if (!state || !viewer) {
      return false;
    }

    const options = this.options();
    const option = key ? options.find(o => o.key === key) : options.length === 1 ? options[0] : undefined;

    if (!option) {
      return false;
    }

    const run = this.run;

    this.animating = true;

    // шаг с экрана по зоне — сначала показать, какая зона «нажата»
    if (option.hotspotId && currentPos(state)?.type === 'screen') {
      this.pressing = option.hotspotId;
      this.emit();
      await delay(PRESS_MS);

      if (run !== this.run) {
        return false;
      }

      this.pressing = null;
    }

    this.emit();

    // шаг по схеме: токен едет по потоку (или прыгает внутрь подпроцесса, на граничное событие)
    if (option.kind === 'flow' || option.kind === 'jump') {
      this.host.showCall(null);
      this.host.showSchema();
      await nextFrame();

      if (run !== this.run) {
        return false;
      }

      const tokenNode = tokenNodeId(state);
      const from = tokenNode ? this.element(tokenNode) : null;
      const flow = option.flowId ? this.element(option.flowId) : null;
      const target = this.element(option.targetId);

      if (!target) {
        this.animating = false;
        this.emit();

        return false;
      }

      viewer.get('canvas').resized();

      const rest = restPoint(target, flow?.waypoints);
      const path: Point[] = [
        ...(this.tokenPos ? [ this.tokenPos ] : []),
        ...(flow?.waypoints || []).map((p: Point) => ({ x: p.x, y: p.y })),
        rest
      ];

      // по возможности показать весь шаг целиком, чтобы токен не уходил за край
      this.ensureVisible(union([ from, target, ...(flow?.waypoints?.length ? [ boundsOf(flow.waypoints) ] : []) ].filter(Boolean)), target);

      await this.animate(path, run);

      if (run !== this.run) {
        return false;
      }
    }

    this.state = stepWalk(this.ctx(), state, option.key);
    this.animating = false;
    await this.present(option.kind === 'call');

    return run === this.run;
  }

  private async runAuto(first: boolean) {
    const run = this.run;
    const loop = this.autoLoop;
    const alive = () => this.auto && run === this.run && loop === this.autoLoop && !!this.state;

    while (alive()) {
      const options = this.options();

      // развилка или несколько зон экрана — авто ждёт выбора и продолжит после него
      if (options.length > 1) {
        break;
      }

      // конец пути; уже пройденное место (цикл) — кроме шага, с которого авто запущено
      if (!options.length || (!first && visitedBefore(this.state!))) {
        this.auto = false;
        break;
      }

      if (!first) {
        const step = currentStep(this.state)!;

        await delay(step.pos.type === 'screen' ? AUTO_SCREEN_MS : step.call ? AUTO_CALL_MS : AUTO_NODE_MS);

        if (!alive()) {
          return;
        }
      }

      first = false;

      if (!await this.advance(options[0].key)) {
        if (run === this.run && loop === this.autoLoop) {
          this.auto = false;
        }

        break;
      }
    }

    if (run === this.run && loop === this.autoLoop) {
      this.emit();
    }
  }

  /** Прервать движение и авто-проход. */
  private interrupt() {
    this.run++;
    this.autoLoop++;
    this.animating = false;
    this.auto = false;
    this.pressing = null;
  }

  /**
   * Показать текущую позицию: слой, экран или узел, карточку вызова, токен, камеру.
   * drop — токен «падает» на узел (старт, прыжок, вызов), а не приезжает по потоку.
   */
  private async present(drop: boolean) {
    const run = this.run;
    const step = currentStep(this.state);

    this.sync();
    this.emit();

    if (!step || !this.viewer) {
      return;
    }

    this.host.showCall(stepCall(this.ctx(), step));

    const nodeId = tokenNodeId(this.state);
    const element = nodeId ? this.element(nodeId) : null;
    const place = () => {
      if (!element) {
        this.removeToken();

        return;
      }

      const canvas = this.viewer.get('canvas');
      const root = canvas.findRoot(element);

      // узел во вложенном подпроцессе — на своей плоскости
      if (root && root !== canvas.getRootElement()) {
        canvas.setRootElement(root);
      }

      const arrived = [ ...this.state!.steps ].reverse().find(s => s.pos.type === 'node' && s.pos.id === nodeId);
      const flow = arrived?.flowId ? this.element(arrived.flowId) : null;

      this.placeToken(restPoint(element, flow?.waypoints), drop);
    };

    if (step.pos.type === 'screen') {
      // токен остаётся на узле, который показал экран; камеру не трогаем — слой схемы скрыт
      place();
      this.host.showScreen(step.pos.id);

      return;
    }

    this.host.showSchema();
    // слой показывается в следующем кадре: размеры канвы до этого неверны
    await nextFrame();

    if (run !== this.run || !this.viewer || !element) {
      return;
    }

    this.viewer.get('canvas').resized();
    place();
    this.ensureVisible(element);
    this.viewer.get('eventBus').fire('fmg.viewer.focus', { element });
  }

  // токен ////////////////////

  private ensureToken(): SVGGElement {
    if (this.token && this.token.isConnected) {
      return this.token;
    }

    const layer: SVGGElement = this.viewer.get('canvas').getLayer('fmg-walk', 1);
    const token = document.createElementNS(SVG_NS, 'g');
    const halo = document.createElementNS(SVG_NS, 'circle');
    const dot = document.createElementNS(SVG_NS, 'circle');

    token.setAttribute('class', 'fmg-token');
    halo.setAttribute('class', 'fmg-token__halo');
    halo.setAttribute('r', '15');
    dot.setAttribute('class', 'fmg-token__dot');
    dot.setAttribute('r', '8');
    token.appendChild(halo);
    token.appendChild(dot);
    layer.appendChild(token);
    this.token = token;

    return token;
  }

  private placeToken(point: Point, drop = false) {
    const token = this.ensureToken();

    this.tokenPos = point;
    token.setAttribute('transform', `translate(${ point.x } ${ point.y })`);

    if (drop) {
      // перезапуск CSS-анимации появления
      token.classList.remove('fmg-token--drop');
      void token.getBoundingClientRect();
      token.classList.add('fmg-token--drop');
    }
  }

  private removeToken() {
    this.token?.remove();
    this.token = null;
    this.tokenPos = null;
  }

  private animate(path: Point[], run: number): Promise<void> {
    const length = polylineLength(path);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced || !length ? 0 : Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, length / TOKEN_SPEED));

    if (!duration) {
      return Promise.resolve();
    }

    const token = this.ensureToken();

    token.classList.remove('fmg-token--drop');
    token.classList.add('fmg-token--moving');

    return new Promise(resolve => {
      const startedAt = performance.now();
      let done = false;

      const finish = () => {
        if (!done) {
          done = true;
          clearTimeout(guard);
          token.classList.remove('fmg-token--moving');
          resolve();
        }
      };

      // вкладка в фоне не вызывает requestAnimationFrame — шаг не должен зависнуть
      const guard = setTimeout(finish, duration + 300);

      const frame = (now: number) => {
        if (done || run !== this.run) {
          finish();

          return;
        }

        const t = Math.min(1, (now - startedAt) / duration);

        this.placeToken(pointOnPolyline(path, easeInOut(t)));

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          finish();
        }
      };

      requestAnimationFrame(frame);
    });
  }

  // подсветка ////////////////////

  /** Привести маркеры на схеме к состоянию прохода. */
  private sync() {
    const next = new Map<string, string>();
    const token = tokenNodeId(this.state);

    if (this.state) {
      const trail = walkTrail(this.state);
      const options = this.options();

      trail.nodes.forEach(id => next.set(id, WALK_DONE_MARKER));
      trail.flows.forEach(id => next.set(id, WALK_DONE_MARKER));

      // на развилке — подсветить ветки схемы, из которых нужно выбрать
      if (options.length > 1) {
        options.forEach(option => {
          if (option.kind === 'flow' || option.kind === 'jump') {
            next.set(option.flowId ?? option.targetId, WALK_OPTION_MARKER);
          }
        });
      }

      if (token) {
        next.set(token, WALK_CURRENT_MARKER);
      }
    }

    const canvas = this.viewer?.get('canvas');

    if (!canvas) {
      return;
    }

    this.marked.forEach((marker, id) => {
      if (next.get(id) !== marker && this.element(id)) {
        canvas.removeMarker(id, marker);
      }
    });

    next.forEach((marker, id) => {
      if (this.marked.get(id) !== marker && this.element(id)) {
        canvas.addMarker(id, marker);
      }
    });

    this.marked = next;
  }

  // камера ////////////////////

  /**
   * Показать область: если она не видна целиком — центрировать её;
   * если она больше экрана — центрировать fallback (узел назначения).
   */
  private ensureVisible(target: Rect | null, fallback?: Rect) {
    const canvas = this.viewer?.get('canvas');

    if (!canvas || !target) {
      return;
    }

    const full = canvas.viewbox();
    const scale = full.scale || 1;
    const margin = VIEW_MARGIN / scale;

    if (!full.width || !full.height) {
      return;
    }

    // карточка вызова лежит поверх схемы — узел должен быть виден рядом с ней, а не под ней
    const covered = this.coveredByCard(canvas.getContainer());
    const viewbox = {
      x: full.x + covered.left / scale,
      y: full.y,
      width: full.width - covered.left / scale,
      height: full.height - covered.bottom / scale
    };

    const fits = (rect: Rect) => rect.width + 2 * margin <= viewbox.width && rect.height + 2 * margin <= viewbox.height;
    const inside = (rect: Rect) =>
      rect.x >= viewbox.x + margin &&
      rect.y >= viewbox.y + margin &&
      rect.x + rect.width <= viewbox.x + viewbox.width - margin &&
      rect.y + rect.height <= viewbox.y + viewbox.height - margin;

    let rect = target;

    if (!fits(rect)) {
      if (!fallback) {
        // узел крупнее экрана — достаточно, чтобы был виден его центр
        rect = { x: target.x + target.width / 2, y: target.y + target.height / 2, width: 0, height: 0 };
      } else {
        rect = fallback;
      }
    }

    if (inside(rect)) {
      return;
    }

    canvas.viewbox({
      x: rect.x + rect.width / 2 - viewbox.width / 2 - covered.left / scale,
      y: rect.y + rect.height / 2 - viewbox.height / 2,
      width: full.width,
      height: full.height
    });
  }

  /**
   * Сколько px канвы закрывает карточка вызова: высокая карточка отнимает полосу слева,
   * низкая — полосу снизу.
   */
  private coveredByCard(container: HTMLElement): { left: number; bottom: number } {
    const card = document.querySelector('.call-card')?.getBoundingClientRect();
    const box = container.getBoundingClientRect();

    if (!card || card.right <= box.left || card.left >= box.right || card.bottom <= box.top || card.top >= box.bottom) {
      return { left: 0, bottom: 0 };
    }

    const width = Math.min(card.right, box.right) - box.left;
    const height = box.bottom - Math.max(card.top, box.top);

    // карточка шире половины канвы — места сбоку всё равно нет
    if (height > box.height * 0.4 && width < box.width * 0.55) {
      return { left: width + 12, bottom: 0 };
    }

    return height < box.height * 0.55 ? { left: 0, bottom: height + 12 } : { left: 0, bottom: 0 };
  }

  // состояние ////////////////////

  private element(id: string): any {
    return this.viewer?.get('elementRegistry').get(id);
  }

  private emit() {
    const pos = currentPos(this.state);
    let name = '';

    if (pos?.type === 'node') {
      const node = this.graph.nodes.get(pos.id);

      name = node ? (node.name || node.id) : pos.id;
    } else if (pos) {
      name = this.host.getScreens().find(screen => screen.id === pos.id)?.name || 'Без названия';
    }

    this.snapshot = {
      ready: this.ready,
      active: !!this.state,
      pos,
      nodeId: tokenNodeId(this.state),
      currentName: name,
      options: this.options(),
      canBack: canBack(this.state),
      animating: this.animating,
      auto: this.auto,
      step: this.state?.steps.length ?? 0,
      pressing: this.pressing,
      canStart: this.ready && !!walkStart(this.ctx(), this.host.startScreenId())
    };

    this.listeners.forEach(listener => listener());
  }
}

// геометрия ////////////////////

/** Где токен стоит на узле: у мелких фигур — в центре, иначе в точке входа потока или слева по центру. */
function restPoint(element: Rect, waypoints?: Point[]): Point {
  if (element.width <= SMALL_SHAPE && element.height <= SMALL_SHAPE) {
    return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  }

  const last = waypoints?.[waypoints.length - 1];

  return last ? { x: last.x, y: last.y } : { x: element.x, y: element.y + element.height / 2 };
}

function boundsOf(points: Point[]): Rect {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function union(rects: Rect[]): Rect | null {
  if (!rects.length) {
    return null;
  }

  const x = Math.min(...rects.map(r => r.x));
  const y = Math.min(...rects.map(r => r.y));

  return {
    x,
    y,
    width: Math.max(...rects.map(r => r.x + r.width)) - x,
    height: Math.max(...rects.map(r => r.y + r.height)) - y
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Следующий кадр; вкладка в фоне не вызывает requestAnimationFrame — не ждём дольше 120 мс. */
function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    requestAnimationFrame(finish);
    setTimeout(finish, 120);
  });
}

export const tokenWalk = new TokenWalk();
