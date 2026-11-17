/**
 * Единый проход по флоу в режиме «Просмотр» — логика без DOM.
 *
 * Позиция прохода — экран мобильного приложения или узел схемы. С экрана шаг ведёт
 * по его зонам и вызовам (на узел схемы или на другой экран), с узла — по sequenceFlow,
 * внутрь подпроцесса, по граничному событию; узел Cmd / Mobile сначала показывает свой экран.
 * Это чтение документации, а не исполнение BPMN: на любой развилке (и на параллельной тоже)
 * ветку выбирает пользователь, токен всегда один.
 */

import { isDataNode, sortHotspots, subProcessStarts } from '../model/flow';
import type { ApiCall, Screen } from '../model/types';
import { describeNode, type BpmnGraph, type BpmnGraphNode } from './graph';

export type WalkPos =
  | { type: 'node'; id: string }
  | { type: 'screen'; id: string };

export interface WalkStep {
  pos: WalkPos;
  /** поток, по которому токен пришёл на узел; null — старт, прыжок, вызов, экран */
  flowId: string | null;
  /** экран показан этим узлом (Cmd / Mobile) — с экрана можно продолжить по его потокам */
  fromNode?: string;
  /** на узел пришли вызовом backend с экрана */
  call?: { screenId: string; callId: string; hotspotId?: string };
}

export interface WalkState {
  /** пройденные шаги, последний — текущая позиция */
  steps: WalkStep[];
}

export interface WalkContext {
  graph: BpmnGraph;
  screens: Screen[];
}

export type WalkOptionKind =
  /** по sequenceFlow */
  | 'flow'
  /** без потока: внутрь подпроцесса или на граничное событие */
  | 'jump'
  /** узел показывает экран */
  | 'screen'
  /** вызов backend с экрана: зона или вызов при открытии */
  | 'call'
  /** переход на другой экран по зоне */
  | 'navigate';

export interface WalkOption {
  /** ключ варианта — им делается шаг */
  key: string;
  kind: WalkOptionKind;
  targetType: WalkPos['type'];
  targetId: string;
  /** поток шага; null — шаг без потока */
  flowId: string | null;
  /** подпись варианта: имя потока, зоны, вызова */
  label: string;
  /** подпись назначения */
  target: string;
  /** зона экрана, которой делается шаг */
  hotspotId?: string;
  callId?: string;
}

export function startWalk(pos: WalkPos): WalkState {
  return { steps: [ { pos, flowId: null } ] };
}

export function currentStep(state: WalkState | null): WalkStep | null {
  return state?.steps[state.steps.length - 1] ?? null;
}

export function currentPos(state: WalkState | null): WalkPos | null {
  return currentStep(state)?.pos ?? null;
}

export function samePos(a: WalkPos | null, b: WalkPos | null): boolean {
  return !!a && !!b && a.type === b.type && a.id === b.id;
}

/** Узел, на котором стоит токен: текущий или последний пройденный (пока показан экран). */
export function tokenNodeId(state: WalkState | null): string | null {
  if (!state) {
    return null;
  }

  for (let i = state.steps.length - 1; i >= 0; i--) {
    const step = state.steps[i];

    if (step.pos.type === 'node') {
      return step.pos.id;
    }

    if (step.fromNode) {
      return step.fromNode;
    }
  }

  return null;
}

function screenLabel(screen: Screen): string {
  return `Экран «${ screen.name || 'Без названия' }»`;
}

/**
 * Шаги с узла по схеме: вход в подпроцесс, исходящие sequenceFlow в порядке схемы,
 * затем граничные события (у входа и граничных событий потока нет).
 */
export function nodeOptions(graph: BpmnGraph, nodeId: string | null): WalkOption[] {
  const node = nodeId ? graph.nodes.get(nodeId) : undefined;

  if (!node) {
    return [];
  }

  const options: WalkOption[] = [];

  const jump = (targetId: string, label: string) => {
    const target = graph.nodes.get(targetId);

    if (target) {
      options.push({
        key: `jump:${ targetId }`, kind: 'jump', targetType: 'node', targetId, flowId: null, label, target: describeNode(target)
      });
    }
  };

  subProcessStarts(graph, node).forEach(id => jump(id, 'Внутрь подпроцесса'));

  node.outgoing.forEach(flowId => {
    const flow = graph.flows.get(flowId);
    const target = flow && graph.nodes.get(flow.targetRef);

    if (flow && target) {
      options.push({
        key: flowId,
        kind: 'flow',
        targetType: 'node',
        targetId: target.id,
        flowId,
        label: [ flow.name, flow.trigger && `[${ flow.trigger }]` ].filter(Boolean).join(' '),
        target: describeNode(target)
      });
    }
  });

  node.boundary.forEach(id => jump(id, `Граничное: ${ graph.nodes.get(id)?.name || id }`));

  return options;
}

