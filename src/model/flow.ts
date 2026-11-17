/**
 * Порядок флоу для документов (общий SVG, PDF).
 *
 * Обход в глубину от стартового экрана:
 * экран → вызовы при открытии и gateway-зоны (сверху вниз) → узлы схемы
 * по sequenceFlow (сначала внутрь подпроцесса и по граничным событиям) → Cmd/Mobile с экраном → этот экран; затем экраны,
 * на которые ведут переходы navigate. Посещённое не повторяется,
 * недостижимые экраны и узлы уходят в конец с пометкой unreachable.
 */

import type { BpmnGraph, BpmnGraphNode } from '../bpmn/graph';
import type { ApiCall, Hotspot, Project, Screen } from './types';

export type FlowItem =
  | { type: 'screen'; id: string; unreachable: boolean }
  | { type: 'node'; id: string; unreachable: boolean };

/** Объекты и хранилища данных не участвуют в потоке — они выноски своих задач. */
export function isDataNode(node: BpmnGraphNode): boolean {
  return node.type === 'bpmn:DataObjectReference' || node.type === 'bpmn:DataStoreReference';
}

/** Зоны экрана сверху вниз, при равном верхе — слева направо. */
export function sortHotspots(hotspots: Hotspot[]): Hotspot[] {
  return [ ...hotspots ].sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x));
}

/** Вызовы экрана в порядке документа: сначала при открытии, затем зоны сверху вниз. */
export function screenCalls(screen: Screen): Array<{ call: ApiCall; hotspot?: Hotspot }> {
  const result: Array<{ call: ApiCall; hotspot?: Hotspot }> = screen.onOpenCalls.map(call => ({ call }));

  sortHotspots(screen.hotspots).forEach(hotspot => {
    if (hotspot.action?.type === 'gateway') {
      result.push({ call: hotspot.action.call, hotspot });
    }
  });

  return result;
}

export function buildFlowOrder(project: Project, graph: BpmnGraph): FlowItem[] {
  const screens = new Map(project.screens.map(screen => [ screen.id, screen ]));
  const items: FlowItem[] = [];
  const seenScreens = new Set<string>();
  const seenNodes = new Set<string>();
  let unreachable = false;

  const visitScreen = (id: string) => {
    const screen = screens.get(id);

    if (!screen || seenScreens.has(id)) {
      return;
    }

    seenScreens.add(id);
    items.push({ type: 'screen', id, unreachable });

    screenCalls(screen).forEach(({ call }) => {
      if (call.bpmnElementId) {
        visitNode(call.bpmnElementId);
      }
    });

    sortHotspots(screen.hotspots).forEach(hotspot => {
      if (hotspot.action?.type === 'navigate') {
        visitScreen(hotspot.action.targetScreenId);
      }
    });
  };

  const visitNode = (id: string) => {
    const node = graph.nodes.get(id);

    if (!node || isDataNode(node) || seenNodes.has(id)) {
      return;
    }

    seenNodes.add(id);
    items.push({ type: 'node', id, unreachable });

    if (node.screenId) {
      visitScreen(node.screenId);
    }

    // внутрь подпроцесса, затем исключительные ветки — до исходящих потоков
    subProcessStarts(graph, node).forEach(visitNode);
    node.boundary.forEach(visitNode);

    node.outgoing.forEach(flowId => {
      const flow = graph.flows.get(flowId);

      if (flow) {
        visitNode(flow.targetRef);
      }
    });
  };

  if (project.startScreenId) {
    visitScreen(project.startScreenId);
  }

  unreachable = true;

  project.screens.forEach(screen => visitScreen(screen.id));

  // оставшиеся узлы — слева направо, сверху вниз; сначала те, у кого нет входящих
  [ ...graph.nodes.values() ]
    .filter(node => !isDataNode(node) && !seenNodes.has(node.id))
    .sort((a, b) => (a.incoming.length ? 1 : 0) - (b.incoming.length ? 1 : 0) || byPosition(a, b))
    .forEach(node => visitNode(node.id));

  return items;
}

/** Вход в подпроцесс: его узлы без входящих потоков (граничные события — не вход). */
export function subProcessStarts(graph: BpmnGraph, node: BpmnGraphNode): string[] {
  return node.children.filter(id => {
    const child = graph.nodes.get(id);

    return !!child && !isDataNode(child) && !child.incoming.length && child.type !== 'bpmn:BoundaryEvent';
  });
}

function byPosition(a: BpmnGraphNode, b: BpmnGraphNode): number {
  const ax = a.bounds?.x ?? Infinity;
  const bx = b.bounds?.x ?? Infinity;

  return (ax - bx) || ((a.bounds?.y ?? 0) - (b.bounds?.y ?? 0));
}
