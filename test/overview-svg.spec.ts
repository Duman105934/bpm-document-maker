import { describe, it, expect } from 'vitest';

import { emptyGraph } from '../src/bpmn/graph';
import { buildOverviewSvg } from '../src/export/overview-svg';
import { createApiCall, createProject } from '../src/model/project';
import type { Project } from '../src/model/types';
import { screen } from './fixtures';

const BPMN_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- created with bpmn-js -->
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="100 50 300 100">
  <defs><marker id="sequenceflow-end"><path d="M 0 0"/></marker></defs>
  <g class="djs-element" data-element-id="Cmd_1" onclick="alert(1)"><rect width="100" height="80"/></g>
  <script>alert(2)</script>
</svg>`;

function input(project: Project) {
  const graph = emptyGraph();

  graph.nodes.set('Cmd_1', {
    id: 'Cmd_1', type: 'bpmn:Task', kind: 'cmd', name: 'Показать', screenId: 'b',
    bounds: { x: 200, y: 70, width: 100, height: 80 },
    outgoing: [], incoming: [], dataIn: [], dataOut: [], children: [], boundary: []
  });

  return {
    project,
    graph,
    bpmnDoc: new DOMParser().parseFromString(BPMN_SVG, 'image/svg+xml'),
    bpmnViewBox: { x: 100, y: 50, width: 300, height: 100 },
    images: new Map([ [ 'a', 'data:image/png;base64,AAAA' ] ])
  };
}

function sample(): Project {
  const project = createProject({ name: 'Оплата <OTP> & "ко"' });
  const a = screen('a', [
    { id: 'h1', name: 'Оплатить', rect: { x: 0.1, y: 0.5, w: 0.5, h: 0.1 },
      action: { type: 'gateway', call: createApiCall({ name: '<script>', bpmnElementId: 'Cmd_1' }) } },
    { id: 'h2', name: 'Далее', rect: { x: 0, y: 0.9, w: 1, h: 0.1 }, action: { type: 'navigate', targetScreenId: 'b' } }
  ]);

  project.screens = [ a, screen('b') ];
  project.startScreenId = 'a';

  return project;
}

function parse(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');

  expect(doc.querySelector('parsererror')).toBeNull();

  return doc;
}

describe('buildOverviewSvg', () => {

  it('строит дорожки, экраны, вложенную схему и связи', () => {
    const doc = parse(buildOverviewSvg(input(sample())));
    const root = doc.documentElement;

    expect(root.nodeName).toBe('svg');
    expect(doc.getElementById('fmg-lane-mobile')).not.toBeNull();
    expect(doc.getElementById('fmg-lane-backend')).not.toBeNull();
    expect(doc.querySelectorAll('[data-screen-id]')).toHaveLength(2);
    const image = doc.querySelector('image')!;

    // картинка вложена один раз (B6)
    expect(image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('data:image/png;base64,AAAA');
    expect(image.hasAttribute('href')).toBe(false);

    const bpmn = doc.getElementById('fmg-bpmn')!;

    expect(bpmn.getAttribute('viewBox')).toBe('100 50 300 100');
    expect(bpmn.querySelector('[data-element-id="Cmd_1"]')).not.toBeNull();
    expect(bpmn.querySelector('marker#sequenceflow-end')).not.toBeNull();

    expect(doc.querySelectorAll('#fmg-navigate path')).toHaveLength(1);
    expect(doc.querySelectorAll('.fmg-cross-link')).toHaveLength(2);
  });

  it('связь вызова ведёт в верхний центр узла с учётом viewBox', () => {
    const data = input(sample());

    data.graph.nodes.get('Cmd_1')!.screenId = undefined;

    const doc = parse(buildOverviewSvg(data));
    const bpmn = doc.getElementById('fmg-bpmn')!;
    const bx = Number(bpmn.getAttribute('x'));
    const by = Number(bpmn.getAttribute('y'));
    const d = doc.querySelector('#fmg-call-1 path')!.getAttribute('d')!;
    const end = d.trim().split(/[\s,]+/).slice(-2).map(Number);

    // узел x=200 w=100 → центр 250; viewBox.x=100 → смещение 150
    expect(end).toEqual([ bx + 150, by + 20 ]);
  });

  it('у двух связей в один узел разные концы (B7)', () => {
    const project = sample();

    // второй вызов в тот же узел — при открытии экрана; у узла ещё и показ экрана
    project.screens[0].onOpenCalls.push(createApiCall({ name: 'При открытии', bpmnElementId: 'Cmd_1' }));

    const doc = parse(buildOverviewSvg(input(project)));
    const ends = Array.from(doc.querySelectorAll('.fmg-cross-link path')).map(path => {
      const parts = path.getAttribute('d')!.trim().split(/[\s,]+/);
      const isScreenLink = path.parentElement!.id.startsWith('fmg-screen-link');

      // у узла — конец вызова или начало показа экрана
      return (isScreenLink ? parts.slice(1, 3) : parts.slice(-2)).join(' ');
    });

    expect(ends).toHaveLength(3);
    expect(new Set(ends).size).toBe(3);
  });

  it('управляющие символы в названиях не ломают XML (B5)', () => {
    const project = sample();

    project.meta.name = 'Оплата\u000Bпо\u0001OTP\uFFFE';
    project.screens[0].name = 'Экран\u000C1';

    const svg = buildOverviewSvg(input(project));
    const doc = parse(svg);

    expect(doc.querySelector('title')!.textContent).toBe('ОплатапоOTP');
  });

  it('экранирует тексты и не пропускает скрипты и обработчики', () => {
    const svg = buildOverviewSvg(input(sample()));
    const doc = parse(svg);

    expect(doc.querySelector('script')).toBeNull();
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script>');
    expect(doc.querySelector('title')!.textContent).toBe('Оплата <OTP> & "ко"');
    expect(doc.querySelector('#fmg-call-1 > title')!.textContent).toBe('<script>');
  });

  it('работает без экранов', () => {
    const project = createProject({ name: 'пусто' });
    const doc = parse(buildOverviewSvg({ ...input(project), images: new Map() }));

    expect(doc.querySelectorAll('[data-screen-id]')).toHaveLength(0);
    expect(doc.querySelectorAll('.fmg-cross-link')).toHaveLength(0);
  });
});
