import {
  HTTP_METHODS,
  type Action,
  type ApiCall,
  type Asset,
  type Hotspot,
  type Project,
  type ProjectMeta,
  type Rect,
  type Screen
} from './types';

export const FORMAT_VERSION = 1;
export const APP_VERSION = '0.1.0';

export const DEFAULT_DISPLAY_WIDTH = 320;

/** Короткий уникальный id с префиксом: scr_…, hs_…, call_… */
export function newId(prefix: string): string {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(16).slice(2) + Date.now().toString(16);

  return `${ prefix }_${ uuid.replace(/-/g, '').slice(0, 10) }`;
}

/** Сегодняшняя дата по локальному времени (toISOString дал бы дату по UTC — с 00:00 до 05:00 в UTC+5 вчерашнюю). */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${ now.getFullYear() }-${ pad(now.getMonth() + 1) }-${ pad(now.getDate()) }`;
}

export function emptyMeta(): ProjectMeta {
  return {
    name: '',
    code: '',
    description: '',
    author: '',
    version: '1.0',
    date: today(),
    coverAsset: null
  };
}

export function createProject(meta: Partial<ProjectMeta> = {}): Project {
  return {
    formatVersion: FORMAT_VERSION,
    appVersion: APP_VERSION,
    meta: { ...emptyMeta(), ...meta },
    screens: [],
    startScreenId: null
  };
}

export function createApiCall(partial: Partial<ApiCall> = {}): ApiCall {
  return {
    id: newId('call'),
    name: '',
    method: 'POST',
    gatewayUrl: '',
    service: '',
    serviceUrl: '',
    requestJson: '',
    responseJson: '',
    description: '',
    ...partial
  };
}

// миграция и проверка ////////////////////

/**
 * Привести данные старых версий формата к текущей.
 * Сейчас версия одна; функция — точка расширения.
 */
export function migrate(raw: any): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('project.json: ожидается объект');
  }

  const version = raw.formatVersion ?? FORMAT_VERSION;

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(`project.json: неверная версия формата (${ JSON.stringify(version) })`);
  }

  if (version > FORMAT_VERSION) {
    throw new Error(`Файл создан более новой версией программы (формат ${ version }). Обновите программу.`);
  }

  return { ...raw, formatVersion: FORMAT_VERSION };
}

/**
 * Проверить и нормализовать проект: заполнить значения по умолчанию,
 * отбросить явно битые записи. Не бросает на мелких проблемах — пишет warnings.
 */
export function validateProject(input: any): { project: Project; warnings: string[] } {
  const warnings: string[] = [];
  const raw = migrate(input);

  const meta: ProjectMeta = {
    ...emptyMeta(),
    ...pickStrings(raw.meta, [ 'name', 'code', 'description', 'author', 'version', 'date' ]),
    coverAsset: null
  };

  const cover = normalizeAsset(raw.meta?.coverAsset);

  if (cover && !isCoverPath(cover.path)) {
    warnings.push(`Обложка «${ cover.path }» убрана: путь должен начинаться с cover`);
  } else {
    meta.coverAsset = cover;
  }

  const screens: Screen[] = [];
  const seen = new Set<string>();
  const hotspotIds = new Set<string>();

  (Array.isArray(raw.screens) ? raw.screens : []).forEach((s: any, index: number) => {
    const asset = normalizeAsset(s?.asset);

    if (!s || typeof s.id !== 'string' || !s.id || !asset) {
      warnings.push(`Экран #${ index + 1} пропущен: нет id или картинки`);
      return;
    }

    if (seen.has(s.id)) {
      warnings.push(`Экран ${ s.id } встречается дважды, повтор пропущен`);
      return;
    }

    seen.add(s.id);

    // путь вида project.json или process.bpmn перезаписал бы запись архива байтами картинки
    if (!isScreenPath(asset.path)) {
      const safe = `screens/${ s.id }.${ extForMime(asset.mime) }`;

      warnings.push(`Экран ${ s.id }: путь картинки «${ asset.path }» заменён на ${ safe }`);
      asset.path = safe;
    }

    const hotspots: Hotspot[] = [];

    (Array.isArray(s.hotspots) ? s.hotspots : []).forEach((h: any, hIndex: number) => {
      const hotspot = normalizeHotspot(h, warnings, `Экран ${ s.id }, зона #${ hIndex + 1 }`);

      if (!hotspot) {
        return;
      }

      // id зоны — ключ стрелки nav_<id>, выделения и удаления: дубликат получает новый
      if (hotspotIds.has(hotspot.id)) {
        const fresh = newId('hs');

        warnings.push(`Экран ${ s.id }: зона ${ hotspot.id } встречается дважды, повтору дан id ${ fresh }`);
        hotspot.id = fresh;
      }

      hotspotIds.add(hotspot.id);
      hotspots.push(hotspot);
    });

    screens.push({
      id: s.id,
      name: str(s.name),
      code: str(s.code),
      description: str(s.description),
      asset,
      position: {
        x: num(s.position?.x, 0),
        y: num(s.position?.y, 0)
      },
      displayWidth: num(s.displayWidth, DEFAULT_DISPLAY_WIDTH) || DEFAULT_DISPLAY_WIDTH,
      hotspots,
      onOpenCalls: (Array.isArray(s.onOpenCalls) ? s.onOpenCalls : []).flatMap((c: any, cIndex: number) => {
        const call = normalizeApiCall(c);

        if (!call) {
          warnings.push(`Экран ${ s.id }: вызов при открытии #${ cIndex + 1 } повреждён, пропущен`);
        }

        return call ? [ call ] : [];
      })
    });
  });

  let startScreenId: string | null = typeof raw.startScreenId === 'string' ? raw.startScreenId : null;

  if (startScreenId && !seen.has(startScreenId)) {
    warnings.push('Стартовый экран не найден, назначен первый');
    startScreenId = null;
  }

  if (!startScreenId && screens.length) {
    startScreenId = screens[0].id;
  }

  return {
    project: {
      formatVersion: FORMAT_VERSION,
      appVersion: str(raw.appVersion) || APP_VERSION,
      meta,
      screens,
      startScreenId
    },
    warnings
  };
}

