import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import {
  RESIZE_HANDLES,
  clampPoint,
  containsPoint,
  moveRect,
  normalizeRect,
  rectsEqual,
  resizeRect,
  type MinSize,
  type Point,
  type ResizeHandle
} from '../model/geometry';
import type { Rect, Screen } from '../model/types';
import { useUiStore } from '../store/uiStore';
import { addHotspot, setHotspotRect } from './actions';

/** Минимальная сторона зоны в пикселях показа (при ширине displayWidth). */
const MIN_SIDE_PX = 8;
/** Перемещение указателя меньше этого (экранные px) — клик, а не рисование, перемещение или изменение размера. */
const CLICK_TOLERANCE_PX = 4;

type Drag =
  | { kind: 'draw'; start: Point; client: Point; rect: Rect }
  | { kind: 'move'; id: string; start: Point; client: Point; orig: Rect; rect: Rect }
  | { kind: 'resize'; id: string; handle: ResizeHandle; start: Point; client: Point; orig: Rect; rect: Rect };

interface Props {
  screen: Screen;
  /** высота показа картинки, px */
  height: number;
  /** найденный элемент экрана под указателем (см. detect.ts) */
  hover?: Rect | null;
}

/**
 * Зоны поверх картинки экрана. Координаты считаются от getBoundingClientRect()
 * оверлея и сразу переводятся в доли 0..1 — поэтому работают на любом zoom.
 */
export default function HotspotOverlay({ screen, height, hover = null }: Props) {
  const tool = useUiStore(s => s.tool);
  const selection = useUiStore(s => s.selection);
  const ref = useRef<HTMLDivElement>(null);
  const [ drag, setDrag ] = useState<Drag | null>(null);

  const drawing = tool === 'hotspot';
  const selectedId = selection?.type === 'hotspot' && selection.screenId === screen.id ? selection.hotspotId : null;
  const min: MinSize = { w: MIN_SIDE_PX / screen.displayWidth, h: MIN_SIDE_PX / height };

  const toFrac = (event: { clientX: number; clientY: number }): Point => {
    const box = ref.current!.getBoundingClientRect();

    return clampPoint({
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height
    });
  };

  const select = (hotspotId: string | null) => {
    useUiStore.getState().select(hotspotId
      ? { type: 'hotspot', screenId: screen.id, hotspotId }
      : { type: 'screen', screenId: screen.id });
  };

  const capture = (event: ReactPointerEvent) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ref.current) {
      return;
    }

    const target = event.target as HTMLElement;
    const point = toFrac(event);

    if (drawing) {
      event.stopPropagation();
      capture(event);
      setDrag({ kind: 'draw', start: point, client: { x: event.clientX, y: event.clientY }, rect: normalizeRect(point, point) });
      return;
    }

    const hotspotId = target.closest<HTMLElement>('[data-hotspot-id]')?.dataset.hotspotId;
    const hotspot = hotspotId && screen.hotspots.find(h => h.id === hotspotId);

    if (!hotspot) {
      return;
    }

    event.stopPropagation();
    capture(event);
    select(hotspot.id);

    const handle = target.dataset.resize as ResizeHandle | undefined;

    const client = { x: event.clientX, y: event.clientY };

    setDrag(handle
      ? { kind: 'resize', id: hotspot.id, handle, start: point, client, orig: hotspot.rect, rect: hotspot.rect }
      : { kind: 'move', id: hotspot.id, start: point, client, orig: hotspot.rect, rect: hotspot.rect });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) {
      return;
    }

    const point = toFrac(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;

    // клик с дрожанием руки — не перемещение: зона не сдвигается, пока указатель не ушёл на порог
    if (drag.kind !== 'draw' && rectsEqual(drag.rect, drag.orig) &&
      Math.hypot(event.clientX - drag.client.x, event.clientY - drag.client.y) < CLICK_TOLERANCE_PX) {
      return;
    }

    switch (drag.kind) {
    case 'draw':
      setDrag({ ...drag, rect: normalizeRect(drag.start, point) });
      break;
    case 'move':
      setDrag({ ...drag, rect: moveRect(drag.orig, dx, dy) });
      break;
    case 'resize':
      setDrag({ ...drag, rect: resizeRect(drag.orig, drag.handle, dx, dy, min) });
      break;
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) {
      return;
    }

    setDrag(null);

    if (drag.kind === 'draw') {
      const moved = Math.hypot(event.clientX - drag.client.x, event.clientY - drag.client.y);

      if (moved < CLICK_TOLERANCE_PX) {
        // клик в режиме рисования — выбрать зону под указателем (самую маленькую) или сделать зону из элемента
        const hit = screen.hotspots
          .filter(h => containsPoint(h.rect, drag.start))
          .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h)[0];

        if (hit) {
          select(hit.id);
        } else if (hover && containsPoint(hover, drag.start)) {
          // клик по найденному элементу экрана — зона по его границам
          select(addHotspot(screen.id, hover));
        } else {
          select(null);
        }

        return;
      }

      const rect = {
        ...drag.rect,
        w: Math.max(drag.rect.w, min.w),
        h: Math.max(drag.rect.h, min.h)
      };

      select(addHotspot(screen.id, moveRect(rect, 0, 0)));
      return;
    }

    if (!rectsEqual(drag.rect, drag.orig)) {
      setHotspotRect(screen.id, drag.id, drag.rect);
    }
  };

  const rectOf = (id: string, rect: Rect) =>
    drag && drag.kind !== 'draw' && drag.id === id ? drag.rect : rect;

  return (
    <div
      ref={ ref }
      className={ `hotspot-overlay ${ drawing ? 'hotspot-overlay--draw nodrag nopan' : '' }` }
      onPointerDown={ onPointerDown }
      onPointerMove={ onPointerMove }
      onPointerUp={ onPointerUp }
      onPointerCancel={ () => setDrag(null) }
      // клик не должен доходить до узла: иначе выделение сменится на экран
      onClick={ event => (drawing || (event.target as HTMLElement).closest('[data-hotspot-id]')) && event.stopPropagation() }
    >
      { screen.hotspots.map((hotspot, index) => {
        const rect = rectOf(hotspot.id, hotspot.rect);
        const selected = hotspot.id === selectedId;
        const kind = hotspot.action?.type ?? 'none';

        return (
          <div
            key={ hotspot.id }
            data-hotspot-id={ hotspot.id }
            className={ `hotspot hotspot--${ kind } ${ selected ? 'hotspot--selected' : '' } nodrag nopan` }
            style={ toStyle(rect) }
            title={ hotspot.name || `Зона ${ index + 1 }` }
          >
            <span className="hotspot-number">{ index + 1 }</span>
            { kind === 'gateway' && <span className="hotspot-gateway" title="Вызов backend через gateway">⇄</span> }
            { selected && !drawing && RESIZE_HANDLES.map(handle => (
              <span key={ handle } data-resize={ handle } className={ `hotspot-resize hotspot-resize--${ handle }` } />
            )) }
          </div>
        );
      }) }

      { hover && !drag && (
        <div className={ `element-hint ${ drawing ? 'element-hint--pick' : '' }` } style={ toStyle(hover) } />
      ) }

      { drag?.kind === 'draw' && <div className="hotspot hotspot--draft" style={ toStyle(drag.rect) } /> }
    </div>
  );
}

function toStyle(rect: Rect) {
  return {
    left: `${ rect.x * 100 }%`,
    top: `${ rect.y * 100 }%`,
    width: `${ rect.w * 100 }%`,
    height: `${ rect.h * 100 }%`
  };
}
