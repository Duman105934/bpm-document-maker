import { describe, it, expect } from 'vitest';

import { emptyGraph, type BpmnGraph } from '../src/bpmn/graph';
import { anchorInCrop, computeCrop, intersects, pruneSvg } from '../src/export/bpmn-fragment';

function graph(): BpmnGraph {
  const g = emptyGraph();
  const add = (id: string, x: number, y: number, extra = {}) => g.nodes.set(id, {
    id, type: 'bpmn:Task', name: id, bounds: { x, y, width: 100, height: 80 },
    outgoing: [], incoming: [], dataIn: [], dataOut: [], children: [], boundary: [], ...extra
  });

  add('a', 0, 0);
  add('b', 200, 0);
  add('c', 400, 0);
  add('far', 3000, 0);
  add('json', 200, -200);
  g.nodes.get('b')!.dataIn.push('json');
  g.flows.set('f1', { id: 'f1', sourceRef: 'a', targetRef: 'b' });
  g.flows.set('f2', { id: 'f2', sourceRef: 'b', targetRef: 'c' });
  g.flows.set('f3', { id: 'f3', sourceRef: 'c', targetRef: 'far' });
  g.nodes.get('a')!.outgoing.push('f1');
  g.nodes.get('b')!.incoming.push('f1');
  g.nodes.get('b')!.outgoing.push('f2');
  g.nodes.get('c')!.incoming.push('f2');
  g.nodes.get('c')!.outgoing.push('f3');

  return g;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -200 3100 280">
  ${ [ 'a', 'b', 'c', 'far', 'json', 'f1', 'f2', 'f3', 'Assoc_1' ].map(id =>
    `<g class="djs-group"><g class="djs-element" data-element-id="${ id }"><rect/></g></g>`).join('') }
  <g class="djs-group"><g class="djs-element" data-element-id="far_label"><text>far</text></g></g>
</svg>`;

describe('bpmn-fragment', () => {

  it('область: узел, соседи и данные, с нужным соотношением сторон', () => {
    const crop = computeCrop(graph(), 'b', 1.5)!;

    expect(crop.width / crop.height).toBeCloseTo(1.5);
    [ 'a', 'b', 'c', 'json' ].forEach(id => expect(intersects(graph().nodes.get(id)!.bounds!, crop)).toBe(true));
    expect(intersects(graph().nodes.get('far')!.bounds!, crop)).toBe(false);
  });

  it('нет фигуры — нет области', () => {
    const g = graph();

    g.nodes.get('a')!.bounds = null;
    expect(computeCrop(g, 'a', 1)).toBeNull();
    expect(computeCrop(g, 'missing', 1)).toBeNull();
  });

  it('pruneSvg удаляет элементы вне области и ставит viewBox', () => {
    const g = graph();
    const crop = computeCrop(g, 'b', 1.5)!;
    const doc = new DOMParser().parseFromString(SVG, 'image/svg+xml');
    const pruned = pruneSvg(doc, g, crop);
    const ids = Array.from(pruned.querySelectorAll('[data-element-id]')).map(n => n.getAttribute('data-element-id'));

    expect(ids).toEqual([ 'a', 'b', 'c', 'json', 'f1', 'f2', 'f3', 'Assoc_1' ]);
    expect(pruned.documentElement.getAttribute('viewBox')).toBe(`${ crop.x } ${ crop.y } ${ crop.width } ${ crop.height }`);
    // исходный документ не тронут
    expect(doc.querySelectorAll('[data-element-id]')).toHaveLength(10);
  });

  it('anchorInCrop — центр узла в долях, вне области — null', () => {
    const g = graph();
    const crop = { x: 0, y: 0, width: 400, height: 160 };

    expect(anchorInCrop(g.nodes.get('b')!.bounds, crop)).toEqual({ x: 0.625, y: 0.25 });
    expect(anchorInCrop(g.nodes.get('far')!.bounds, crop)).toBeNull();
  });
});

describe('bpmn-fragment — масштаб и подписи', () => {

  it('далёкий сосед не уменьшает масштаб ниже порога (B8)', () => {
    const g = graph();
    const max = { width: 500, height: 830 };

    // c и far соседи: far в 3000 px не помещается в max
    const crop = computeCrop(g, 'c', 302 / 501, max)!;

    expect(crop.width).toBeLessThanOrEqual(max.width);
    expect(intersects(g.nodes.get('b')!.bounds!, crop)).toBe(true);
    expect(intersects(g.nodes.get('far')!.bounds!, crop)).toBe(false);

    // без ограничения — включается и далёкий сосед
    expect(intersects(g.nodes.get('far')!.bounds!, computeCrop(g, 'c', 302 / 501)!)).toBe(true);
  });

  it('id, оканчивающийся на _label, ищется сначала целиком (B11)', () => {
    const g = graph();

    g.nodes.set('Task_label', { ...g.nodes.get('b')!, id: 'Task_label' });
    g.nodes.set('Task', { ...g.nodes.get('far')!, id: 'Task' });
    g.nodes.set('far_label', { ...g.nodes.get('far')!, id: 'far_label' });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${ [ 'Task_label', 'far_label' ]
      .map(id => `<g class="djs-group"><g data-element-id="${ id }"><rect/></g></g>`).join('') }</svg>`;
    const pruned = pruneSvg(new DOMParser().parseFromString(svg, 'image/svg+xml'), g, computeCrop(g, 'b', 1.5)!);
    const ids = Array.from(pruned.querySelectorAll('[data-element-id]')).map(n => n.getAttribute('data-element-id'));

    expect(ids).toEqual([ 'Task_label' ]);
  });
});
