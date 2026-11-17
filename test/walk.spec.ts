import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import EXAMPLE from '../src/resources/example.bpmn?raw';
import { buildBpmnGraph, emptyGraph } from '../src/bpmn/graph';
import {
  backWalk,
  canBack,
  currentPos,
  jumpWalk,
  nodeOptions,
  pointOnPolyline,
  polylineLength,
  startWalk,
  stepCall,
  stepWalk,
  tokenNodeId,
  visitedBefore,
  walkOptions,
  walkStart,
  walkStartNodes,
  walkTrail,
  type WalkContext,
  type WalkPos,
  type WalkState
} from '../src/bpmn/walk';
import { createApiCall } from '../src/model/project';
import type { Hotspot, Screen } from '../src/model/types';
import { screen } from './fixtures';

async function example() {
  const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(EXAMPLE);

  return buildBpmnGraph(rootElement);
}

const node = (id: string): WalkPos => ({ type: 'node', id });
const scr = (id: string): WalkPos => ({ type: 'screen', id });

/** Контекст без экранов: проход только по схеме. */
async function schema(): Promise<WalkContext> {
  return { graph: await example(), screens: [] };
}

function walkBy(ctx: WalkContext, start: WalkPos, keys: string[]): WalkState {
  return keys.reduce((state, key) => stepWalk(ctx, state, key), startWalk(start));
}