function normalizeAsset(a: any): Asset | null {
  if (!a || typeof a.path !== 'string' || !a.path) {
    return null;
  }

  return {
    path: a.path,
    mime: str(a.mime) || 'image/png',
    width: num(a.width, 0),
    height: num(a.height, 0)
  };
}

function normalizeHotspot(h: any, warnings: string[], where: string): Hotspot | null {
  if (!h || typeof h.id !== 'string' || !h.id) {
    warnings.push(`${ where } пропущена: нет id`);
    return null;
  }

  return {
    id: h.id,
    name: str(h.name),
    rect: normalizeRectValue(h.rect),
    action: normalizeAction(h.action, warnings, `${ where } (${ h.id })`)
  };
}

function normalizeAction(a: any, warnings: string[], where: string): Action | null {
  if (a === null || a === undefined) {
    return null;
  }

  if (typeof a === 'object' && a.type === 'navigate' && typeof a.targetScreenId === 'string') {
    return { type: 'navigate', targetScreenId: a.targetScreenId };
  }

  if (typeof a === 'object' && a.type === 'gateway') {
    const call = normalizeApiCall(a.call);

    if (call) {
      return { type: 'gateway', call };
    }

    warnings.push(`${ where }: вызов gateway повреждён, действие снято`);
    return null;
  }

  warnings.push(`${ where }: неизвестное действие, снято`);
  return null;
}

/** Картинки экранов лежат только в screens/, обложка — cover…; без «..» и абсолютных путей. */
function isScreenPath(path: string): boolean {
  return /^screens\/[^/\\]+$/.test(path) && !path.includes('..');
}

function isCoverPath(path: string): boolean {
  return /^cover[^/\\]*$/.test(path) && !path.includes('..');
}

function normalizeApiCall(c: any): ApiCall | null {
  if (!c || typeof c !== 'object') {
    return null;
  }

  const method = HTTP_METHODS.includes(c.method) ? c.method : 'POST';

  return {
    id: typeof c.id === 'string' && c.id ? c.id : newId('call'),
    name: str(c.name),
    method,
    gatewayUrl: str(c.gatewayUrl),
    service: str(c.service),
    serviceUrl: str(c.serviceUrl),
    requestJson: str(c.requestJson),
    responseJson: str(c.responseJson),
    description: str(c.description),
    ...(typeof c.bpmnElementId === 'string' && c.bpmnElementId ? { bpmnElementId: c.bpmnElementId } : {})
  };
}

function normalizeRectValue(r: any): Rect {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const x = clamp(num(r?.x, 0));
  const y = clamp(num(r?.y, 0));

  return {
    x,
    y,
    w: Math.min(1 - x, Math.max(0, num(r?.w, 0.1))),
    h: Math.min(1 - y, Math.max(0, num(r?.h, 0.05)))
  };
}

function pickStrings(obj: any, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  keys.forEach(key => {
    if (obj && typeof obj[key] === 'string') {
      result[key] = obj[key];
    }
  });

  return result;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Все пути ассетов, на которые ссылается проект. */
export function getAssetPaths(project: Project): string[] {
  const paths = project.screens.map(s => s.asset.path);

  if (project.meta.coverAsset) {
    paths.push(project.meta.coverAsset.path);
  }

  return paths;
}

export function extForMime(mime: string): string {
  switch (mime) {
  case 'image/jpeg': return 'jpg';
  case 'image/webp': return 'webp';
  case 'image/svg+xml': return 'svg';
  case 'image/gif': return 'gif';
  default: return 'png';
  }
}

export function mimeForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();

  switch (ext) {
  case 'jpg':
  case 'jpeg': return 'image/jpeg';
  case 'webp': return 'image/webp';
  case 'svg': return 'image/svg+xml';
  case 'gif': return 'image/gif';
  default: return 'image/png';
  }
}
