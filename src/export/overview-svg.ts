/**
 * Общий SVG «весь флоу»: сверху экраны мобильного приложения, снизу BPMN-схема,
 * между ними — межслойные связи.
 *
 * Чистая функция от модели: на вход проект, граф схемы, SVG схемы (Document)
 * и картинки экранов как data URI. Свои id — с префиксом fmg-.
 */

import type { BpmnGraph } from '../bpmn/graph';
import { displayHeight } from '../model/geometry';
import { buildFlowOrder, sortHotspots } from '../model/flow';
import type { Project, Screen } from '../model/types';
import { stripInvalidXmlChars } from './xml-chars';

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverviewInput {
  project: Project;
  graph: BpmnGraph;
  bpmnDoc: Document;
  bpmnViewBox: ViewRect;
  /** screenId → data URI картинки */
  images: Map<string, string>;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const PAD = 40;
const LANE_TITLE = 36;
const SCREEN_LABEL = 36;
const SCREEN_GAP = 90;
const LANE_GAP = 140;
const MARKER_R = 9;

const COLOR = {
  text: '#1f2328',
  muted: '#6e7781',
  lane: '#f6f8fa',
  laneStroke: '#d0d7de',
  hotspot: '#0969da',
  navigate: '#0969da',
  gateway: '#d1470b',
  screenLink: '#1a7f37'
};

const FONT = 'Arial, Helvetica, sans-serif';

interface PlacedScreen {
  screen: Screen;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  unreachable: boolean;
}

export function buildOverviewSvg(input: OverviewInput): string {
  const { project, graph, bpmnDoc, bpmnViewBox: vb, images } = input;
  const flow = buildFlowOrder(project, graph);
  const byId = new Map(project.screens.map(screen => [ screen.id, screen ]));

  // верхняя дорожка: экраны в ряд в порядке флоу
  const topLaneY = PAD;
  const screensY = topLaneY + LANE_TITLE + SCREEN_LABEL + 40;
  const placed = new Map<string, PlacedScreen>();
  let cursorX = PAD + 20;
  let maxScreenH = 0;

  flow.forEach(item => {
    const screen = item.type === 'screen' ? byId.get(item.id) : undefined;

    if (!screen) {
      return;
    }

    const w = screen.displayWidth;
    const h = displayHeight(w, screen.asset);

    placed.set(screen.id, { screen, index: placed.size + 1, x: cursorX, y: screensY, w, h, unreachable: item.unreachable });
    cursorX += w + SCREEN_GAP;
    maxScreenH = Math.max(maxScreenH, h);
  });

  const topRowWidth = placed.size ? cursorX - SCREEN_GAP - PAD + 20 : 320;
  const topLaneH = LANE_TITLE + SCREEN_LABEL + 40 + Math.max(maxScreenH, 120) + 40;

  // нижняя дорожка: схема в натуральном масштабе
  const bottomLaneY = topLaneY + topLaneH + LANE_GAP;
  const bpmnX = PAD + 20;
  const bpmnY = bottomLaneY + LANE_TITLE + 10;
  const bpmnW = Math.max(vb.width, 1);
  const bpmnH = Math.max(vb.height, 1);
  const bottomLaneH = LANE_TITLE + 10 + bpmnH + 30;

  const width = Math.ceil(Math.max(topRowWidth, bpmnW) + 2 * PAD + 40);
  const height = Math.ceil(bottomLaneY + bottomLaneH + PAD);
  const laneW = width - 2 * PAD;

  const nodePoint = (id: string, side: 'top' | 'bottom' = 'top') => {
    const b = graph.nodes.get(id)?.bounds;

    if (!b) {
      return null;
    }

    return {
      x: bpmnX + (b.x - vb.x) + b.width / 2,
      y: bpmnY + (b.y - vb.y) + (side === 'top' ? 0 : b.height)
    };
  };

  const out: string[] = [];

  out.push(
    `<svg xmlns="${ SVG_NS }" xmlns:xlink="${ XLINK_NS }" version="1.1" ` +
    `width="${ width }" height="${ height }" viewBox="0 0 ${ width } ${ height }" font-family="${ FONT }">`
  );
  out.push(`<title>${ esc(project.meta.name || 'Флоу') }</title>`);
  out.push(
    '<defs>' +
    arrowMarker('fmg-arrow-navigate', COLOR.navigate) +
    arrowMarker('fmg-arrow-gateway', COLOR.gateway) +
    arrowMarker('fmg-arrow-screen', COLOR.screenLink) +
    '</defs>'
  );
  out.push(`<rect id="fmg-background" x="0" y="0" width="${ width }" height="${ height }" fill="#ffffff"/>`);

  // дорожки
  out.push(lane('fmg-lane-mobile', PAD, topLaneY, laneW, topLaneH, 'Мобильное приложение'));
  out.push(lane('fmg-lane-backend', PAD, bottomLaneY, laneW, bottomLaneH, 'Backend'));

  // схема
  out.push(
    `<svg id="fmg-bpmn" x="${ bpmnX }" y="${ bpmnY }" width="${ bpmnW }" height="${ bpmnH }" ` +
    `viewBox="${ vb.x } ${ vb.y } ${ bpmnW } ${ bpmnH }" overflow="visible">`
  );
  out.push(serializeChildren(bpmnDoc));
  out.push('</svg>');

  // экраны
  const navigates: string[] = [];

  placed.forEach(p => {
    const { screen } = p;
    const image = images.get(screen.id);
    const label = `${ p.index }. ${ screen.name || screen.id }${ p.unreachable ? ' (вне флоу)' : '' }`;
    const start = project.startScreenId === screen.id ? ' · Старт' : '';

    out.push(`<g id="fmg-screen-${ escAttr(screen.id) }" data-screen-id="${ escAttr(screen.id) }">`);
    out.push(`<title>${ esc([ screen.name, screen.description ].filter(Boolean).join(' — ')) }</title>`);
    out.push(text(p.x, p.y - 28, label + start, { size: 14, weight: 'bold', fill: p.unreachable ? COLOR.muted : COLOR.text }));

    if (screen.code) {
      out.push(text(p.x, p.y - 10, screen.code, { size: 11, fill: COLOR.muted }));
    }

    out.push(`<rect x="${ p.x }" y="${ p.y }" width="${ p.w }" height="${ p.h }" fill="#ffffff" stroke="${ COLOR.laneStroke }"/>`);

    if (image) {
      out.push(
        `<image x="${ p.x }" y="${ p.y }" width="${ num(p.w) }" height="${ num(p.h) }" ` +
        // один атрибут: xlink:href понимают и браузеры, и импорт Figma; второй удваивал размер файла
        `preserveAspectRatio="none" xlink:href="${ escAttr(image) }"/>`
      );
    }

    sortHotspots(screen.hotspots).forEach((hotspot, i) => {
      const r = hotspotRect(p, hotspot.rect);
      const color = hotspot.action?.type === 'gateway' ? COLOR.gateway : COLOR.hotspot;

      out.push(
        `<rect x="${ num(r.x) }" y="${ num(r.y) }" width="${ num(r.w) }" height="${ num(r.h) }" ` +
        `fill="${ color }" fill-opacity="0.12" stroke="${ color }" stroke-width="1.5" rx="3"><title>${ esc(hotspot.name || `Зона ${ i + 1 }`) }</title></rect>`
      );
      out.push(numberMarker(r.x, r.y, String(i + 1), color));

      if (hotspot.action?.type === 'navigate') {
        const target = placed.get(hotspot.action.targetScreenId);

        if (target && target !== p) {
          navigates.push(navigatePath(p, r, target));
        }
      }
    });

    out.push('</g>');
  });

  out.push(`<g id="fmg-navigate">${ navigates.join('') }</g>`);

  // межслойные связи: сначала собираем, чтобы развести концы у одного узла
  type LinkSpec = {
    kind: 'call' | 'screen';
    nodeId: string;
    /** конец у экрана (источник вызова или цель показа) */
    screenPoint: { x: number; y: number };
    title: string;
  };

  const specs: LinkSpec[] = [];

  placed.forEach(p => {
    const { screen } = p;
    const onOpen = screen.onOpenCalls;

    // вызовы при открытии разнесены вдоль нижней грани экрана, а не из одной точки
    onOpen.forEach((call, i) => {
      if (call.bpmnElementId) {
        specs.push({
          kind: 'call',
          nodeId: call.bpmnElementId,
          screenPoint: { x: p.x + (p.w * (i + 1)) / (onOpen.length + 1), y: p.y + p.h },
          title: call.name || 'Вызов при открытии'
        });
      }
    });

    sortHotspots(screen.hotspots).forEach(hotspot => {
      if (hotspot.action?.type === 'gateway' && hotspot.action.call.bpmnElementId) {
        const r = hotspotRect(p, hotspot.rect);
        const call = hotspot.action.call;

        specs.push({
          kind: 'call',
          nodeId: call.bpmnElementId!,
          screenPoint: { x: r.x + r.w / 2, y: r.y + r.h },
          title: call.name || hotspot.name
        });
      }
    });
  });

  graph.nodes.forEach(node => {
    const target = node.screenId ? placed.get(node.screenId) : undefined;

    if (target) {
      specs.push({
        kind: 'screen',
        nodeId: node.id,
        screenPoint: { x: target.x + target.w / 2 + 12, y: target.y + target.h },
        title: `${ node.name || node.id } → ${ target.screen.name }`
      });
    }
  });

  // концы у верхней грани узла: k-я связь узла сдвигается по X, чтобы номера не накладывались
  const perNode = new Map<string, number>();
  const slot = new Map<LinkSpec, number>();

  specs.forEach(spec => {
    if (nodePoint(spec.nodeId)) {
      const k = perNode.get(spec.nodeId) ?? 0;

      slot.set(spec, k);
      perNode.set(spec.nodeId, k + 1);
    }
  });

  const links: string[] = [];
  let linkNo = 0;

  specs.forEach(spec => {
    const base = nodePoint(spec.nodeId, 'top');
    const k = slot.get(spec);

    if (!base || k === undefined) {
      return;
    }

    const count = perNode.get(spec.nodeId)!;
    const width = graph.nodes.get(spec.nodeId)?.bounds?.width ?? 0;
    // шаг по ширине узла, но не уже маркера
    const step = Math.max(2 * MARKER_R + 4, count > 1 ? Math.min(28, width / count) : 0);
    const nodeEnd = { x: base.x + (k - (count - 1) / 2) * step, y: base.y };

    linkNo++;

    if (spec.kind === 'call') {
      links.push(crossLink(`fmg-call-${ linkNo }`, spec.screenPoint, nodeEnd, String(linkNo), COLOR.gateway, 'fmg-arrow-gateway', spec.title));
    } else {
      // связь уходит от верхней грани узла к нижней грани экрана
      links.push(crossLink(`fmg-screen-link-${ linkNo }`, nodeEnd, spec.screenPoint, String(linkNo), COLOR.screenLink, 'fmg-arrow-screen', spec.title));
    }
  });

  out.push(`<g id="fmg-cross-links">${ links.join('') }</g>`);
  out.push(legend(PAD + laneW - 360, bottomLaneY - LANE_GAP / 2 - 30));
  out.push('</svg>');

  return out.join('\n');
}

// фигуры ////////////////////

function hotspotRect(p: PlacedScreen, rect: { x: number; y: number; w: number; h: number }) {
  return { x: p.x + rect.x * p.w, y: p.y + rect.y * p.h, w: rect.w * p.w, h: rect.h * p.h };
}

function lane(id: string, x: number, y: number, w: number, h: number, title: string): string {
  return `<g id="${ id }">` +
    `<rect x="${ x }" y="${ y }" width="${ num(w) }" height="${ num(h) }" rx="8" fill="${ COLOR.lane }" stroke="${ COLOR.laneStroke }"/>` +
    text(x + 16, y + 24, title, { size: 16, weight: 'bold' }) +
    '</g>';
}

function numberMarker(x: number, y: number, label: string, color: string): string {
  return `<g class="fmg-marker"><circle cx="${ num(x) }" cy="${ num(y) }" r="${ MARKER_R }" fill="${ color }" stroke="#ffffff" stroke-width="1.5"/>` +
    text(x, y + 4, label, { size: 11, weight: 'bold', fill: '#ffffff', anchor: 'middle' }) + '</g>';
}

function navigatePath(from: PlacedScreen, r: { x: number; y: number; w: number; h: number }, to: PlacedScreen): string {
  const x1 = r.x + r.w;
  const y1 = r.y + r.h / 2;

  let d: string;

  if (to.x > from.x) {
    const x2 = to.x;
    const y2 = to.y + Math.min(40, to.h / 2);
    const dx = Math.max(30, (x2 - x1) / 2);

    d = `M ${ num(x1) } ${ num(y1) } C ${ num(x1 + dx) } ${ num(y1) }, ${ num(x2 - dx) } ${ num(y2) }, ${ num(x2) } ${ num(y2) }`;
  } else {
    // переход назад — дугой над рядом экранов
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const top = Math.min(from.y, to.y) - SCREEN_LABEL - 30;

    d = `M ${ num(x1) } ${ num(y1) } C ${ num(x1 + 60) } ${ num(y1) }, ${ num(x1 + 60) } ${ num(top) }, ${ num((x1 + x2) / 2) } ${ num(top) } ` +
      `S ${ num(x2) } ${ num(top) }, ${ num(x2) } ${ num(y2) }`;
  }

  return `<path d="${ d }" fill="none" stroke="${ COLOR.navigate }" stroke-width="1.8" marker-end="url(#fmg-arrow-navigate)"/>`;
}

function crossLink(
  id: string,
  a: { x: number; y: number },
  b: { x: number; y: number },
  label: string,
  color: string,
  marker: string,
  title: string
): string {
  const midY = (a.y + b.y) / 2;
  const d = `M ${ num(a.x) } ${ num(a.y) } C ${ num(a.x) } ${ num(midY) }, ${ num(b.x) } ${ num(midY) }, ${ num(b.x) } ${ num(b.y) }`;

  return `<g id="${ id }" class="fmg-cross-link"><title>${ esc(title) }</title>` +
    `<path d="${ d }" fill="none" stroke="${ color }" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#${ marker })"/>` +
    numberMarker(a.x, a.y + (b.y > a.y ? MARKER_R + 2 : -MARKER_R - 2), label, color) +
    numberMarker(b.x, b.y + (b.y > a.y ? -MARKER_R - 10 : MARKER_R + 10), label, color) +
    '</g>';
}

function legend(x: number, y: number): string {
  const item = (dx: number, color: string, dashed: boolean, label: string) =>
    `<path d="M ${ x + dx } ${ y + 10 } h 28" stroke="${ color }" stroke-width="1.8"${ dashed ? ' stroke-dasharray="6 4"' : '' }/>` +
    text(x + dx + 34, y + 14, label, { size: 11, fill: COLOR.muted });

  return `<g id="fmg-legend">${ item(0, COLOR.navigate, false, 'переход') }${ item(90, COLOR.gateway, true, 'вызов backend') }` +
    `${ item(220, COLOR.screenLink, true, 'показ экрана') }</g>`;
}

function arrowMarker(id: string, color: string): string {
  return `<marker id="${ id }" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${ color }"/></marker>`;
}

function text(
  x: number,
  y: number,
  value: string,
  { size = 12, weight, fill = COLOR.text, anchor }: { size?: number; weight?: string; fill?: string; anchor?: string } = {}
): string {
  return `<text x="${ num(x) }" y="${ num(y) }" font-size="${ size }" fill="${ fill }"` +
    `${ weight ? ` font-weight="${ weight }"` : '' }${ anchor ? ` text-anchor="${ anchor }"` : '' }>${ esc(value) }</text>`;
}

// SVG схемы ////////////////////

/** Содержимое корня SVG схемы без скриптов и обработчиков событий. */
function serializeChildren(doc: Document): string {
  const root = doc.documentElement.cloneNode(true) as Element;

  root.querySelectorAll('script, foreignObject').forEach(node => node.remove());
  root.querySelectorAll('*').forEach(node => {
    Array.from(node.attributes).forEach(attr => {
      if (/^on/i.test(attr.name)) {
        node.removeAttribute(attr.name);
      }
    });
  });

  const serializer = new XMLSerializer();

  return Array.from(root.childNodes)
    .filter(node => node.nodeType === 1)
    .map(node => stripInvalidXmlChars(serializer.serializeToString(node)))
    .join('');
}

// утилиты ////////////////////

function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function esc(value: string): string {
  return stripInvalidXmlChars(String(value ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(value: string): string {
  return esc(value).replace(/"/g, '&quot;');
}