/** Куда можно шагнуть с текущей позиции. */
export function walkOptions(ctx: WalkContext, state: WalkState | null): WalkOption[] {
  const step = currentStep(state);

  if (!state || !step) {
    return [];
  }

  const { graph, screens } = ctx;

  if (step.pos.type === 'node') {
    const node = graph.nodes.get(step.pos.id);

    if (!node) {
      return [];
    }

    const screen = node.screenId ? screens.find(s => s.id === node.screenId) : undefined;
    const previous = state.steps[state.steps.length - 2]?.pos;
    // на узел пришли с его же экрана — второй раз экран не показываем
    const fromItsScreen = previous?.type === 'screen' && previous.id === node.screenId;

    if (screen && !fromItsScreen) {
      return [ {
        key: `screen:${ screen.id }`,
        kind: 'screen',
        targetType: 'screen',
        targetId: screen.id,
        flowId: null,
        label: 'Показать экран',
        target: screenLabel(screen)
      } ];
    }

    return nodeOptions(graph, node.id);
  }

  const screen = screens.find(s => s.id === step.pos.id);
  const options: WalkOption[] = [];

  const call = (apiCall: ApiCall, label: string, hotspotId?: string) => {
    const node = apiCall.bpmnElementId ? graph.nodes.get(apiCall.bpmnElementId) : undefined;

    if (node && !isDataNode(node)) {
      options.push({
        key: `call:${ apiCall.id }`,
        kind: 'call',
        targetType: 'node',
        targetId: node.id,
        flowId: null,
        label,
        target: describeNode(node),
        hotspotId,
        callId: apiCall.id
      });
    }
  };

  if (screen) {
    screen.onOpenCalls.forEach(apiCall => call(apiCall, apiCall.name || 'Вызов при открытии'));

    sortHotspots(screen.hotspots).forEach((hotspot, index) => {
      const action = hotspot.action;
      const name = hotspot.name || `Зона ${ index + 1 }`;

      if (action?.type === 'gateway') {
        call(action.call, name, hotspot.id);
      } else if (action?.type === 'navigate' && action.targetScreenId !== screen.id) {
        const target = screens.find(s => s.id === action.targetScreenId);

        if (target) {
          options.push({
            key: `nav:${ hotspot.id }`,
            kind: 'navigate',
            targetType: 'screen',
            targetId: target.id,
            flowId: null,
            label: name,
            target: screenLabel(target),
            hotspotId: hotspot.id
          });
        }
      }
    });
  }

  // экран показан узлом — можно продолжить и по схеме; ветка в тот же узел, что и вызов, не дублируется
  if (step.fromNode) {
    const reached = new Set(options.filter(option => option.targetType === 'node').map(option => option.targetId));

    nodeOptions(graph, step.fromNode).forEach(option => {
      if (!reached.has(option.targetId)) {
        options.push({ ...option, label: option.label || 'Далее по схеме' });
      }
    });
  }

  return options;
}

/** Шаг по варианту (ключ из walkOptions). Варианта нет — состояние не меняется. */
export function stepWalk(ctx: WalkContext, state: WalkState, key: string): WalkState {
  const option = walkOptions(ctx, state).find(o => o.key === key);
  const from = currentPos(state);

  if (!option || !from) {
    return state;
  }

  const pos: WalkPos = { type: option.targetType, id: option.targetId };
  let step: WalkStep;

  switch (option.kind) {
  case 'screen':
    step = { pos, flowId: null, fromNode: from.id };
    break;
  case 'call':
    step = { pos, flowId: null, call: { screenId: from.id, callId: option.callId!, hotspotId: option.hotspotId } };
    break;
  default:
    step = { pos, flowId: option.flowId };
  }

  return { steps: [ ...state.steps, step ] };
}

