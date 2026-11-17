/**
 * Модель проекта документации.
 *
 * BPMN-схема в модель не входит: её источник правды — модельер,
 * XML снимается через saveXML при сохранении (см. bpmn/bpmnBridge.ts).
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const HTTP_METHODS: HttpMethod[] = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ];

/** Прямоугольник в долях 0..1 от размеров картинки экрана. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Вызов backend через API Gateway. */
export interface ApiCall {
  id: string;
  name: string;
  method: HttpMethod;
  /** внешний URL на API Gateway */
  gatewayUrl: string;
  /** микросервис, в который gateway маршрутизирует запрос */
  service: string;
  /** внутренний URL микросервиса */
  serviceUrl: string;
  requestJson: string;
  responseJson: string;
  description: string;
  /** id узла BPMN-схемы, с которого начинается обработка */
  bpmnElementId?: string;
}

export type Action =
  | { type: 'navigate'; targetScreenId: string }
  | { type: 'gateway'; call: ApiCall };

export interface Hotspot {
  id: string;
  name: string;
  rect: Rect;
  /** null — зона нарисована, действие ещё не выбрано */
  action: Action | null;
}

export interface Asset {
  /** путь внутри .fmg, например screens/scr_ab12.png */
  path: string;
  mime: string;
  width: number;
  height: number;
}

export interface Screen {
  id: string;
  name: string;
  code: string;
  description: string;
  asset: Asset;
  position: { x: number; y: number };
  /** ширина показа на canvas, px (экспорт из Figma бывает 1x/2x/3x) */
  displayWidth: number;
  hotspots: Hotspot[];
  /** вызовы backend при открытии экрана (без нажатия) */
  onOpenCalls: ApiCall[];
}

export interface ProjectMeta {
  name: string;
  code: string;
  description: string;
  author: string;
  version: string;
  /** YYYY-MM-DD */
  date: string;
  coverAsset?: Asset | null;
}

export interface Project {
  formatVersion: 1;
  appVersion: string;
  meta: ProjectMeta;
  screens: Screen[];
  startScreenId: string | null;
}
