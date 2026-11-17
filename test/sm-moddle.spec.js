import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:sm="http://bpm-document-maker/schema/bpmn/sm"
                  id="Defs" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1">
    <bpmn:intermediateCatchEvent id="Ev_1" name="Оплата подтверждена" sm:kind="event" sm:code="PAYMENT_CONFIRMED" sm:source="Процессинг" sm:summary="Процессинг подтвердил оплату">
      <bpmn:extensionElements>
        <sm:Parameters>
          <sm:Parameter name="paymentId" direction="in" type="string" required="true" description="ID оплаты" />
        </sm:Parameters>
      </bpmn:extensionElements>
    </bpmn:intermediateCatchEvent>
    <bpmn:task id="Cmd_1" name="Показать OTP" sm:kind="cmd" sm:code="SHOW_OTP" sm:controller="otp-service" sm:endpoint="POST /otp/send">
      <bpmn:extensionElements>
        <sm:Links>
          <sm:Link title="Swagger" href="https://example.com/swagger" />
        </sm:Links>
      </bpmn:extensionElements>
    </bpmn:task>
    <bpmn:task id="Mob_1" name="Ввод OTP" sm:kind="mobile">
      <bpmn:extensionElements>
        <sm:Screenshot name="otp.png" mimeType="image/png" width="1" height="1">iVBORw0KGgo=</sm:Screenshot>
      </bpmn:extensionElements>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Ev_1" targetRef="Cmd_1" sm:trigger="PAYMENT_CONFIRMED" />
  </bpmn:process>
</bpmn:definitions>`;

function createModdle() {
  return new BpmnModdle({ sm: smDescriptor });
}

describe('sm moddle extension', () => {

  it('reads sm attributes and extension elements', async () => {
    const moddle = createModdle();
    const { rootElement, warnings } = await moddle.fromXML(XML);

    expect(warnings).toEqual([]);

    const [ event, cmd, mobile, flow ] = rootElement.rootElements[0].flowElements;

    expect(event.get('sm:kind')).toBe('event');
    expect(event.get('sm:code')).toBe('PAYMENT_CONFIRMED');
    expect(event.get('sm:summary')).toBe('Процессинг подтвердил оплату');

    const params = event.extensionElements.values[0];
    expect(params.$type).toBe('sm:Parameters');
    expect(params.values[0].name).toBe('paymentId');
    expect(params.values[0].required).toBe(true);

    expect(cmd.get('sm:controller')).toBe('otp-service');
    expect(cmd.extensionElements.values[0].values[0].href).toBe('https://example.com/swagger');

    const screenshot = mobile.extensionElements.values[0];
    expect(screenshot.$type).toBe('sm:Screenshot');
    expect(screenshot.body).toBe('iVBORw0KGgo=');
    expect(screenshot.width).toBe(1);

    expect(flow.get('sm:trigger')).toBe('PAYMENT_CONFIRMED');
  });

  it('round-trips without losing data', async () => {
    const moddle = createModdle();
    const { rootElement } = await moddle.fromXML(XML);
    const { xml } = await moddle.toXML(rootElement, { format: true });

    expect(xml).toContain('sm:kind="cmd"');
    expect(xml).toContain('<sm:Parameter name="paymentId" direction="in" type="string" required="true"');
    expect(xml).toContain('<sm:Link title="Swagger" href="https://example.com/swagger"');
    expect(xml).toContain('>iVBORw0KGgo=</sm:Screenshot>');
    expect(xml).toContain('sm:trigger="PAYMENT_CONFIRMED"');

    // повторный импорт даёт тот же результат
    const again = await createModdle().fromXML(xml);
    const { xml: xml2 } = await createModdle().toXML(again.rootElement, { format: true });

    expect(xml2).toBe(xml);
  });
});

describe('sm moddle: data elements', () => {

  const DATA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:sm="http://bpm-document-maker/schema/bpmn/sm"
                  id="Defs" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1">
    <bpmn:task id="Api_1" sm:kind="api" sm:controller="otp-service" sm:method="POST" sm:endpoint="/otp" />
    <bpmn:dataObjectReference id="Json_1" dataObjectRef="DO_1" sm:kind="json" sm:direction="out">
      <bpmn:extensionElements>
        <sm:Json>{"a": [1, 2]}</sm:Json>
      </bpmn:extensionElements>
    </bpmn:dataObjectReference>
    <bpmn:dataObject id="DO_1" />
    <bpmn:dataStoreReference id="Db_1" sm:kind="db" sm:table="payments" sm:database="pay_db">
      <bpmn:extensionElements>
        <sm:Columns>
          <sm:Column name="id" type="uuid" primaryKey="true" />
          <sm:Column name="paid_at" type="timestamptz" nullable="true" />
        </sm:Columns>
      </bpmn:extensionElements>
    </bpmn:dataStoreReference>
  </bpmn:process>
</bpmn:definitions>`;

  it('reads and round-trips API, JSON and DB table', async () => {
    const { rootElement, warnings } = await createModdle().fromXML(DATA_XML);

    expect(warnings).toEqual([]);

    const elements = rootElement.rootElements[0].flowElements;
    const byId = id => elements.find(e => e.id === id);

    expect(byId('Api_1').get('sm:method')).toBe('POST');
    expect(byId('Json_1').get('sm:direction')).toBe('out');
    expect(byId('Json_1').extensionElements.values[0].body).toBe('{"a": [1, 2]}');

    const columns = byId('Db_1').extensionElements.values[0].values;

    expect(byId('Db_1').get('sm:table')).toBe('payments');
    expect(columns.map(c => [ c.name, c.type, !!c.primaryKey, !!c.nullable ]))
      .toEqual([ [ 'id', 'uuid', true, false ], [ 'paid_at', 'timestamptz', false, true ] ]);

    const { xml } = await createModdle().toXML(rootElement, { format: true });

    expect(xml).toContain('sm:kind="json" sm:direction="out"');
    expect(xml).toContain('<sm:Json>{"a": [1, 2]}</sm:Json>');
    expect(xml).toContain('<sm:Column name="id" type="uuid" primaryKey="true" />');
  });

  it('reads and writes sm:screen', async () => {
    const xml = XML.replace('<bpmn:task id="Cmd_1" ', '<bpmn:task id="Cmd_1" sm:screen="scr_otp" ');
    const { rootElement, warnings } = await createModdle().fromXML(xml);

    expect(warnings).toEqual([]);

    const cmd = rootElement.rootElements[0].flowElements[1];

    expect(cmd.get('sm:screen')).toBe('scr_otp');

    cmd.set('sm:screen', 'scr_other');

    const { xml: written } = await createModdle().toXML(rootElement);

    expect(written).toContain('sm:screen="scr_other"');

    const again = await createModdle().fromXML(written);

    expect(again.rootElement.rootElements[0].flowElements[1].get('sm:screen')).toBe('scr_other');
  });
});
