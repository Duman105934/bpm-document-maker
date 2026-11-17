import { describe, expect, it } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import { normalizeSmNamespace } from '../src/bpmn/smNamespace';

const xmlWith = (declaration: string) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  ${ declaration }
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1">
    <bpmn:task id="St_1" name="Состояние" sm:kind="state" sm:code="WAIT" />
  </bpmn:process>
</bpmn:definitions>`;

describe('normalizeSmNamespace', () => {

  it('заменяет прежний URI расширения на текущий', () => {
    const xml = normalizeSmNamespace(xmlWith('xmlns:sm="http://old.example/schema/sm"'));

    expect(xml).toContain(`xmlns:sm="${ smDescriptor.uri }"`);
    expect(xml).not.toContain('old.example');
  });

  it('сохраняет вид кавычек и не трогает остальные namespace', () => {
    const xml = normalizeSmNamespace(xmlWith('xmlns:sm = \'http://old.example/schema/sm\''));

    expect(xml).toContain(`xmlns:sm = '${ smDescriptor.uri }'`);
    expect(xml).toContain('xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"');
  });

  it('текущий URI и XML без расширения оставляет как есть', () => {
    const current = xmlWith(`xmlns:sm="${ smDescriptor.uri }"`);

    expect(normalizeSmNamespace(current)).toBe(current);
    expect(normalizeSmNamespace('no-diagram')).toBe('no-diagram');
  });

  it('после замены moddle узнаёт атрибуты sm:* схемы с прежним URI', async () => {
    const xml = normalizeSmNamespace(xmlWith('xmlns:sm="http://old.example/schema/sm"'));
    const { rootElement, warnings } = await new BpmnModdle({ sm: smDescriptor }).fromXML(xml);
    const task = (rootElement as any).rootElements[0].flowElements[0];

    expect(warnings).toEqual([]);
    expect(task.get('sm:kind')).toBe('state');
    expect(task.get('sm:code')).toBe('WAIT');
  });
});
