import { describe, it, expect } from 'vitest';

import { createProject, newId, validateProject } from '../src/model/project';

describe('project', () => {

  it('новый проект — пустой, с датой и версией', () => {
    const project = createProject({ name: 'Тест' });

    expect(project.formatVersion).toBe(1);
    expect(project.meta.name).toBe('Тест');
    expect(project.meta.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(project.screens).toEqual([]);
    expect(project.startScreenId).toBeNull();
  });

  it('id с префиксом и уникальные', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId('scr')));

    expect(ids.size).toBe(200);
    [ ...ids ].forEach(id => expect(id).toMatch(/^scr_[0-9a-f]{10}$/));
  });

  it('заполняет значения по умолчанию и чинит мелкие проблемы', () => {
    const { project, warnings } = validateProject({
      formatVersion: 1,
      meta: { name: 'X', author: 42 },
      screens: [
        {
          id: 'scr_a',
          asset: { path: 'screens/scr_a.png' },
          hotspots: [
            { id: 'hs_1', rect: { x: 0.9, y: -1, w: 0.5, h: 2 }, action: { type: 'gateway', call: { method: 'HACK' } } },
            { id: 'hs_2', rect: { x: 0, y: 0, w: 0.1, h: 0.1 }, action: { type: 'unknown' } },
            { name: 'без id' }
          ]
        },
        { id: 'scr_a', asset: { path: 'dup.png' } },
        { id: 'scr_b' }
      ],
      startScreenId: 'scr_missing'
    });

    expect(project.meta.author).toBe('');
    expect(project.meta.version).toBe('1.0');
    expect(project.screens.map(s => s.id)).toEqual([ 'scr_a' ]);
    expect(project.startScreenId).toBe('scr_a');

    const [ hs1, hs2 ] = project.screens[0].hotspots;

    expect(project.screens[0].hotspots).toHaveLength(2);
    expect(hs1.rect).toEqual({ x: 0.9, y: 0, w: expect.closeTo(0.1), h: 1 });
    expect(hs1.action?.type).toBe('gateway');
    expect(hs1.action?.type === 'gateway' && hs1.action.call.method).toBe('POST');
    expect(hs2.action).toBeNull();

    expect(project.screens[0].displayWidth).toBe(320);
    expect(project.screens[0].onOpenCalls).toEqual([]);
    // дубликат экрана, экран без картинки, стартовый экран, зона без id, неизвестное действие
    expect(warnings).toHaveLength(5);
    expect(warnings.some(w => w.includes('зона #3') && w.includes('нет id'))).toBe(true);
    expect(warnings.some(w => w.includes('hs_2') && w.includes('неизвестное действие'))).toBe(true);
  });

  it('предупреждает об отброшенном gateway-вызове и даёт новый id дубликату зоны (D2)', () => {
    const { project, warnings } = validateProject({
      screens: [
        { id: 'a', asset: { path: 'screens/a.png' }, hotspots: [
          { id: 'h', rect: {}, action: { type: 'gateway', call: 'плохо' } },
          { id: 'h', rect: {}, action: null }
        ] },
        { id: 'b', asset: { path: 'screens/b.png' }, hotspots: [ { id: 'h', rect: {} } ] }
      ]
    });
    const ids = project.screens.flatMap(s => s.hotspots.map(h => h.id));

    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('h');
    expect(project.screens[0].hotspots[0].action).toBeNull();
    expect(warnings.filter(w => w.includes('встречается дважды'))).toHaveLength(2);
    expect(warnings.some(w => w.includes('вызов gateway повреждён'))).toBe(true);
  });

  it('пути картинок — только screens/… и cover… (D2)', () => {
    const { project, warnings } = validateProject({
      meta: { coverAsset: { path: 'process.bpmn', mime: 'image/png' } },
      screens: [
        { id: 'a', asset: { path: 'project.json', mime: 'image/jpeg' } },
        { id: 'b', asset: { path: 'screens/../project.json' } },
        { id: 'c', asset: { path: 'screens/c.png' } }
      ]
    });

    expect(project.meta.coverAsset).toBeNull();
    expect(project.screens.map(s => s.asset.path)).toEqual([ 'screens/a.jpg', 'screens/b.png', 'screens/c.png' ]);
    expect(warnings).toHaveLength(3);

    expect(validateProject({ meta: { coverAsset: { path: 'cover_ab12.png' } } }).project.meta.coverAsset?.path)
      .toBe('cover_ab12.png');
  });

  it('migrate: неверная версия и массив (D3)', () => {
    expect(() => validateProject({ formatVersion: '1' })).toThrow(/неверная версия формата/);
    expect(() => validateProject([])).toThrow(/ожидается объект/);
    expect(() => validateProject({ formatVersion: 2 })).toThrow(/более новой версией/);
  });

  it('today — дата по местному времени (D1)', async () => {
    const { today } = await import('../src/model/project');

    // 00:30 местного времени — тот же день, а не вчерашний по UTC
    expect(today(new Date(2026, 10, 15, 0, 30))).toBe('2026-11-15');
    expect(today(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('отвергает не-объект', () => {
    expect(() => validateProject(null)).toThrow();
  });
});
