import { describe, expect, it } from 'vitest';

import { bpmnBridge } from '../src/bpmn/bpmnBridge';

/**
 * Модельер-заглушка с порядком bpmn-js: разбор XML → _setDefinitions → clear() → отрисовка.
 * XML «bad-parse» падает на разборе, «no-diagram» — после очистки канвы.
 */
function fakeModeler(initial: string) {
  let current: { xml: string } | null = null;
  const imported: string[] = [];

  const modeler = {
    imported,
    current: () => current?.xml ?? null,
    on() {},
    get: () => ({ zoom() {} }),
    getDefinitions: () => current,
    async saveXML() {
      if (!current) {
        throw new Error('no definitions loaded');
      }

      return { xml: current.xml };
    },
    async importXML(xml: string) {
      imported.push(xml);

      if (xml === 'bad-parse') {
        throw new Error('unparsable content');
      }

      current = { xml };

      if (xml === 'no-diagram') {
        throw new Error('no diagram to display');
      }

      return { warnings: [] };
    }
  };

  return { modeler, ready: (async () => {
    bpmnBridge.attach(modeler);
    // attach импортирует отложенный или последний XML — дождаться
    await bpmnBridge.importXml(initial);
  })() };
}

describe('bpmnBridge.importXml — откат (A2, A3)', () => {

  it('ошибка после очистки канвы возвращает прежнюю схему', async () => {
    const { modeler, ready } = fakeModeler('schema-A');

    await ready;
    await expect(bpmnBridge.importXml('no-diagram')).rejects.toThrow('no diagram to display');

    expect(modeler.current()).toBe('schema-A');
    expect(await bpmnBridge.getXml()).toBe('schema-A');
    bpmnBridge.detach(modeler);
  });

  it('ошибка разбора не трогает схему и не переимпортирует её', async () => {
    const { modeler, ready } = fakeModeler('schema-B');

    await ready;
    const before = modeler.imported.length;

    await expect(bpmnBridge.importXml('bad-parse')).rejects.toThrow('unparsable');

    expect(modeler.current()).toBe('schema-B');
    expect(modeler.imported.slice(before)).toEqual([ 'bad-parse' ]);
    bpmnBridge.detach(modeler);
  });
});

describe('bpmnBridge.importXml — уничтоженный модельер', () => {

  it('не пытается откатывать импорт в отсоединённый модельер', async () => {
    const { modeler, ready } = fakeModeler('schema-C');

    await ready;
    bpmnBridge.detach(modeler);

    const before = modeler.imported.length;

    // импорт, начатый до detach, падает уже после него
    await expect((bpmnBridge as any).runImport(modeler, 'no-diagram')).rejects.toThrow('no diagram');
    expect(modeler.imported.slice(before)).toEqual([ 'no-diagram' ]);
  });
});