describe('walk', () => {

  it('проход начинается со стартового события', async () => {
    const graph = await example();

    expect(walkStartNodes(graph)).toEqual([ 'Start' ]);
    expect(walkStartNodes(emptyGraph())).toEqual([]);
  });

  it('шаги идут по sequenceFlow; у обычного узла один вариант', async () => {
    const graph = await example();
    const ctx = { graph, screens: [] };
    let state = startWalk(node('Start'));

    expect(walkOptions(ctx, state).map(o => o.targetId)).toEqual([ 'Ev_PayClicked' ]);

    state = stepWalk(ctx, state, 'Flow_1');
    state = stepWalk(ctx, state, 'Flow_2');

    expect(currentPos(state)).toEqual(node('St_WaitOtp'));
    expect(tokenNodeId(state)).toBe('St_WaitOtp');
    expect(state.steps.map(s => s.flowId)).toEqual([ null, 'Flow_1', 'Flow_2' ]);

    // поток не из текущего узла — состояние не меняется
    expect(stepWalk(ctx, state, 'Flow_8')).toBe(state);
  });

  it('на развилке — варианты с подписями потоков; объекты данных не варианты', async () => {
    const graph = await example();
    const options = nodeOptions(graph, 'Gw_OtpValid');

    expect(options.map(o => [ o.flowId, o.label, o.targetId ])).toEqual([
      [ 'Flow_Yes', 'да', 'St_Paid' ],
      [ 'Flow_No', 'нет', 'Cmd_ShowOtp' ]
    ]);
    expect(options[0].target).toContain('Оплата подтверждена');

    expect(nodeOptions(graph, 'Api_SendOtp').map(o => o.targetId)).toEqual([ 'Cmd_ShowOtp' ]);
    expect(nodeOptions(graph, 'End')).toEqual([]);
    expect(nodeOptions(graph, 'missing')).toEqual([]);
    expect(nodeOptions(graph, null)).toEqual([]);
    expect(walkOptions({ graph, screens: [] }, null)).toEqual([]);
  });

  it('подпись ветки включает триггер', async () => {
    const graph = await example();

    expect(nodeOptions(graph, 'Ev_PayClicked')[0].label).toBe('[PAY_CLICKED]');
  });

  it('след: пройденные узлы без текущего и все пройденные потоки; цикл виден как повтор', async () => {
    const ctx = await schema();
    const state = walkBy(ctx, node('Cmd_ShowOtp'), [ 'Flow_5', 'Flow_6', 'Flow_7', 'Flow_No' ]);

    expect(currentPos(state)).toEqual(node('Cmd_ShowOtp'));
    expect(visitedBefore(state)).toBe(true);
    expect(visitedBefore(backWalk(state))).toBe(false);

    const trail = walkTrail(state);

    expect([ ...trail.nodes ].sort()).toEqual([ 'Ev_OtpEntered', 'Gw_OtpValid', 'Mob_OtpInput' ]);
    expect([ ...trail.flows ].sort()).toEqual([ 'Flow_5', 'Flow_6', 'Flow_7', 'Flow_No' ]);
    expect(walkTrail(null)).toEqual({ nodes: new Set(), flows: new Set() });
  });

  it('прыжок из прототипа сохраняет след; на текущий узел — без изменений', async () => {
    const ctx = await schema();
    let state = stepWalk(ctx, startWalk(node('Start')), 'Flow_1');
    const same = jumpWalk(state, node('Ev_PayClicked'));

    expect(same).toBe(state);

    state = jumpWalk(state, node('Ev_OtpEntered'));
    expect(state.steps.map(s => [ s.pos.id, s.flowId ])).toEqual([
      [ 'Start', null ], [ 'Ev_PayClicked', 'Flow_1' ], [ 'Ev_OtpEntered', null ]
    ]);
    expect([ ...walkTrail(state).flows ]).toEqual([ 'Flow_1' ]);

    expect(jumpWalk(null, node('Start'))).toEqual(startWalk(node('Start')));
  });

  it('шаг назад возвращает токен; первый шаг не отменяется', async () => {
    const ctx = await schema();
    const first = startWalk(node('Start'));
    const second = stepWalk(ctx, first, 'Flow_1');

    expect(canBack(first)).toBe(false);
    expect(backWalk(first)).toBe(first);
    expect(canBack(second)).toBe(true);
    expect(backWalk(second)).toEqual(first);
    expect(canBack(null)).toBe(false);
  });

  it('точка на ломаной по доле пути', () => {
    const path = [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ];

    expect(polylineLength(path)).toBe(200);
    expect(pointOnPolyline(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnPolyline(path, 0.25)).toEqual({ x: 50, y: 0 });
    expect(pointOnPolyline(path, 0.75)).toEqual({ x: 100, y: 50 });
    expect(pointOnPolyline(path, 1)).toEqual({ x: 100, y: 100 });
    expect(pointOnPolyline(path, 7)).toEqual({ x: 100, y: 100 });
    // вырожденные случаи
    expect(pointOnPolyline([ { x: 5, y: 5 }, { x: 5, y: 5 } ], 0.5)).toEqual({ x: 5, y: 5 });
    expect(pointOnPolyline([ { x: 5, y: 5 } ], 0.5)).toEqual({ x: 5, y: 5 });
    expect(pointOnPolyline([], 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe('walk — подпроцесс и граничные события (B2)', () => {

  async function sub() {
    const { SUBPROCESS_XML } = await import('./fixtures');
    const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(SUBPROCESS_XML);

    return buildBpmnGraph(rootElement);
  }

  it('с узла с граничным событием — поток и прыжок на событие', async () => {
    const graph = await sub();
    const ctx = { graph, screens: [] };
    const options = nodeOptions(graph, 'A');

    expect(options.map(o => [ o.targetId, o.flowId, o.kind ])).toEqual([ [ 'Sub', 'f1', 'flow' ], [ 'Err', null, 'jump' ] ]);

    const state = stepWalk(ctx, startWalk(node('A')), options[1].key);

    expect(currentPos(state)).toEqual(node('Err'));
    expect(state.steps[1].flowId).toBeNull();
    expect(walkOptions(ctx, state).map(o => o.targetId)).toEqual([ 'E' ]);
  });

  it('с подпроцесса — внутрь и дальше по потоку', async () => {
    const graph = await sub();

    expect(nodeOptions(graph, 'Sub').map(o => [ o.targetId, o.label ])).toEqual([
      [ 'SubStart', 'Внутрь подпроцесса' ],
      [ 'C', '' ]
    ]);
  });

  it('старт прохода — только верхний уровень', async () => {
    expect(walkStartNodes(await sub())).toEqual([ 'S' ]);
  });
});

describe('walk — единый проход по экранам и схеме', () => {

  const zone = (id: string, y: number, action: Hotspot['action'], name = id): Hotspot =>
    ({ id, name, rect: { x: 0.1, y, w: 0.8, h: 0.1 }, action });

  /**
   * Корзина: «Оплатить» → вызов на Ev_PayClicked.
   * Ввод OTP (его показывают Cmd_ShowOtp и Mob_OtpInput): «Назад» → Корзина, «Подтвердить» → Ev_OtpEntered.
   * Успех: вызов при открытии → St_Paid.
   */
  async function project(): Promise<WalkContext> {
    const pay = createApiCall({ id: 'c_pay', name: 'Создать платёж', bpmnElementId: 'Ev_PayClicked' });
    const confirm = createApiCall({ id: 'c_otp', name: 'Проверить OTP', bpmnElementId: 'Ev_OtpEntered' });
    const lost = createApiCall({ id: 'c_lost', bpmnElementId: 'Нет_такого_узла' });
    const receipt = createApiCall({ id: 'c_receipt', name: 'Чек', bpmnElementId: 'St_Paid' });

    const cart = screen('cart', [
      zone('pay', 0.8, { type: 'gateway', call: pay }, 'Оплатить'),
      zone('lost', 0.5, { type: 'gateway', call: lost }),
      zone('empty', 0.2, null),
      zone('gone', 0.3, { type: 'navigate', targetScreenId: 'нет_экрана' })
    ]);
    const otp = screen('otp', [
      zone('confirm', 0.7, { type: 'gateway', call: confirm }, 'Подтвердить'),
      zone('back', 0.05, { type: 'navigate', targetScreenId: 'cart' }, 'Назад')
    ]);
    const done: Screen = { ...screen('done'), onOpenCalls: [ receipt ] };

    const xml = EXAMPLE
      .replace('id="Cmd_ShowOtp"', 'id="Cmd_ShowOtp" sm:screen="otp"')
      .replace('id="Mob_OtpInput"', 'id="Mob_OtpInput" sm:screen="otp"');
    const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(xml);

    return { graph: buildBpmnGraph(rootElement), screens: [ cart, otp, done ] };
  }

  it('начало — выбранный или первый экран; без экранов — начало схемы', async () => {
    const ctx = await project();

    expect(walkStart(ctx, 'otp')).toEqual(scr('otp'));
    expect(walkStart(ctx, null)).toEqual(scr('cart'));
    expect(walkStart(ctx, 'удалён')).toEqual(scr('cart'));
    expect(walkStart({ graph: ctx.graph, screens: [] }, null)).toEqual(node('Start'));
    expect(walkStart({ graph: emptyGraph(), screens: [] }, null)).toBeNull();
  });

  it('с экрана шаг — только по зонам, которые куда-то ведут', async () => {
    const ctx = await project();
    const options = walkOptions(ctx, startWalk(scr('cart')));

    // зона без действия, вызов без узла и переход на удалённый экран — не шаги
    expect(options.map(o => [ o.kind, o.label, o.targetId, o.hotspotId ])).toEqual([
      [ 'call', 'Оплатить', 'Ev_PayClicked', 'pay' ]
    ]);
  });

  it('экран → вызов → узлы → Cmd показывает экран → зона → узел: один путь', async () => {
    const ctx = await project();
    let state = walkBy(ctx, scr('cart'), [ 'call:c_pay', 'Flow_2', 'Flow_3', 'Flow_4' ]);

    expect(currentPos(state)).toEqual(node('Cmd_ShowOtp'));
    expect(state.steps[1].call).toEqual({ screenId: 'cart', callId: 'c_pay', hotspotId: 'pay' });
    expect(stepCall(ctx, state.steps[1])?.call.name).toBe('Создать платёж');
    expect(stepCall(ctx, state.steps[2])).toBeNull();

    // узел с экраном: единственный шаг — показать экран (авто-проход идёт сам)
    expect(walkOptions(ctx, state).map(o => [ o.kind, o.targetId ])).toEqual([ [ 'screen', 'otp' ] ]);

    state = stepWalk(ctx, state, 'screen:otp');
    expect(currentPos(state)).toEqual(scr('otp'));
    // токен остаётся на узле, который показал экран
    expect(tokenNodeId(state)).toBe('Cmd_ShowOtp');

    // с экрана: его зоны сверху вниз и продолжение по схеме от узла
    expect(walkOptions(ctx, state).map(o => [ o.kind, o.label, o.targetId ])).toEqual([
      [ 'navigate', 'Назад', 'cart' ],
      [ 'call', 'Подтвердить', 'Ev_OtpEntered' ],
      [ 'flow', 'Далее по схеме', 'Mob_OtpInput' ]
    ]);

    state = stepWalk(ctx, state, 'call:c_otp');
    expect(currentPos(state)).toEqual(node('Ev_OtpEntered'));
    expect(walkOptions(ctx, state).map(o => o.targetId)).toEqual([ 'Gw_OtpValid' ]);
  });

  it('узел с тем же экраном, с которого пришли, экран второй раз не показывает', async () => {
    const ctx = await project();
    const state = walkBy(ctx, node('Cmd_ShowOtp'), [ 'screen:otp', 'Flow_5' ]);

    expect(currentPos(state)).toEqual(node('Mob_OtpInput'));
    expect(walkOptions(ctx, state).map(o => [ o.kind, o.targetId ])).toEqual([ [ 'flow', 'Ev_OtpEntered' ] ]);
  });

  it('ветка схемы в тот же узел, что и зона экрана, не дублируется', async () => {
    const ctx = await project();
    // экран OTP показан узлом Mob_OtpInput: его поток ведёт туда же, куда «Подтвердить»
    const state = walkBy(ctx, node('Mob_OtpInput'), [ 'screen:otp' ]);

    expect(walkOptions(ctx, state).map(o => [ o.kind, o.targetId ])).toEqual([
      [ 'navigate', 'cart' ],
      [ 'call', 'Ev_OtpEntered' ]
    ]);
  });

  it('вызов при открытии экрана — шаг на узел; след учитывает только узлы', async () => {
    const ctx = await project();
    const state = walkBy(ctx, scr('done'), [ 'call:c_receipt', 'Flow_8' ]);

    expect(currentPos(state)).toEqual(node('End'));
    expect([ ...walkTrail(state).nodes ]).toEqual([ 'St_Paid' ]);
    expect(tokenNodeId(startWalk(scr('done')))).toBeNull();
  });
});
