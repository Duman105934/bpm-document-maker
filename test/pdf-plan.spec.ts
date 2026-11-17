import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import EXAMPLE from '../src/resources/example.bpmn?raw';
import { buildBpmnGraph } from '../src/bpmn/graph';
import { buildFlowOrder } from '../src/model/flow';
import { createApiCall, createProject } from '../src/model/project';
import { assignPages, planDocument, tocPageCount } from '../src/export/pdf/plan';
import { callBlocks, nodeCallouts, screenCallouts, type NodeDoc } from '../src/export/pdf/content';
import { screen } from './fixtures';

async function setup() {
  const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(EXAMPLE);
  const graph = buildBpmnGraph(rootElement);
  const project = createProject({ name: 'OTP' });
  const pay = screen('pay', [
    { id: 'h1', name: 'Оплатить', rect: { x: 0.1, y: 0.8, w: 0.8, h: 0.1 },
      action: { type: 'gateway', call: createApiCall({ name: 'Отправить OTP', method: 'POST', gatewayUrl: '/gw/otp', bpmnElementId: 'Api_SendOtp' }) } }
  ]);

  project.screens = [ pay, screen('otp'), screen('lost') ];
  project.startScreenId = 'pay';
  graph.nodes.get('Cmd_ShowOtp')!.screenId = 'otp';

  const plan = planDocument(project, graph, buildFlowOrder(project, graph));

  return { graph, project, plan };
}

describe('pdf/plan', () => {

  it('разделы идут в порядке флоу; JSON, DB и события без вида страниц не получают', async () => {
    const { plan } = await setup();
    const keys = plan.sections.map(s => s.key);

    expect(keys.slice(0, 4)).toEqual([ 'screen:pay', 'node:Api_SendOtp', 'node:Cmd_ShowOtp', 'screen:otp' ]);
    expect(keys).toContain('node:Gw_OtpValid');
    expect(plan.sections.find(s => s.key === 'node:Gw_OtpValid')!.title).toBe('Код верный? · Развилка');
    expect(keys.some(k => k.includes('Json_') || k.includes('Db_'))).toBe(false);
    expect(keys).not.toContain('node:Start');
    expect(plan.sections.map(s => s.number)).toEqual(plan.sections.map((_, i) => i + 1));

    const lost = plan.sections.find(s => s.key === 'screen:lost')!;

    expect(lost.unreachable).toBe(true);
    expect(keys.indexOf('screen:lost')).toBeGreaterThan(keys.indexOf('node:Gw_OtpValid'));
  });

  it('номера страниц учитывают обложку, оглавление и продолжения', async () => {
    const { plan } = await setup();
    const counts = plan.sections.map((_, i) => (i === 1 ? 3 : 1));
    const pages = assignPages(plan, counts, 30);

    expect(pages.tocPages).toBe(1);
    expect(pages.start.get(plan.sections[0].key)).toBe(3);
    expect(pages.start.get(plan.sections[1].key)).toBe(4);
    expect(pages.start.get(plan.sections[2].key)).toBe(7);
    expect(pages.total).toBe(2 + counts.reduce((a, b) => a + b, 0));
    expect(tocPageCount(61, 30)).toBe(3);
  });

  it('ссылки выносок ведут на разделы, у которых есть страница', async () => {
    const { graph, project, plan } = await setup();
    const [ callout ] = screenCallouts(project.screens[0], project, graph, plan);

    expect(callout.marker).toBe('1');
    expect(callout.blocks).toContainEqual({ kind: 'mono', text: 'POST /gw/otp' });
    expect(callout.blocks).toContainEqual(expect.objectContaining({ kind: 'link', target: 'node:Api_SendOtp' }));

    // узел без страницы — ссылка без цели
    const blocks = callBlocks(createApiCall({ bpmnElementId: 'Json_Req' }), graph, plan);

    expect(blocks).toContainEqual(expect.objectContaining({ kind: 'link', target: undefined }));
  });

  it('выноски узла: экран Cmd, исходящие развилки и JSON у своего объекта', async () => {
    const { graph, plan } = await setup();
    const doc: NodeDoc = {
      kind: 'cmd', title: 'Cmd', name: 'Показать', summary: 'Команда', documentation: '',
      fields: [ { key: 'code', label: 'Код', value: 'SHOW' } ], parameters: [],
      json: [ { id: 'Json_Req', name: 'Запрос', direction: 'in', body: '{"a":1}', error: null } ],
      columns: [], links: [ { title: 'Wiki', href: 'https://example.com' } ],
      screen: { id: 'otp', name: 'otp', missing: false }
    };
    const anchors = (id: string) => (id === 'Json_Req' ? { x: 0.9, y: 0.1 } : { x: 0.5, y: 0.5 });
    const cmd = nodeCallouts(graph.nodes.get('Cmd_ShowOtp')!, doc, graph, plan, anchors);

    expect(cmd[0].blocks).toContainEqual(expect.objectContaining({ kind: 'link', target: 'screen:otp' }));
    expect(cmd.find(c => c.id.includes(':json:'))!.anchor).toEqual({ x: 0.9, y: 0.1 });
    expect(cmd.find(c => c.id.endsWith(':links'))!.blocks[0]).toEqual({ kind: 'link', text: 'Wiki', url: 'https://example.com' });

    const gw = nodeCallouts(graph.nodes.get('Gw_OtpValid')!, { ...doc, screen: undefined, json: [], links: [] }, graph, plan, anchors);
    const links = gw[0].blocks.filter(b => b.kind === 'link');

    expect(links).toHaveLength(2);
    expect(links.map(l => l.text).join('|')).toMatch(/да -> .*\|нет -> /);
  });
});
