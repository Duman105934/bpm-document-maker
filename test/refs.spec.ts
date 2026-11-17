import { describe, it, expect } from 'vitest';

import { createProject } from '../src/model/project';
import { createApiCall } from '../src/model/project';
import { deleteHotspot, deleteScreen, findProblems, remapBpmnRef, type ProblemGraph } from '../src/model/refs';
import type { Hotspot, Project, Screen } from '../src/model/types';

function screen(id: string, hotspots: Hotspot[] = []): Screen {
  return {
    id,
    name: id,
    code: '',
    description: '',
    asset: { path: `screens/${ id }.png`, mime: 'image/png', width: 100, height: 200 },
    position: { x: 0, y: 0 },
    displayWidth: 320,
    hotspots,
    onOpenCalls: []
  };
}

function navigate(id: string, target: string): Hotspot {
  return { id, name: id, rect: { x: 0, y: 0, w: 0.5, h: 0.1 }, action: { type: 'navigate', targetScreenId: target } };
}

function sample(): Project {
  const project = createProject({ name: 'refs' });

  project.screens = [
    screen('a', [ navigate('a1', 'b'), navigate('a2', 'c') ]),
    screen('b', [ navigate('b1', 'a') ]),
    screen('c', [ navigate('c1', 'b'), { id: 'c2', name: '', rect: { x: 0, y: 0, w: 1, h: 1 }, action: null } ])
  ];
  project.startScreenId = 'a';

  return project;
}

describe('refs', () => {

  it('удаление экрана сбрасывает переходы на него у других экранов', () => {
    const project = sample();

    expect(deleteScreen(project, 'b')).toBe(true);
    expect(project.screens.map(s => s.id)).toEqual([ 'a', 'c' ]);

    const [ a, c ] = project.screens;

    expect(a.hotspots.map(h => h.action)).toEqual([ null, { type: 'navigate', targetScreenId: 'c' } ]);
    expect(c.hotspots[0].action).toBeNull();
    // зоны остаются — у них просто нет действия
    expect(c.hotspots).toHaveLength(2);
    expect(project.startScreenId).toBe('a');
  });

  it('удаление стартового экрана назначает первый оставшийся', () => {
    const project = sample();

    deleteScreen(project, 'a');
    expect(project.startScreenId).toBe('b');

    deleteScreen(project, 'b');
    deleteScreen(project, 'c');
    expect(project.startScreenId).toBeNull();
  });

  it('несуществующий экран — без изменений', () => {
    const project = sample();
    const before = structuredClone(project);

    expect(deleteScreen(project, 'zzz')).toBe(false);
    expect(project).toEqual(before);
  });

  it('удаление зоны', () => {
    const project = sample();

    expect(deleteHotspot(project, 'a', 'a2')).toBe(true);
    expect(project.screens[0].hotspots.map(h => h.id)).toEqual([ 'a1' ]);
    expect(deleteHotspot(project, 'a', 'nope')).toBe(false);
    expect(deleteHotspot(project, 'nope', 'a1')).toBe(false);
  });
});

// ссылки на узлы BPMN ////////////////////

function gateway(id: string, bpmnElementId?: string): Hotspot {
  return {
    id, name: id, rect: { x: 0, y: 0, w: 0.5, h: 0.1 },
    action: { type: 'gateway', call: createApiCall({ id: `call_${ id }`, name: id, bpmnElementId }) }
  };
}

function graphOf(nodes: Array<{ id: string; kind?: string; screenId?: string }>): ProblemGraph {
  return { nodes: new Map(nodes.map(n => [ n.id, { name: n.id, ...n } ])) };
}

describe('remapBpmnRef', () => {

  it('moves references of zones and on-open calls to the new id', () => {
    const project = createProject();
    const s = screen('s', [ gateway('g1', 'Task_1'), gateway('g2', 'Task_2') ]);

    s.onOpenCalls = [ createApiCall({ bpmnElementId: 'Task_1' }) ];
    project.screens = [ s ];

    expect(remapBpmnRef(project, 'Task_1', 'Task_9')).toBe(2);

    const [ g1, g2 ] = project.screens[0].hotspots;

    expect(g1.action?.type === 'gateway' && g1.action.call.bpmnElementId).toBe('Task_9');
    expect(g2.action?.type === 'gateway' && g2.action.call.bpmnElementId).toBe('Task_2');
    expect(project.screens[0].onOpenCalls[0].bpmnElementId).toBe('Task_9');

    // обратный ремап (undo смены вида) возвращает ссылку
    expect(remapBpmnRef(project, 'Task_9', 'Task_1')).toBe(2);
    expect(project.screens[0].onOpenCalls[0].bpmnElementId).toBe('Task_1');
  });

  it('ignores same or empty ids', () => {
    const project = createProject();

    project.screens = [ screen('s', [ gateway('g1', 'Task_1') ]) ];

    expect(remapBpmnRef(project, 'Task_1', 'Task_1')).toBe(0);
    expect(remapBpmnRef(project, '', 'Task_2')).toBe(0);
  });
});

describe('findProblems', () => {

  it('reports nothing for a consistent project', () => {
    const project = createProject();

    project.screens = [ screen('a', [ navigate('a1', 'b') ]), screen('b', [ gateway('b1', 'Cmd_1') ]) ];
    project.startScreenId = 'a';

    expect(findProblems(project, graphOf([ { id: 'Cmd_1', kind: 'cmd', screenId: 'a' } ]))).toEqual([]);
  });

  it('reports broken and incomplete links', () => {
    const project = createProject();
    const a = screen('a', [
      { id: 'none', name: 'none', rect: { x: 0, y: 0, w: 0.1, h: 0.1 }, action: null },
      navigate('nav', 'deleted'),
      gateway('noNode'),
      gateway('lostNode', 'Gone_1')
    ]);

    a.onOpenCalls = [ createApiCall({ id: 'call_open', bpmnElementId: 'Gone_2' }) ];
    project.screens = [ a ];
    project.startScreenId = null;

    const problems = findProblems(project, graphOf([
      { id: 'Cmd_noScreen', kind: 'cmd' },
      { id: 'Mob_lost', kind: 'mobile', screenId: 'scr_deleted' },
      { id: 'Api_1', kind: 'api' }
    ]));

    const keys = problems.map(p => p.id).sort();

    expect(keys).toEqual([
      'error:call-missing:call_lostNode',
      'error:call-missing:call_open',
      'error:hs-nav:nav',
      'error:node-screen:Mob_lost',
      'error:start',
      'warning:call-node:call_noNode',
      'warning:cmd-screen:Cmd_noScreen',
      'warning:hs-none:none'
    ]);

    expect(problems.find(p => p.id === 'error:call-missing:call_open')!.target)
      .toEqual({ type: 'call', screenId: 'a', callId: 'call_open' });
    expect(problems.find(p => p.id === 'error:node-screen:Mob_lost')!.target)
      .toEqual({ type: 'bpmn', elementId: 'Mob_lost' });
  });

  it('does not require a start screen in an empty project', () => {
    expect(findProblems(createProject(), graphOf([]))).toEqual([]);
  });
});
