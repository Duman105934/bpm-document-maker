/**
 * Содержимое выносок PDF: для страницы экрана и для страницы узла схемы.
 * Чистые функции от модели; размеры и переносы считает layout.ts.
 */

import type { BpmnGraph, BpmnGraphNode } from '../../bpmn/graph';
import { sortHotspots } from '../../model/flow';
import type { ApiCall, Project, Screen } from '../../model/types';
import { isGateway, sectionKey, type DocumentPlan } from './plan';

export type TextStyle = 'text' | 'muted' | 'label';

export type Block =
  | { kind: 'text'; text: string; style?: TextStyle }
  | { kind: 'mono'; text: string; json?: boolean }
  /** target — ключ раздела (внутренняя ссылка), url — внешняя ссылка */
  | { kind: 'link'; text: string; target?: string; url?: string };

export interface Point {
  x: number;
  y: number;
}

export interface Callout {
  id: string;
  /** точка привязки в долях 0..1 от картинки; null — выноска без линии */
  anchor: Point | null;
  /** колонка; если не задана — по anchor.x */
  side?: 'left' | 'right';
  /** номер на маркере зоны */
  marker?: string;
  title: string;
  blocks: Block[];
}

/** Описание узла (результат collectElementDoc) — только используемые поля. */
export interface NodeDoc {
  kind?: string;
  title: string;
  name: string;
  summary: string;
  documentation: string;
  fields: Array<{ key: string; label: string; value: string }>;
  parameters: Array<{ name: string; direction: 'in' | 'out'; type: string; required: boolean; description: string }>;
  json: Array<{ id: string; name: string; direction: string; body: string; error: string | null }>;
  columns: Array<{ id: string; table: string; name: string; columns: Array<{ name: string; type: string; primaryKey: boolean; nullable: boolean; description: string }> }>;
  links: Array<{ title: string; href: string }>;
  screen?: { id: string; name?: string; code?: string; missing: boolean };
}

// экран ////////////////////

export function screenCallouts(screen: Screen, project: Project, graph: BpmnGraph, plan: DocumentPlan): Callout[] {
  const screens = new Map(project.screens.map(s => [ s.id, s ]));
  const result: Callout[] = [];

  sortHotspots(screen.hotspots).forEach((hotspot, index) => {
    const { rect, action } = hotspot;
    const marker = String(index + 1);
    const base = {
      id: hotspot.id,
      anchor: { x: rect.x, y: rect.y },
      side: (rect.x + rect.w / 2 < 0.5 ? 'left' : 'right') as 'left' | 'right',
      marker,
      title: `${ marker }. ${ hotspot.name || 'Зона' }`
    };

    if (!action) {
      result.push({ ...base, blocks: [ { kind: 'text', text: 'Действие не задано', style: 'muted' } ] });

      return;
    }

    if (action.type === 'navigate') {
      const target = screens.get(action.targetScreenId);
      const key = sectionKey('screen', action.targetScreenId);

      result.push({
        ...base,
        blocks: [ target
          ? { kind: 'link', text: `-> экран «${ target.name || target.id }»`, target: plan.keys.has(key) ? key : undefined }
          : { kind: 'text', text: `-> экран не найден (${ action.targetScreenId })`, style: 'muted' } ]
      });

      return;
    }

    result.push({ ...base, blocks: callBlocks(action.call, graph, plan) });
  });

  screen.onOpenCalls.forEach((call, index) => {
    result.push({
      id: call.id,
      anchor: null,
      side: 'left',
      title: `При открытии экрана${ screen.onOpenCalls.length > 1 ? ` (${ index + 1 })` : '' }`,
      blocks: callBlocks(call, graph, plan)
    });
  });

  return result;
}

/** Описание вызова через gateway. */
export function callBlocks(call: ApiCall, graph: BpmnGraph, plan: DocumentPlan): Block[] {
  const blocks: Block[] = [];

  if (call.name) {
    blocks.push({ kind: 'text', text: call.name, style: 'label' });
  }

  if (call.gatewayUrl || call.method) {
    blocks.push({ kind: 'mono', text: `${ call.method } ${ call.gatewayUrl || '—' }` });
  }

  if (call.service || call.serviceUrl) {
    blocks.push({ kind: 'text', text: `роутинг: ${ call.service || '—' } -> ${ call.serviceUrl || '—' }` });
  }

  if (call.description) {
    blocks.push({ kind: 'text', text: call.description, style: 'muted' });
  }

  if (call.requestJson.trim()) {
    blocks.push({ kind: 'text', text: 'Запрос:', style: 'label' });
    blocks.push({ kind: 'mono', text: call.requestJson, json: true });
  }

  if (call.responseJson.trim()) {
    blocks.push({ kind: 'text', text: 'Ответ:', style: 'label' });
    blocks.push({ kind: 'mono', text: call.responseJson, json: true });
  }

  if (call.bpmnElementId) {
    const node = graph.nodes.get(call.bpmnElementId);
    const key = sectionKey('node', call.bpmnElementId);

    blocks.push(node
      ? { kind: 'link', text: `-> узел «${ node.name || node.id }»`, target: plan.keys.has(key) ? key : undefined }
      : { kind: 'text', text: `-> узел не найден на схеме (${ call.bpmnElementId })`, style: 'muted' });
  }

  return blocks;
}

