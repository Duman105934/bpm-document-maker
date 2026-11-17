import { beforeEach, describe, expect, it } from 'vitest';

import { useProjectStore } from '../src/store/projectStore';

describe('projectStore.markSaved (A1)', () => {

  beforeEach(() => {
    useProjectStore.getState().newProject({ name: 'P' });
  });

  it('снимок совпадает с текущим состоянием — dirty снимается', () => {
    const { project, bpmnRevision } = useProjectStore.getState();

    useProjectStore.getState().markSaved('p.fmg', null, { project, bpmnRevision });

    expect(useProjectStore.getState()).toMatchObject({ dirty: false, fileName: 'p.fmg' });
  });

  it('проект изменили, пока шла запись, — dirty остаётся, имя файла обновляется', () => {
    const { project, bpmnRevision } = useProjectStore.getState();

    useProjectStore.getState().updateMeta({ name: 'P2' });
    useProjectStore.getState().markSaved('p.fmg', null, { project, bpmnRevision });

    expect(useProjectStore.getState()).toMatchObject({ dirty: true, fileName: 'p.fmg' });
  });

  it('схему изменили, пока шла запись, — dirty остаётся', () => {
    const { project, bpmnRevision } = useProjectStore.getState();

    useProjectStore.getState().touchBpmn();
    useProjectStore.getState().markSaved('p.fmg', null, { project, bpmnRevision });

    expect(useProjectStore.getState().dirty).toBe(true);
  });
});

describe('projectStore.updateProject — действие без изменений (C8)', () => {

  it('рецепт без изменений не трогает dirty и историю, redo сохраняется', async () => {
    const { undoProject } = await import('../src/store/projectStore');

    useProjectStore.getState().newProject({ name: 'P' });
    useProjectStore.getState().updateMeta({ name: 'P2' });
    undoProject();

    const history = useProjectStore.temporal.getState();

    expect(history.futureStates).toHaveLength(1);

    useProjectStore.getState().markSaved('p.fmg');

    const before = useProjectStore.getState().project;

    // «Настройки → Сохранить» без правок
    useProjectStore.getState().updateMeta({ name: 'P' });
    // рецепт сообщил, что ничего не менял
    useProjectStore.getState().updateProject(project => {
      project.meta.code = 'X';

      return false;
    });

    expect(useProjectStore.getState().project).toBe(before);
    expect(useProjectStore.getState().dirty).toBe(false);
    expect(useProjectStore.temporal.getState().futureStates).toHaveLength(1);
  });

  it('после undo выделение удалённой зоны сбрасывается на экран', async () => {
    const { undoProject } = await import('../src/store/projectStore');
    const { useUiStore } = await import('../src/store/uiStore');
    const { screen } = await import('./fixtures');

    useProjectStore.getState().newProject({ name: 'P' });
    useProjectStore.getState().updateProject(project => {
      project.screens.push(screen('s1'));
    });
    useProjectStore.getState().updateProject(project => {
      project.screens[0].hotspots.push({ id: 'h1', name: 'h1', rect: { x: 0, y: 0, w: 0.1, h: 0.1 }, action: null });
    });
    useUiStore.getState().select({ type: 'hotspot', screenId: 's1', hotspotId: 'h1' });

    undoProject();

    expect(useUiStore.getState().selection).toEqual({ type: 'screen', screenId: 's1' });
  });
});
