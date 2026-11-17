/**
 * Черновик в IndexedDB: последнее состояние проекта переживает перезагрузку вкладки.
 *
 *   draft:project       — { project, bpmnXml, fileName, dirty, savedAt }
 *   draft:asset:<path>  — Blob картинки (пишется один раз при появлении)
 */

import { createStore, del, get, keys, set, delMany, type UseStore } from 'idb-keyval';

import { getAssetPaths } from '../model/project';
import type { Project } from '../model/types';

const PROJECT_KEY = 'draft:project';
const ASSET_PREFIX = 'draft:asset:';

export interface Draft {
  project: Project;
  bpmnXml: string;
  fileName: string | null;
  dirty: boolean;
  savedAt: string;
}

let store: UseStore | null = null;

function db(): UseStore {
  if (!store) {
    store = createStore('bpm-document-maker', 'drafts');
  }

  return store;
}

/**
 * Пути картинок, уже записанных в черновик в этой сессии. Только подсказка:
 * другая вкладка может удалить ключи, поэтому перед записью наличие сверяется с базой.
 */
const writtenAssets = new Set<string>();

export async function saveDraft(draft: Omit<Draft, 'savedAt'>, assets: Map<string, Blob>): Promise<void> {
  const needed = new Set(getAssetPaths(draft.project));
  const present = new Set((await keys(db())).map(String));

  for (const path of needed) {
    if (writtenAssets.has(path) && present.has(ASSET_PREFIX + path)) {
      continue;
    }

    const blob = assets.get(path);

    if (blob) {
      await set(ASSET_PREFIX + path, blob, db());
      writtenAssets.add(path);
    }
  }

  await set(PROJECT_KEY, { ...draft, savedAt: new Date().toISOString() }, db());

  // картинки, на которые проект больше не ссылается
  const stale = [ ...present ]
    .filter(key => key.startsWith(ASSET_PREFIX) && !needed.has(key.slice(ASSET_PREFIX.length)));

  if (stale.length) {
    await delMany(stale, db());
    stale.forEach(key => writtenAssets.delete(key.slice(ASSET_PREFIX.length)));
  }
}

/** Картинку заменили под тем же путём — перезаписать при следующем сохранении. */
export function invalidateDraftAsset(path: string) {
  writtenAssets.delete(path);
}

export async function loadDraft(): Promise<{ draft: Draft; assets: Map<string, Blob> } | null> {
  const draft = await get<Draft>(PROJECT_KEY, db());

  if (!draft || !draft.project) {
    return null;
  }

  const assets = new Map<string, Blob>();

  for (const path of getAssetPaths(draft.project)) {
    const blob = await get<Blob>(ASSET_PREFIX + path, db());

    if (blob) {
      assets.set(path, blob);
      writtenAssets.add(path);
    }
  }

  return { draft, assets };
}

export async function clearDraft(): Promise<void> {
  const all = (await keys(db())).map(String).filter(key => key === PROJECT_KEY || key.startsWith(ASSET_PREFIX));

  await delMany(all, db());
  writtenAssets.clear();
}

export async function deleteDraftProject(): Promise<void> {
  await del(PROJECT_KEY, db());
}
