/**
 * Ссылки внутри проекта: каскад при удалении экранов и зон,
 * ссылки на узлы BPMN (ремап id) и вычисление битых ссылок.
 * Функции меняют переданный проект на месте — их вызывают из
 * projectStore.updateProject, где он уже скопирован.
 */

import type { ApiCall, Hotspot, Project, Screen } from './types';

/**
 * Удалить экран. Зоны других экранов с переходом на него остаются,
 * но теряют действие; стартовым становится первый оставшийся экран.
 * @returns false, если экрана нет
 */
export function deleteScreen(project: Project, screenId: string): boolean {
  const index = project.screens.findIndex(s => s.id === screenId);

  if (index === -1) {
    return false;
  }

  project.screens.splice(index, 1);

  project.screens.forEach(screen => {
    screen.hotspots.forEach(hotspot => {
      if (hotspot.action?.type === 'navigate' && hotspot.action.targetScreenId === screenId) {
        hotspot.action = null;
      }
    });
  });

  if (project.startScreenId === screenId) {
    project.startScreenId = project.screens[0]?.id ?? null;
  }

  return true;
}

/** @returns false, если экрана или зоны нет */
export function deleteHotspot(project: Project, screenId: string, hotspotId: string): boolean {
  const screen = project.screens.find(s => s.id === screenId);
  const index = screen ? screen.hotspots.findIndex(h => h.id === hotspotId) : -1;

  if (!screen || index === -1) {
    return false;
  }

  screen.hotspots.splice(index, 1);

  return true;
}

// ссылки на узлы BPMN ////////////////////

/** Все вызовы backend проекта: в gateway-зонах и при открытии экранов. */
export function forEachApiCall(project: Project, visit: (call: ApiCall, screen: Screen, hotspot?: Hotspot) => void) {
  project.screens.forEach(screen => {
    screen.hotspots.forEach(hotspot => {
      if (hotspot.action?.type === 'gateway') {
        visit(hotspot.action.call, screen, hotspot);
      }
    });

    screen.onOpenCalls.forEach(call => visit(call, screen));
  });
}

/**
 * id узла схемы изменился (смена вида, правка ID) — перенести ссылки вызовов.
 * @returns число перенесённых ссылок
 */
export function remapBpmnRef(project: Project, oldId: string, newId: string): number {
  let count = 0;

  if (!oldId || !newId || oldId === newId) {
    return 0;
  }

  forEachApiCall(project, call => {
    if (call.bpmnElementId === oldId) {
      call.bpmnElementId = newId;
      count++;
    }
  });

  return count;
}

/** Есть ли в проекте ссылки на узел. */
export function hasBpmnRef(project: Project, elementId: string): boolean {
  let found = false;

  forEachApiCall(project, call => {
    found = found || call.bpmnElementId === elementId;
  });

  return found;
}

// проблемы ////////////////////

export type ProblemTarget =
  | { type: 'project' }
  | { type: 'screen'; screenId: string }
  | { type: 'hotspot'; screenId: string; hotspotId: string }
  | { type: 'call'; screenId: string; callId: string }
  | { type: 'bpmn'; elementId: string };

export interface Problem {
  id: string;
  level: 'error' | 'warning';
  message: string;
  target: ProblemTarget;
}

/** Минимум графа схемы, который нужен для проверки ссылок. */
export interface ProblemGraph {
  nodes: Map<string, { id: string; name: string; kind?: string; screenId?: string }>;
}

/**
 * Битые и неполные ссылки между прототипом и схемой.
 * Вычисляется на лету: при удалении узла или экрана ссылки не стираются.
 */
export function findProblems(project: Project, graph: ProblemGraph): Problem[] {
  const problems: Problem[] = [];
  const screenIds = new Set(project.screens.map(s => s.id));
  const screenLabel = (screen: Screen) => `«${ screen.name || 'Без названия' }»`;

  const add = (level: Problem['level'], message: string, target: ProblemTarget, key: string) => {
    problems.push({ id: `${ level }:${ key }`, level, message, target });
  };

  if (project.screens.length && (!project.startScreenId || !screenIds.has(project.startScreenId))) {
    add('error', 'Не задан стартовый экран', { type: 'project' }, 'start');
  }

  const checkCall = (call: ApiCall, label: string, target: ProblemTarget) => {
    if (!call.bpmnElementId) {
      add('warning', `${ label }: не выбран узел BPMN`, target, `call-node:${ call.id }`);
    } else if (!graph.nodes.has(call.bpmnElementId)) {
      add('error', `${ label }: узел ${ call.bpmnElementId } не найден на схеме`, target, `call-missing:${ call.id }`);
    }
  };

  project.screens.forEach(screen => {
    screen.hotspots.forEach((hotspot, index) => {
      const target: ProblemTarget = { type: 'hotspot', screenId: screen.id, hotspotId: hotspot.id };
      const label = `${ screenLabel(screen) }, зона ${ index + 1 } «${ hotspot.name || 'Без названия' }»`;
      const action = hotspot.action;

      if (!action) {
        add('warning', `${ label }: нет действия`, target, `hs-none:${ hotspot.id }`);
      } else if (action.type === 'navigate' && !screenIds.has(action.targetScreenId)) {
        add('error', `${ label }: переход на несуществующий экран`, target, `hs-nav:${ hotspot.id }`);
      } else if (action.type === 'gateway') {
        checkCall(action.call, `${ label }, вызов «${ action.call.name || 'без названия' }»`, target);
      }
    });

    screen.onOpenCalls.forEach(call => {
      checkCall(
        call,
        `${ screenLabel(screen) }, вызов при открытии «${ call.name || 'без названия' }»`,
        { type: 'call', screenId: screen.id, callId: call.id }
      );
    });
  });

  graph.nodes.forEach(node => {
    const label = `Узел «${ node.name || node.id }»`;
    const target: ProblemTarget = { type: 'bpmn', elementId: node.id };

    if (node.screenId && !screenIds.has(node.screenId)) {
      add('error', `${ label }: экран прототипа ${ node.screenId } не найден`, target, `node-screen:${ node.id }`);
    } else if (node.kind === 'cmd' && !node.screenId) {
      add('warning', `${ label } (Cmd): не выбран экран прототипа`, target, `cmd-screen:${ node.id }`);
    }
  });

  return problems;
}