/** Прыжок на позицию без шага (выбор экрана, «поставить токен сюда»). На текущую — без изменений. */
export function jumpWalk(state: WalkState | null, pos: WalkPos): WalkState {
  if (!state) {
    return startWalk(pos);
  }

  if (samePos(currentPos(state), pos)) {
    return state;
  }

  return { steps: [ ...state.steps, { pos, flowId: null } ] };
}

/** Шаг назад; первый шаг не отменяется. */
export function backWalk(state: WalkState): WalkState {
  return state.steps.length > 1 ? { steps: state.steps.slice(0, -1) } : state;
}

export function canBack(state: WalkState | null): boolean {
  return !!state && state.steps.length > 1;
}

/** Пройденные узлы (без узла с токеном) и потоки — для подсветки следа. */
export function walkTrail(state: WalkState | null): { nodes: Set<string>; flows: Set<string> } {
  const nodes = new Set<string>();
  const flows = new Set<string>();

  if (state) {
    state.steps.forEach(step => {
      if (step.pos.type === 'node') {
        nodes.add(step.pos.id);
      }

      if (step.flowId) {
        flows.add(step.flowId);
      }
    });

    const token = tokenNodeId(state);

    if (token) {
      nodes.delete(token);
    }
  }

  return { nodes, flows };
}

/** Была ли текущая позиция раньше — авто-проход на этом останавливается (защита от цикла). */
export function visitedBefore(state: WalkState): boolean {
  const pos = currentPos(state);

  return state.steps.slice(0, -1).some(step => samePos(step.pos, pos));
}

/**
 * Откуда начинать проход по схеме: стартовые события верхнего уровня,
 * иначе узлы верхнего уровня без входящих потоков; слева направо, сверху вниз.
 */
export function walkStartNodes(graph: BpmnGraph): string[] {
  const nodes = [ ...graph.nodes.values() ]
    .filter(node => !isDataNode(node) && node.bounds && !node.parent && node.type !== 'bpmn:BoundaryEvent');
  const byPosition = (a: BpmnGraphNode, b: BpmnGraphNode) => (a.bounds!.x - b.bounds!.x) || (a.bounds!.y - b.bounds!.y);

  const starts = nodes.filter(node => node.type === 'bpmn:StartEvent' && !node.incoming.length);

  if (starts.length) {
    return starts.sort(byPosition).map(node => node.id);
  }

  return nodes
    .filter(node => !node.incoming.length && node.outgoing.length)
    .sort(byPosition)
    .map(node => node.id);
}

/**
 * Начало прохода: экран (выбранный или стартовый), иначе первый экран,
 * иначе начало схемы. null — в проекте нет ни экранов, ни узлов.
 */
export function walkStart(ctx: WalkContext, screenId: string | null): WalkPos | null {
  const screen = ctx.screens.find(s => s.id === screenId) ?? ctx.screens[0];

  if (screen) {
    return { type: 'screen', id: screen.id };
  }

  const [ first ] = walkStartNodes(ctx.graph);

  return first ? { type: 'node', id: first } : null;
}

/** Вызов backend шага (для карточки вызова). */
export function stepCall(ctx: WalkContext, step: WalkStep | null): { call: ApiCall; screenId: string } | null {
  if (!step?.call) {
    return null;
  }

  const { screenId, callId } = step.call;
  const screen = ctx.screens.find(s => s.id === screenId);
  const call = screen?.onOpenCalls.find(c => c.id === callId) ??
    screen?.hotspots.map(h => (h.action?.type === 'gateway' ? h.action.call : null)).find(c => c?.id === callId);

  return call ? { call, screenId } : null;
}

/** Длина ломаной и точка на ней по доле пути t ∈ [0, 1] — для движения токена. */
export function pointOnPolyline(points: Array<{ x: number; y: number }>, t: number): { x: number; y: number } {
  if (!points.length) {
    return { x: 0, y: 0 };
  }

  const lengths: number[] = [];
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);

    lengths.push(length);
    total += length;
  }

  if (!total) {
    return { x: points[0].x, y: points[0].y };
  }

  let rest = Math.min(1, Math.max(0, t)) * total;

  for (let i = 0; i < lengths.length; i++) {
    if (rest <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] ? Math.min(1, rest / lengths[i]) : 0;

      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * k,
        y: points[i].y + (points[i + 1].y - points[i].y) * k
      };
    }

    rest -= lengths[i];
  }

  return points[points.length - 1];
}

export function polylineLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  return total;
}
