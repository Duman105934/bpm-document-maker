/**
 * Файл проекта .fmg — ZIP-архив:
 *
 *   project.json         — экраны, зоны, переходы, настройки проекта
 *   process.bpmn         — BPMN-схема (обычный .bpmn, открывается и в старом modeler)
 *   screens/<id>.<ext>   — картинки экранов как есть
 *   cover.<ext>          — картинка-обложка (необязательно)
 */

import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import { getAssetPaths, mimeForPath, validateProject } from '../model/project';
import type { Project } from '../model/types';

export const FMG_PROJECT = 'project.json';
export const FMG_BPMN = 'process.bpmn';

/** Уже сжатые форматы кладём без повторного сжатия. */
const STORED = /\.(png|jpe?g|webp|gif)$/i;

export async function packFmg(
    project: Project,
    bpmnXml: string,
    assets: Map<string, Blob>
): Promise<Uint8Array> {
  const files: Zippable = {
    [FMG_PROJECT]: strToU8(JSON.stringify(project, null, 2)),
    [FMG_BPMN]: strToU8(bpmnXml)
  };

  for (const path of new Set(getAssetPaths(project))) {
    const blob = assets.get(path);

    if (!blob) {
      continue;
    }

    const data = new Uint8Array(await blob.arrayBuffer());

    files[path] = STORED.test(path) ? [ data, { level: 0 } ] : data;
  }

  return zipSync(files, { level: 6 });
}

export interface UnpackedFmg {
  project: Project;
  bpmnXml: string | null;
  assets: Map<string, Blob>;
  warnings: string[];
}

export async function unpackFmg(bytes: Uint8Array): Promise<UnpackedFmg> {
  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(bytes);
  } catch (error) {
    throw new Error('Файл повреждён или это не проект .fmg');
  }

  const projectBytes = entries[FMG_PROJECT];

  if (!projectBytes) {
    throw new Error('В файле нет project.json — это не проект .fmg');
  }

  let raw: unknown;

  try {
    raw = JSON.parse(strFromU8(projectBytes));
  } catch (error) {
    throw new Error('project.json повреждён: ' + (error as Error).message);
  }

  const { project, warnings } = validateProject(raw);

  const bpmnBytes = entries[FMG_BPMN];
  const bpmnXml = bpmnBytes ? strFromU8(bpmnBytes) : null;

  if (!bpmnXml) {
    warnings.push('В файле нет process.bpmn — открыта пустая схема');
  }

  const assets = new Map<string, Blob>();

  for (const path of new Set(getAssetPaths(project))) {
    const data = entries[path];

    if (!data) {
      warnings.push(`Нет картинки ${ path }`);
      continue;
    }

    assets.set(path, new Blob([ data as BlobPart ], { type: mimeForPath(path) }));
  }

  return { project, bpmnXml, assets, warnings };
}
