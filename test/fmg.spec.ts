import { describe, it, expect } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';

import { packFmg, unpackFmg } from '../src/io/fmg';
import { createApiCall, createProject } from '../src/model/project';
import type { Project } from '../src/model/types';

const XML = '<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"/>';

function sampleProject(): Project {
  const project = createProject({ name: 'Оплата по QR', code: 'QR_PAY', author: 'Аналитик' });

  project.screens.push({
    id: 'scr_a',
    name: 'Главная',
    code: 'MAIN',
    description: '',
    asset: { path: 'screens/scr_a.png', mime: 'image/png', width: 375, height: 812 },
    position: { x: 10, y: 20 },
    displayWidth: 320,
    hotspots: [
      { id: 'hs_1', name: 'Оплатить', rect: { x: 0.1, y: 0.8, w: 0.8, h: 0.08 }, action: { type: 'navigate', targetScreenId: 'scr_b' } },
      {
        id: 'hs_2',
        name: 'Отправить',
        rect: { x: 0.1, y: 0.5, w: 0.3, h: 0.05 },
        action: { type: 'gateway', call: createApiCall({ gatewayUrl: '/api/pay', bpmnElementId: 'Task_1' }) }
      }
    ],
    onOpenCalls: [ createApiCall({ method: 'GET', gatewayUrl: '/api/profile' }) ]
  }, {
    id: 'scr_b',
    name: 'Успех',
    code: 'SUCCESS',
    description: '',
    asset: { path: 'screens/scr_b.svg', mime: 'image/svg+xml', width: 375, height: 812 },
    position: { x: 400, y: 20 },
    displayWidth: 320,
    hotspots: [],
    onOpenCalls: []
  });

  project.startScreenId = 'scr_a';
  project.meta.coverAsset = { path: 'cover.jpg', mime: 'image/jpeg', width: 100, height: 50 };

  return project;
}

function sampleAssets() {
  return new Map<string, Blob>([
    [ 'screens/scr_a.png', new Blob([ new Uint8Array([ 137, 80, 78, 71, 1, 2, 3 ]) ], { type: 'image/png' }) ],
    [ 'screens/scr_b.svg', new Blob([ '<svg xmlns="http://www.w3.org/2000/svg"/>' ], { type: 'image/svg+xml' }) ],
    [ 'cover.jpg', new Blob([ new Uint8Array([ 255, 216, 255 ]) ], { type: 'image/jpeg' }) ],
    [ 'screens/unused.png', new Blob([ 'x' ]) ]
  ]);
}

describe('fmg', () => {

  it('сохраняет и открывает проект без потерь', async () => {
    const project = sampleProject();
    const bytes = await packFmg(project, XML, sampleAssets());
    const result = await unpackFmg(bytes);

    expect(result.warnings).toEqual([]);
    expect(result.project).toEqual(project);
    expect(result.bpmnXml).toBe(XML);
    expect([ ...result.assets.keys() ].sort()).toEqual([ 'cover.jpg', 'screens/scr_a.png', 'screens/scr_b.svg' ]);

    const png = new Uint8Array(await result.assets.get('screens/scr_a.png')!.arrayBuffer());

    expect([ ...png ]).toEqual([ 137, 80, 78, 71, 1, 2, 3 ]);
    expect(result.assets.get('screens/scr_b.svg')!.type).toBe('image/svg+xml');
  });

  it('не кладёт в архив картинки, на которые проект не ссылается', async () => {
    const bytes = await packFmg(sampleProject(), XML, sampleAssets());

    expect(Object.keys(unzipSync(bytes)).sort()).toEqual([
      'cover.jpg', 'process.bpmn', 'project.json', 'screens/scr_a.png', 'screens/scr_b.svg'
    ]);
  });

  it('битый архив — понятная ошибка', async () => {
    await expect(unpackFmg(new Uint8Array([ 1, 2, 3, 4 ]))).rejects.toThrow(/не проект \.fmg/);
  });

  it('нет project.json — понятная ошибка', async () => {
    const bytes = zipSync({ 'process.bpmn': strToU8(XML) });

    await expect(unpackFmg(bytes)).rejects.toThrow(/нет project\.json/);
  });

  it('нет картинки или схемы — предупреждения, а не отказ', async () => {
    const project = sampleProject();
    const bytes = zipSync({ 'project.json': strToU8(JSON.stringify(project)) });
    const result = await unpackFmg(bytes);

    expect(result.bpmnXml).toBeNull();
    expect(result.project.screens).toHaveLength(2);
    expect(result.warnings.some(w => w.includes('process.bpmn'))).toBe(true);
    expect(result.warnings.some(w => w.includes('screens/scr_a.png'))).toBe(true);
  });

  it('файл более новой версии формата не открывается', async () => {
    const bytes = zipSync({ 'project.json': strToU8(JSON.stringify({ ...sampleProject(), formatVersion: 99 })) });

    await expect(unpackFmg(bytes)).rejects.toThrow(/более новой версией/);
  });

  it('проект без formatVersion открывается как текущая версия (D3)', async () => {
    const raw = sampleProject() as any;

    delete raw.formatVersion;

    const bytes = zipSync({ 'project.json': strToU8(JSON.stringify(raw)) });
    const result = await unpackFmg(bytes);

    expect(result.project.formatVersion).toBe(1);
    expect(result.project.screens.length).toBeGreaterThan(0);
  });
});
