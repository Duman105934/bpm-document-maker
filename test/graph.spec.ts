import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import EXAMPLE from '../src/resources/example.bpmn?raw';
import { buildBpmnGraph, describeNode } from '../src/bpmn/graph';


async function load(xml: string) {
  const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(xml);

  return buildBpmnGraph(rootElement);
}

describe('buildBpmnGraph', () => {

  it('collects nodes, kinds and bounds from example.bpmn', async () => {
    const graph = await load(EXAMPLE);

    const cmd = graph.nodes.get('Cmd_ShowOtp')!;

    expect(cmd.type).toBe('bpmn:Task');
    expect(cmd.kind).toBe('cmd');
    expect(cmd.name).toBe('Показать экран OTP');
    expect(cmd.bounds).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }));

    expect(graph.nodes.get('Gw_OtpValid')!.kind).toBeUndefined();
    expect(graph.nodes.get('Json_Req')!.kind).toBe('json');
    expect(graph.nodes.get('Db_Otp')!.type).toBe('bpmn:DataStoreReference');
    expect(describeNode(cmd)).toBe('Показать экран OTP · Cmd');
    expect(describeNode(graph.nodes.get('Gw_OtpValid')!)).toBe('Код верный? · ExclusiveGateway');
  });

  it('links sequence flows with names and triggers', async () => {
    const graph = await load(EXAMPLE);

    expect(graph.flows.get('Flow_2')).toEqual({
      id: 'Flow_2', sourceRef: 'Ev_PayClicked', targetRef: 'St_WaitOtp', name: undefined, trigger: 'PAY_CLICKED'
    });
    expect(graph.flows.get('Flow_No')!.name).toBe('нет');

    const gateway = graph.nodes.get('Gw_OtpValid')!;

    expect(gateway.outgoing.sort()).toEqual([ 'Flow_No', 'Flow_Yes' ]);
    expect(graph.nodes.get('Cmd_ShowOtp')!.incoming.sort()).toEqual([ 'Flow_4', 'Flow_No' ]);
  });

  it('collects data associations of tasks', async () => {
    const graph = await load(EXAMPLE);
    const api = graph.nodes.get('Api_SendOtp')!;

    expect(api.dataIn).toEqual([ 'Json_Req' ]);
    expect(api.dataOut.sort()).toEqual([ 'Db_Otp', 'Json_Resp' ]);
  });

  it('reads sm:screen of Cmd and Mobile only', async () => {
    const xml = EXAMPLE
      .replace('id="Cmd_ShowOtp"', 'id="Cmd_ShowOtp" sm:screen="scr_otp"')
      .replace('id="St_Paid"', 'id="St_Paid" sm:screen="scr_ignored"');
    const graph = await load(xml);

    expect(graph.nodes.get('Cmd_ShowOtp')!.screenId).toBe('scr_otp');
    expect(graph.nodes.get('St_Paid')!.screenId).toBeUndefined();
  });

  it('returns an empty graph without definitions', () => {
    const graph = buildBpmnGraph(null);

    expect(graph.nodes.size).toBe(0);
    expect(graph.flows.size).toBe(0);
  });
});

describe('buildBpmnGraph — подпроцесс и граничные события', () => {

  it('у узлов свёрнутого подпроцесса нет bounds; дети и граничные события собраны (B1, B2)', async () => {
    const { SUBPROCESS_XML } = await import('./fixtures');
    const graph = await load(SUBPROCESS_XML);

    expect(graph.nodes.get('A')!.bounds).toEqual({ x: 100, y: 0, width: 100, height: 80 });
    expect(graph.nodes.get('B')!.bounds).toBeNull();
    expect(graph.nodes.get('SubStart')!.bounds).toBeNull();
    expect(graph.nodes.get('Sub')!.children).toEqual([ 'SubStart', 'B' ]);
    expect(graph.nodes.get('B')!.parent).toBe('Sub');
    expect(graph.nodes.get('A')!.boundary).toEqual([ 'Err' ]);
  });
});
