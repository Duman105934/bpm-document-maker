/**
 * План PDF-документа: какие разделы и в каком порядке, номера страниц
 * и цели внутренних ссылок. Чистые функции, без jsPDF.
 */

import { describeNode, type BpmnGraph, type BpmnGraphNode } from '../../bpmn/graph';
import { isDataNode, type FlowItem } from '../../model/flow';
import type { Project } from '../../model/types';

export type SectionKind = 'screen' | 'node';

export interface PlanSection {
  /** ключ цели ссылки: screen:<id> или node:<id> */
  key: string;
  kind: SectionKind;
  id: string;
  /** порядковый номер в оглавлении, с 1 */
  number: number;
  title: string;
  unreachable: boolean;
}

export interface DocumentPlan {
  sections: PlanSection[];
  /** быстрый поиск: есть ли у экрана / узла своя страница */
  keys: Set<string>;
}

export interface PageAssignment {
  /** номер первой страницы раздела */
  start: Map<string, number>;
  tocPages: number;
  total: number;
}

/** Ключ цели внутренней ссылки. */
export function sectionKey(kind: SectionKind, id: string): string {
  return `${ kind }:${ id }`;
}

/**
 * Страницу получают узлы с sm:kind (кроме json и db) и развилки.
 * JSON и DB — выноски у связанной задачи.
 */
export function nodeHasPage(node: BpmnGraphNode): boolean {
  if (isDataNode(node)) {
    return false;
  }

  if (node.kind) {
    return node.kind !== 'json' && node.kind !== 'db';
  }

  return isGateway(node);
}

export function isGateway(node: BpmnGraphNode): boolean {
  return /Gateway$/.test(node.type);
}

export function planDocument(project: Project, graph: BpmnGraph, flow: FlowItem[]): DocumentPlan {
  const screens = new Map(project.screens.map(screen => [ screen.id, screen ]));
  const sections: PlanSection[] = [];

  flow.forEach(item => {
    if (item.type === 'screen') {
      const screen = screens.get(item.id);

      if (screen) {
        sections.push({
          key: sectionKey('screen', screen.id),
          kind: 'screen',
          id: screen.id,
          number: sections.length + 1,
          title: `Экран «${ screen.name || screen.id }»`,
          unreachable: item.unreachable
        });
      }

      return;
    }

    const node = graph.nodes.get(item.id);

    if (node && nodeHasPage(node)) {
      sections.push({
        key: sectionKey('node', node.id),
        kind: 'node',
        id: node.id,
        number: sections.length + 1,
        title: isGateway(node) && !node.kind ? `${ node.name || node.id } · Развилка` : describeNode(node),
        unreachable: item.unreachable
      });
    }
  });

  return { sections, keys: new Set(sections.map(section => section.key)) };
}

/** Сколько страниц займёт оглавление при данном числе строк на странице. */
export function tocPageCount(sectionCount: number, linesPerPage: number): number {
  return Math.max(1, Math.ceil(sectionCount / Math.max(1, linesPerPage)));
}

/**
 * Номера страниц: 1 — обложка, затем оглавление, затем разделы
 * (pageCounts[i] — сколько страниц занял раздел i, с продолжениями).
 */
export function assignPages(plan: DocumentPlan, pageCounts: number[], linesPerTocPage: number): PageAssignment {
  const tocPages = tocPageCount(plan.sections.length, linesPerTocPage);
  const start = new Map<string, number>();
  let page = 1 + tocPages + 1;

  plan.sections.forEach((section, index) => {
    start.set(section.key, page);
    page += Math.max(1, pageCounts[index] ?? 1);
  });

  return { start, tocPages, total: page - 1 };
}