// узел ////////////////////

/**
 * Выноски страницы узла. anchorOf(id) — точка элемента схемы во фрагменте
 * (доли 0..1) или null, если элемента во фрагменте нет.
 */
export function nodeCallouts(
  node: BpmnGraphNode,
  doc: NodeDoc,
  graph: BpmnGraph,
  plan: DocumentPlan,
  anchorOf: (id: string) => Point | null
): Callout[] {
  const anchor = anchorOf(node.id);
  const result: Callout[] = [];
  const main: Block[] = [];

  if (doc.summary) {
    main.push({ kind: 'text', text: doc.summary });
  }

  if (doc.documentation && doc.documentation !== doc.summary) {
    main.push({ kind: 'text', text: doc.documentation, style: 'muted' });
  }

  doc.fields.forEach(field => {
    main.push({ kind: 'text', text: `${ field.label }: ${ field.value }` });
  });

  if (doc.screen) {
    const key = sectionKey('screen', doc.screen.id);

    main.push(doc.screen.missing
      ? { kind: 'text', text: `-> экран удалён (${ doc.screen.id })`, style: 'muted' }
      : { kind: 'link', text: `-> экран «${ doc.screen.name || doc.screen.id }»`, target: plan.keys.has(key) ? key : undefined });
  }

  if (isGateway(node)) {
    node.outgoing.forEach(flowId => {
      const flow = graph.flows.get(flowId);
      const target = flow && graph.nodes.get(flow.targetRef);

      if (!flow || !target) {
        return;
      }

      const key = sectionKey('node', target.id);
      const label = [ flow.name, flow.trigger && `[${ flow.trigger }]` ].filter(Boolean).join(' ') || 'без условия';

      main.push({
        kind: 'link',
        text: `${ label } -> «${ target.name || target.id }»`,
        target: plan.keys.has(key) ? key : undefined
      });
    });
  }

  if (!main.length) {
    main.push({ kind: 'text', text: 'Описание не заполнено', style: 'muted' });
  }

  result.push({
    id: `${ node.id }:main`,
    anchor,
    side: 'left',
    title: `${ doc.title }: ${ doc.name || node.id }`,
    blocks: main
  });

  if (doc.parameters.length) {
    result.push({
      id: `${ node.id }:params`,
      anchor,
      side: 'left',
      title: 'Параметры',
      blocks: doc.parameters.map(p => ({
        kind: 'text' as const,
        text: `${ p.direction === 'out' ? 'выход' : 'вход' } · ${ p.name }${ p.type ? `: ${ p.type }` : '' }` +
          `${ p.required ? ' (обяз.)' : '' }${ p.description ? ` — ${ p.description }` : '' }`
      }))
    });
  }

  doc.json.forEach(json => {
    const blocks: Block[] = [ { kind: 'mono', text: json.body, json: true } ];

    if (json.error) {
      blocks.unshift({ kind: 'text', text: `Некорректный JSON: ${ json.error }`, style: 'muted' });
    }

    result.push({
      id: `${ node.id }:json:${ json.id }`,
      anchor: anchorOf(json.id) ?? anchor,
      side: 'right',
      title: `JSON${ json.name ? `: ${ json.name }` : '' }${ json.direction ? ` (${ json.direction })` : '' }`,
      blocks
    });
  });

  doc.columns.forEach(table => {
    result.push({
      id: `${ node.id }:db:${ table.id }`,
      anchor: anchorOf(table.id) ?? anchor,
      side: 'right',
      title: `Таблица ${ table.table || table.name || table.id }`,
      blocks: table.columns.map(c => ({
        kind: 'mono' as const,
        text: `${ c.name } ${ c.type }${ c.primaryKey ? ' PK' : '' }${ c.nullable ? ' NULL' : '' }` +
          `${ c.description ? ` — ${ c.description }` : '' }`
      }))
    });
  });

  if (doc.links.length) {
    result.push({
      id: `${ node.id }:links`,
      anchor,
      side: 'left',
      title: 'Ссылки',
      blocks: doc.links.map(link => ({ kind: 'link' as const, text: link.title || link.href, url: link.href }))
    });
  }

  return result;
}
