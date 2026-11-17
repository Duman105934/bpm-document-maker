import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import EXAMPLE from '../src/resources/example.bpmn?raw';
import { buildBpmnGraph, emptyGraph, type BpmnGraph } from '../src/bpmn/graph';
import { buildFlowOrder } from '../src/model/flow';
import { createApiCall, createProject } from '../src/model/project';
import type { Hotspot, Project } from '../src/model/types';
import { screen } from './fixtures';

function navigate(id: string, target: string, y = 0): Hotspot {
  return { id, name: id, rect: { x: 0, y, w: 0.5, h: 0.1 }, action: { type: 'navigate', targetScreenId: target } };
}

function gateway(id: string, nodeId: string, y = 0): Hotspot {
  return { id, name: id, rect: { x: 0, y, w: 0.5, h: 0.1 }, action: { type: 'gateway', call: createApiCall({ bpmnElementId: nodeId }) } };
}

/** Граф по списку рёбер «a>b»; screenOf — sm:screen у узлов. */
function graphOf(edges: string[], screenOf: Record<string, string> = {}, extra: string[] = []): BpmnGraph {
  const graph = emptyGraph();
  const node = (id: string) => {
    if (!graph.nodes.has(id)) {
      graph.nodes.set(id, {
        id, type: 'bpmn:Task', name: id, screenId: screenOf[id],
        bounds: { x: graph.nodes.size * 100, y: 0, width: 80, height: 40 },
        outgoing: [], incoming: [], dataIn: [], dataOut: [], children: [], boundary: []
      });
    }

    return graph.nodes.get(id)!;
  };

  extra.forEach(node);
  edges.forEach((edge, i) => {
    const [ a, b ] = edge.split('>');
    const id = `f${ i }`;

    node(a).outgoing.push(id);
    node(b).incoming.push(id);
    graph.flows.set(id, { id, sourceRef: a, targetRef: b });
  });

  return graph;
}

function order(project: Project, graph: BpmnGraph) {
  return buildFlowOrder(project, graph).map(item => `${ item.type === 'screen' ? 's' : 'n' }:${ item.id }${ item.unreachable ? '!' : '' }`);
}

describe('buildFlowOrder', () => {

  it('экран → вызов → узлы → Cmd → его экран; цикл не повторяется', () => {
    const project = createProject();

    project.screens = [ screen('a', [ gateway('h1', 'api') ]), screen('b', [ navigate('back', 'a') ]) ];
    project.startScreenId = 'a';

    const graph = graphOf([ 'api>cmd', 'cmd>end', 'end>api' ], { cmd: 'b' });

    expect(order(project, graph)).toEqual([ 's:a', 'n:api', 'n:cmd', 's:b', 'n:end' ]);
  });

  it('вызовы при открытии идут раньше зон, зоны — сверху вниз', () => {
    const project = createProject();
    const a = screen('a', [ gateway('low', 'n2', 0.8), gateway('high', 'n1', 0.1) ]);

    a.onOpenCalls = [ createApiCall({ bpmnElementId: 'n0' }) ];
    project.screens = [ a ];
    project.startScreenId = 'a';

    expect(order(project, graphOf([], {}, [ 'n0', 'n1', 'n2' ]))).toEqual([ 's:a', 'n:n0', 'n:n1', 'n:n2' ]);
  });

  it('ветвление обходится в глубину по порядку исходящих', () => {
    const project = createProject();

    project.screens = [ screen('a', [ gateway('h', 'gw') ]) ];
    project.startScreenId = 'a';

    const graph = graphOf([ 'gw>yes', 'gw>no', 'yes>end', 'no>end' ]);

    expect(order(project, graph)).toEqual([ 's:a', 'n:gw', 'n:yes', 'n:end', 'n:no' ]);
  });

  it('недостижимые экраны и узлы — в конце с пометкой', () => {
    const project = createProject();

    project.screens = [ screen('a', [ navigate('n', 'b') ]), screen('b'), screen('lost') ];
    project.startScreenId = 'a';

    const graph = graphOf([ 'x>y' ]);

    expect(order(project, graph)).toEqual([ 's:a', 's:b', 's:lost!', 'n:x!', 'n:y!' ]);
  });

  it('объекты данных в порядок не входят; работает на example.bpmn', async () => {
    const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(EXAMPLE);
    const graph = buildBpmnGraph(rootElement);
    const project = createProject();

    project.screens = [ screen('pay', [ gateway('h', 'Api_SendOtp') ]), screen('otp') ];
    project.startScreenId = 'pay';
    graph.nodes.get('Cmd_ShowOtp')!.screenId = 'otp';

    const ids = order(project, graph);

    expect(ids.slice(0, 4)).toEqual([ 's:pay', 'n:Api_SendOtp', 'n:Cmd_ShowOtp', 's:otp' ]);
    expect(ids.some(id => id.includes('Json_') || id.includes('Db_'))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('n:Start!');
  });
});

describe('buildFlowOrder — подпроцесс и граничные события (B2)', () => {

  it('заходит внутрь подпроцесса и идёт по граничному событию', async () => {
    const { SUBPROCESS_XML } = await import('./fixtures');
    const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(SUBPROCESS_XML);
    const graph = buildBpmnGraph(rootElement);
    const project = createProject();

    project.screens = [ screen('s', [ gateway('h', 'A') ]) ];
    project.startScreenId = 's';

    expect(order(project, graph)).toEqual([
      's:s', 'n:A', 'n:Err', 'n:E', 'n:Sub', 'n:SubStart', 'n:B', 'n:C', 'n:S!'
    ]);
  });
});
