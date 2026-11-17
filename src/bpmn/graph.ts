/**
 * Граф BPMN-схемы из moddle (definitions) и DI-координат.
 *
 * Не зависит от DOM и модельера: работает и на результате BpmnModdle.fromXML
 * (тесты, экспорт), и на modeler.getDefinitions().
 */

import { KINDS } from '../modeler/sm/kinds.js';
import { getKind, getScreenId } from '../modeler/sm/util.js';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BpmnGraphNode {
  id: string;
  /** BPMN-тип, например bpmn:Task */
  type: string;
  /** вид sm (cmd, api, …), если задан */
  kind?: string;
  name: string;
  /** sm:screen у Cmd / Mobile */
  screenId?: string;
  /** null — у элемента нет фигуры на диаграмме */
  bounds: Bounds | null;
  /** id исходящих / входящих sequenceFlow */
  outgoing: string[];
  incoming: string[];
  /** id объектов и хранилищ данных: вход (dataInputAssociation) и выход (dataOutputAssociation) */
  dataIn: string[];
  dataOut: string[];
  /** подпроцесс, в котором лежит узел (нет — верхний уровень) */
  parent?: string;
  /** узлы подпроцесса (непосредственные дети) */
  children: string[];
  /** граничные события, прикреплённые к узлу (attachedToRef) */
  boundary: string[];
}

export interface BpmnGraphFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
  name?: string;
  /** sm:trigger */
  trigger?: string;
}

export interface BpmnGraph {
  nodes: Map<string, BpmnGraphNode>;
  flows: Map<string, BpmnGraphFlow>;
}

type Moddle = any;

export function emptyGraph(): BpmnGraph {
  return { nodes: new Map(), flows: new Map() };
}

export function buildBpmnGraph(definitions: Moddle | null | undefined): BpmnGraph {
  const graph = emptyGraph();

  if (!definitions) {
    return graph;
  }

  const bounds = collectBounds(definitions);
  const containers: Moddle[] = [];

  (definitions.get('rootElements') || []).forEach((root: Moddle) => {
    if (isType(root, 'bpmn:Process')) {
      containers.push(root);
    }
  });

  containers.forEach(container => visitContainer(container, graph, bounds, undefined));

  graph.nodes.forEach((node: BuildNode) => {
    if (node.attachedTo) {
      graph.nodes.get(node.attachedTo)?.boundary.push(node.id);
    }

    delete node.attachedTo;
  });

  // входящие и исходящие — из самих потоков, это надёжнее ссылок узлов
  graph.flows.forEach(flow => {
    graph.nodes.get(flow.sourceRef)?.outgoing.push(flow.id);
    graph.nodes.get(flow.targetRef)?.incoming.push(flow.id);
  });

  return graph;
}

type BuildNode = BpmnGraphNode & { attachedTo?: string };

function visitContainer(container: Moddle, graph: BpmnGraph, bounds: Map<string, Bounds>, parent: string | undefined) {
  (container.get('flowElements') || []).forEach((element: Moddle) => {
    if (isType(element, 'bpmn:SequenceFlow')) {
      const sourceRef = element.get('sourceRef')?.id;
      const targetRef = element.get('targetRef')?.id;

      if (sourceRef && targetRef) {
        graph.flows.set(element.id, {
          id: element.id,
          sourceRef,
          targetRef,
          name: element.get('name') || undefined,
          trigger: element.get('sm:trigger') || undefined
        });
      }

      return;
    }

    if (!isNodeType(element)) {
      return;
    }

    const node: BuildNode = {
      id: element.id,
      type: element.$type,
      kind: getKind(element),
      name: element.get('name') || '',
      screenId: getScreenId(element),
      bounds: bounds.get(element.id) || null,
      outgoing: [],
      incoming: [],
      dataIn: refIds(element.get('dataInputAssociations'), association => association.get('sourceRef')),
      dataOut: refIds(element.get('dataOutputAssociations'), association => association.get('targetRef')),
      parent,
      children: [],
      boundary: [],
      attachedTo: isType(element, 'bpmn:BoundaryEvent') ? element.get('attachedToRef')?.id : undefined
    };

    graph.nodes.set(element.id, node);

    if (parent) {
      graph.nodes.get(parent)?.children.push(element.id);
    }

    if (isType(element, 'bpmn:SubProcess')) {
      visitContainer(element, graph, bounds, element.id);
    }
  });
}

function refIds(associations: Moddle[] | undefined, pick: (association: Moddle) => Moddle | Moddle[]): string[] {
  const ids: string[] = [];

  (associations || []).forEach(association => {
    const refs = pick(association);

    (Array.isArray(refs) ? refs : [ refs ]).forEach(ref => {
      if (ref?.id && !ids.includes(ref.id)) {
        ids.push(ref.id);
      }
    });
  });

  return ids;
}

/**
 * Координаты с корневой плоскости — той, что экспортируется (Process или Collaboration).
 * У узлов свёрнутых подпроцессов своя плоскость со своими координатами — для них bounds нет.
 */
function collectBounds(definitions: Moddle): Map<string, Bounds> {
  const result = new Map<string, Bounds>();
  const diagrams: Moddle[] = definitions.get('diagrams') || [];
  const root = diagrams.find(diagram => {
    const element = diagram.get('plane')?.get('bpmnElement');

    return isType(element, 'bpmn:Process') || isType(element, 'bpmn:Collaboration');
  }) || diagrams[0];

  (root?.get('plane')?.get('planeElement') || []).forEach((di: Moddle) => {
    const element = di.get('bpmnElement');
    const b = di.get('bounds');

    if (element?.id && b && !result.has(element.id)) {
      result.set(element.id, { x: b.x, y: b.y, width: b.width, height: b.height });
    }
  });

  return result;
}

function isType(element: Moddle, type: string): boolean {
  return !!element && typeof element.$instanceOf === 'function' && element.$instanceOf(type);
}

function isNodeType(element: Moddle): boolean {
  return isType(element, 'bpmn:FlowNode') ||
    isType(element, 'bpmn:DataObjectReference') ||
    isType(element, 'bpmn:DataStoreReference');
}

/** Подпись узла для списков: «Название · Cmd». */
export function describeNode(node: BpmnGraphNode): string {
  const kind = node.kind ? (KINDS as Record<string, { title: string }>)[node.kind]?.title : undefined;

  return `${ node.name || node.id } · ${ kind || node.type.replace('bpmn:', '') }`;
}
