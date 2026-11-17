import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Handle,
  Position,
  useConnection,
  useUpdateNodeInternals,
  type Node,
  type NodeProps
} from '@xyflow/react';

import { displayHeight } from '../model/geometry';
import type { Rect, Screen } from '../model/types';
import { assets } from '../store/assets';
import { useUiStore } from '../store/uiStore';
import { elementAt } from './detect';
import { getScreenElements } from './elements';
import HotspotOverlay from './HotspotOverlay';

export type ScreenNodeData = {
  screen: Screen;
  isStart: boolean;
};

export type ScreenFlowNode = Node<ScreenNodeData, 'screen'>;

/** id приёмника соединения: весь узел целиком. */
export const SCREEN_TARGET_HANDLE = 'in';

const ELEMENT_HANDLE_PREFIX = 'el:';

/** id точки соединения у найденного элемента экрана: в нём зашит прямоугольник будущей зоны. */
function elementHandleId(rect: Rect): string {
  return ELEMENT_HANDLE_PREFIX + [ rect.x, rect.y, rect.w, rect.h ].map(v => v.toFixed(5)).join(':');
}

/** Прямоугольник из id точки элемента; null — это точка обычной зоны. */
export function parseElementHandle(handleId: string | null | undefined): Rect | null {
  if (!handleId || !handleId.startsWith(ELEMENT_HANDLE_PREFIX)) {
    return null;
  }

  const [ x, y, w, h ] = handleId.slice(ELEMENT_HANDLE_PREFIX.length).split(':').map(Number);

  return [ x, y, w, h ].every(Number.isFinite) ? { x, y, w, h } : null;
}

/** Точка соединения — у правого края зоны или элемента, чуть снаружи (там же ручка размера). */
function handleStyle(rect: Rect) {
  return {
    left: `calc(${ (rect.x + rect.w) * 100 }% + 11px)`,
    top: `${ (rect.y + rect.h / 2) * 100 }%`,
    right: 'auto',
    transform: 'translate(-50%, -50%)'
  };
}

function ScreenNode({ id, data, selected }: NodeProps<ScreenFlowNode>) {
  const { screen, isStart } = data;
  const height = displayHeight(screen.displayWidth, screen.asset);
  const updateNodeInternals = useUpdateNodeInternals();
  // во время протягивания стрелки весь узел становится приёмником
  const connecting = useConnection(connection => connection.inProgress);

  // выбор элементов «как в Figma»: элемент под указателем подсвечивается, от него тянется стрелка
  const tool = useUiStore(s => s.tool);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [ elements, setElements ] = useState<Rect[] | null>(null);
  const [ hover, setHover ] = useState<Rect | null>(null);
  const assetPath = screen.asset.path;

  useEffect(() => {
    setElements(null);
    setHover(null);
  }, [ assetPath ]);

  // стрелка дотянута или брошена — подсветка устарела (элемент мог стать зоной)
  useEffect(() => {
    if (!connecting) {
      setHover(null);
    }
  }, [ connecting ]);

  const requested = useRef<string | null>(null);

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // идёт перетаскивание экрана, зоны или стрелки
    if (event.buttons || connecting) {
      return;
    }

    if (requested.current !== assetPath) {
      requested.current = assetPath;
      getScreenElements(assetPath).then(found => {
        if (requested.current === assetPath) {
          setElements(found);
        }
      });
    }

    const target = event.target as HTMLElement;

    // указатель на точке соединения элемента — элемент остаётся выбранным
    if (target.closest('.element-handle')) {
      return;
    }

    const box = bodyRef.current?.getBoundingClientRect();

    if (!elements || !box || target.closest('[data-hotspot-id], .hotspot-handle')) {
      setHover(null);
      return;
    }

    const point = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
    const next = elementAt(elements, point, screen.hotspots.map(h => h.rect));

    setHover(prev => (prev === next ? prev : next));
  };

  // положение source handle зависит от зон и выбранного элемента — пересчитать после их изменения
  const handlesKey = screen.hotspots.map(h => `${ h.id }:${ h.rect.x }:${ h.rect.y }:${ h.rect.w }:${ h.rect.h }`).join('|') +
    (hover && tool === 'select' ? elementHandleId(hover) : '');

  useEffect(() => {
    updateNodeInternals(id);
  }, [ id, handlesKey, screen.displayWidth, height, updateNodeInternals ]);

  const url = assets.getUrl(screen.asset.path);

  return (
    <div className={ `screen-node ${ selected ? 'screen-node--selected' : '' }` } style={ { width: screen.displayWidth } }>
      <div className="screen-node__header" title={ screen.name }>
        { isStart && <span className="screen-node__start">Старт</span> }
        <span className="screen-node__name">{ screen.name || 'Без названия' }</span>
        { screen.code && <span className="screen-node__code">{ screen.code }</span> }
        { screen.onOpenCalls.length > 0 && (
          <span className="screen-node__calls" title={ `Вызовов при открытии: ${ screen.onOpenCalls.length }` }>
            ⇄ { screen.onOpenCalls.length }
          </span>
        ) }
      </div>

      <div
        ref={ bodyRef }
        className="screen-node__body"
        style={ { height } }
        onPointerMove={ onPointerMove }
        onPointerLeave={ () => !connecting && setHover(null) }
      >
        { url
          ? <img className="screen-node__image" src={ url } alt={ screen.name } draggable={ false } />
          : <div className="screen-node__missing">Нет картинки { screen.asset.path }</div> }

        <HotspotOverlay screen={ screen } height={ height } hover={ hover } />

        {/* у gateway-зоны точки нет: переход заменил бы весь вызов (URL, JSON, узел схемы) */}
        { screen.hotspots.filter(hotspot => hotspot.action?.type !== 'gateway').map(hotspot => (
          <Handle
            key={ hotspot.id }
            id={ hotspot.id }
            type="source"
            position={ Position.Right }
            className={ `hotspot-handle ${ hotspot.action?.type === 'navigate' ? 'hotspot-handle--linked' : '' }` }
            style={ handleStyle(hotspot.rect) }
            title="Потяните на экран, чтобы задать переход"
          />
        )) }

        {/* элемент под указателем: потянуть от точки — появятся зона и переход */}
        { hover && tool === 'select' && (
          <Handle
            id={ elementHandleId(hover) }
            type="source"
            position={ Position.Right }
            className="hotspot-handle element-handle"
            style={ handleStyle(hover) }
            title="Потяните на другой экран — появится зона с переходом"
          />
        ) }
      </div>

      <Handle
        id={ SCREEN_TARGET_HANDLE }
        type="target"
        position={ Position.Left }
        isConnectableStart={ false }
        className={ `screen-target ${ connecting ? 'screen-target--active' : '' }` }
      />
    </div>
  );
}

export default memo(ScreenNode);
