import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import EXAMPLE from '../src/resources/example.bpmn?raw';
import { collectElementDoc, hasDocContent } from '../src/modeler/sm/element-doc.js';


async function elements(xml = EXAMPLE) {
  const { rootElement } = await new BpmnModdle({ sm: smDescriptor }).fromXML(xml);
  const process = rootElement.rootElements.find((r: any) => r.$type === 'bpmn:Process');

  return new Map<string, any>(process.flowElements.map((e: any) => [ e.id, e ]));
}

const bridge = {
  getScreen: (id: string) => id === 'scr_otp' ? { id, name: 'Ввод OTP', code: 'SCR-OTP' } : undefined
};

describe('collectElementDoc', () => {

  it('describes an API task with fields and associated data', async () => {
    const api = (await elements()).get('Api_SendOtp');
    const doc = collectElementDoc(api);

    expect(doc.kind).toBe('api');
    expect(doc.title).toBe('API');
    expect(doc.name).toBe('Отправить OTP');
    expect(doc.fields.map(f => f.key)).toEqual([ 'controller', 'method', 'endpoint' ]);
    expect(doc.fields.find(f => f.key === 'method')!.value).toBe('POST');

    // JSON и таблица — из связанных объектов данных
    expect(doc.json.map(j => j.id).sort()).toEqual([ 'Json_Req', 'Json_Resp' ]);
    expect(doc.json.every(j => j.error === null)).toBe(true);
    expect(doc.columns.map(c => c.id)).toEqual([ 'Db_Otp' ]);
    expect(doc.columns[0].columns.length).toBeGreaterThan(0);
    expect(doc.screen).toBeUndefined();
  });

  it('describes own JSON with direction label', async () => {
    const doc = collectElementDoc((await elements()).get('Json_Req'));

    expect(doc.kind).toBe('json');
    expect(doc.fields).toEqual([ { key: 'direction', label: 'Направление', value: 'входящий' } ]);
    expect(doc.json).toHaveLength(1);
  });

  it('resolves the prototype screen of a Cmd', async () => {
    const xml = EXAMPLE
      .replace('id="Cmd_ShowOtp"', 'id="Cmd_ShowOtp" sm:screen="scr_otp"')
      .replace('id="Mob_OtpInput"', 'id="Mob_OtpInput" sm:screen="scr_gone"');
    const map = await elements(xml);

    expect(collectElementDoc(map.get('Cmd_ShowOtp'), bridge).screen)
      .toEqual({ id: 'scr_otp', name: 'Ввод OTP', code: 'SCR-OTP', missing: false });
    expect(collectElementDoc(map.get('Mob_OtpInput'), bridge).screen)
      .toEqual({ id: 'scr_gone', missing: true });

    // без моста экран считается ненайденным
    expect(collectElementDoc(map.get('Cmd_ShowOtp')).screen!.missing).toBe(true);
  });

  it('has no content for a plain BPMN element', async () => {
    const doc = collectElementDoc((await elements()).get('End'));

    expect(doc.title).toBe('Конец');
    expect(hasDocContent(doc)).toBe(false);
  });

  it('событие с привязанным объектом данных получает его JSON (B3)', async () => {
    const xml = EXAMPLE.replace(
      '<bpmn:outgoing>Flow_7</bpmn:outgoing>\n    </bpmn:intermediateCatchEvent>',
      '<bpmn:outgoing>Flow_7</bpmn:outgoing>\n      <bpmn:dataOutputAssociation id="Assoc_Ev"><bpmn:targetRef>Json_Resp</bpmn:targetRef></bpmn:dataOutputAssociation>\n    </bpmn:intermediateCatchEvent>'
    );

    expect(xml).not.toBe(EXAMPLE);

    const doc = collectElementDoc((await elements(xml)).get('Ev_OtpEntered'));

    expect(doc.json.map(j => j.id)).toEqual([ 'Json_Resp' ]);
  });

  it('типы без вида — по-русски (B9)', async () => {
    const map = await elements();

    expect(collectElementDoc(map.get('Gw_OtpValid')).title).toBe('Развилка');
    expect(collectElementDoc(map.get('Start')).title).toBe('Начало');
  });
});
