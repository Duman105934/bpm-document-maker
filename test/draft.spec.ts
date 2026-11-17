// @vitest-environment node
// Blob из jsdom не клонируется в IndexedDB — нужен родной Blob Node.

import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';
import { createStore, delMany, keys } from 'idb-keyval';

import { clearDraft, loadDraft, saveDraft } from '../src/io/draft';
import { createProject } from '../src/model/project';
import type { Project } from '../src/model/types';
import { draftChanged } from '../src/app/useDraftAutosave';
import { screen } from './fixtures';

function projectWithCover(name: string): Project {
  const project = createProject({ name });

  project.meta.coverAsset = { path: 'cover.png', mime: 'image/png', width: 10, height: 10 };
  project.screens.push(screen('s1'));

  return project;
}

async function text(blob: Blob | undefined) {
  return blob ? blob.text() : null;
}

describe('draft', () => {

  beforeEach(async () => {
    await clearDraft();
  });

  it('после открытия другого проекта с тем же путём картинки хранит новый Blob (A4)', async () => {
    const a = projectWithCover('A');

    await saveDraft({ project: a, bpmnXml: '<a/>', fileName: 'a.fmg', dirty: false }, new Map([
      [ 'cover.png', new Blob([ 'cover A' ]) ],
      [ 'screens/s1.png', new Blob([ 'screen A' ]) ]
    ]));

    // openProjectFile очищает черновик перед загрузкой другого проекта
    await clearDraft();

    const b = projectWithCover('B');

    await saveDraft({ project: b, bpmnXml: '<b/>', fileName: 'b.fmg', dirty: false }, new Map([
      [ 'cover.png', new Blob([ 'cover B' ]) ],
      [ 'screens/s1.png', new Blob([ 'screen B' ]) ]
    ]));

    const loaded = await loadDraft();

    expect(loaded?.draft.project.meta.name).toBe('B');
    expect(await text(loaded?.assets.get('cover.png'))).toBe('cover B');
    expect(await text(loaded?.assets.get('screens/s1.png'))).toBe('screen B');
  });

  it('дописывает картинки, которые удалила другая вкладка (A5)', async () => {
    const project = projectWithCover('X');
    const blobs = new Map([
      [ 'cover.png', new Blob([ 'cover' ]) ],
      [ 'screens/s1.png', new Blob([ 'screen' ]) ]
    ]);

    await saveDraft({ project, bpmnXml: '<x/>', fileName: null, dirty: true }, blobs);

    // другая вкладка: «Новый» — clearDraft в своём модуле, наш writtenAssets об этом не знает
    const db = createStore('bpm-document-maker', 'drafts');
    const assetKeys = (await keys(db)).map(String).filter(key => key.startsWith('draft:asset:'));

    expect(assetKeys).toHaveLength(2);
    await delMany(assetKeys, db);

    await saveDraft({ project, bpmnXml: '<x/>', fileName: null, dirty: true }, blobs);

    const loaded = await loadDraft();

    expect([ ...(loaded?.assets.keys() ?? []) ].sort()).toEqual([ 'cover.png', 'screens/s1.png' ]);
  });

  it('удаляет картинки, на которые проект больше не ссылается', async () => {
    const project = projectWithCover('X');

    await saveDraft({ project, bpmnXml: '<x/>', fileName: null, dirty: true }, new Map([
      [ 'cover.png', new Blob([ 'cover' ]) ],
      [ 'screens/s1.png', new Blob([ 'screen' ]) ]
    ]));

    const next = structuredClone(project);

    next.meta.coverAsset = null;
    await saveDraft({ project: next, bpmnXml: '<x/>', fileName: null, dirty: true }, new Map());

    const db = createStore('bpm-document-maker', 'drafts');

    expect((await keys(db)).map(String).sort()).toEqual([ 'draft:asset:screens/s1.png', 'draft:project' ]);
  });
});

describe('draftChanged (A8)', () => {

  const base = { project: null, dirty: true, fileName: null, bpmnRevision: 1 };

  it('реагирует на новую ревизию схемы в уже изменённом проекте', () => {
    expect(draftChanged({ ...base, bpmnRevision: 2 }, base)).toBe(true);
  });

  it('без изменений — нет записи', () => {
    expect(draftChanged({ ...base }, base)).toBe(false);
  });
});
