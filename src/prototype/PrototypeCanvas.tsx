import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnBeforeDelete
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { isEditable } from '../app/dom';
import Icon from '../app/Icon';
import { isImageFile } from '../io/images';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { addHotspot, addScreens, clearNavigations, moveScreen, removeHotspot, setHotspotNavigate } from './actions';
import ScreenNode, { SCREEN_TARGET_HANDLE, parseElementHandle, type ScreenFlowNode } from './ScreenNode';

const nodeTypes = { screen: ScreenNode };

const EDGE_COLOR = '#2D5BE3';
const DELETE_KEYS = [ 'Delete', 'Backspace' ];

/** Изменения узлов, которые принимаем от React Flow (выделение и удаление — свои). */
const LOCAL_NODE_CHANGES = new Set([ 'position', 'dimensions' ]);

type HotspotEdge = Edge<{ screenId: string; hotspotId: string }>;

export default function PrototypeCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}

function Canvas() {
  const screens = useProjectStore(s => s.project!.screens);
  const startScreenId = useProjectStore(s => s.project!.startScreenId);
  const selection = useUiStore(s => s.selection);
  const tool = useUiStore(s => s.tool);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);

  // узлы: из проекта, но React Flow хранит в них measured и позицию во время перетаскивания
  const [ nodes, setNodes ] = useState<ScreenFlowNode[]>([]);

  useEffect(() => {
    setNodes(prev => {
      const byId = new Map(prev.map(node => [ node.id, node ]));

      return screens.map(screen => {
        const old = byId.get(screen.id);

        return {
          ...old,
          id: screen.id,
          type: 'screen' as const,
          position: old?.dragging ? old.position : screen.position,
          dragHandle: '.screen-node__header, .screen-node__image',
          data: { screen, isStart: screen.id === startScreenId },
          selected: selection?.screenId === screen.id
        };
      });
    });
  }, [ screens, startScreenId, selection ]);

  const onNodesChange = useCallback((changes: NodeChange<ScreenFlowNode>[]) => {
    const local = changes.filter(change => LOCAL_NODE_CHANGES.has(change.type));

    if (local.length) {
      setNodes(nds => applyNodeChanges(local, nds));
    }
  }, []);

  // стрелки: из зон с переходом; выделение стрелок — локальное
  const [ selectedEdges, setSelectedEdges ] = useState<Set<string>>(() => new Set());

  const edges = useMemo<HotspotEdge[]>(() => {
    const ids = new Set(screens.map(s => s.id));

    return screens.flatMap(screen => screen.hotspots.flatMap(hotspot => {
      const action = hotspot.action;

      if (action?.type !== 'navigate' || !ids.has(action.targetScreenId)) {
        return [];
      }

      const id = `nav_${ hotspot.id }`;

      return [ {
        id,
        source: screen.id,
        sourceHandle: hotspot.id,
        target: action.targetScreenId,
        targetHandle: SCREEN_TARGET_HANDLE,
        selected: selectedEdges.has(id),
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 },
        style: { stroke: EDGE_COLOR, strokeWidth: 2 },
        data: { screenId: screen.id, hotspotId: hotspot.id }
      } ];
    }));
  }, [ screens, selectedEdges ]);

  const onEdgesChange = useCallback((changes: EdgeChange<HotspotEdge>[]) => {
    const select = changes.filter(change => change.type === 'select');

    if (!select.length) {
      return;
    }

    setSelectedEdges(prev => {
      const next = new Set(prev);

      select.forEach(change => change.selected ? next.add(change.id) : next.delete(change.id));

      return next;
    });
  }, []);

  // выбор экрана или зоны снимает выделение стрелок
  useEffect(() => {
    if (selection) {
      setSelectedEdges(prev => prev.size ? new Set() : prev);
    }
  }, [ selection ]);

  const isValidConnection = useCallback<IsValidConnection>(connection =>
    !!connection.sourceHandle && connection.target !== connection.source, []);

  const onConnect = useCallback((connection: Connection) => {
    const source = useProjectStore.getState().project?.screens.find(screen => screen.id === connection.source);
    const hotspot = source?.hotspots.find(h => h.id === connection.sourceHandle);

    // gateway-зона не превращается в переход молча
    if (hotspot?.action?.type === 'gateway') {
      return;
    }

    // стрелка от найденного элемента экрана: зона по его границам и переход — одним действием
    const element = parseElementHandle(connection.sourceHandle);

    if (element && connection.target !== connection.source) {
      const hotspotId = addHotspot(connection.source, element, connection.target);

      useUiStore.getState().select({ type: 'hotspot', screenId: connection.source, hotspotId });
      return;
    }

    if (connection.sourceHandle && connection.target !== connection.source) {
      setHotspotNavigate(connection.source, connection.sourceHandle, connection.target);
      useUiStore.getState().select({ type: 'hotspot', screenId: connection.source, hotspotId: connection.sourceHandle });
    }
  }, []);

  // удаление клавишей: только стрелки; экраны удаляются из инспектора, зоны — своим обработчиком
  const onBeforeDelete = useCallback<OnBeforeDelete<ScreenFlowNode, HotspotEdge>>(async ({ edges }) => ({
    nodes: [],
    edges: edges.filter(edge => edge.selected)
  }), []);

  const editable = useUiStore(s => s.mode === 'edit' && s.activeLayer === 'prototype');

  const onEdgesDelete = useCallback((deleted: HotspotEdge[]) => {
    clearNavigations(deleted.flatMap(edge => edge.data ? [ edge.data ] : []));
    setSelectedEdges(new Set());
  }, []);

  // клавиатура слоя: R — зоны, Esc — выбор, Delete — удалить зону
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();

      if (ui.activeLayer !== 'prototype' || ui.mode !== 'edit' || ui.dialog ||
          event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) {
        return;
      }

      if (event.key === 'r' || event.key === 'R' || event.key === 'к' || event.key === 'К') {
        event.preventDefault();
        ui.setTool(ui.tool === 'hotspot' ? 'select' : 'hotspot');
      } else if (event.key === 'Escape') {
        if (ui.tool !== 'select') {
          ui.setTool('select');
        } else {
          ui.select(null);
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && ui.selection?.type === 'hotspot') {
        event.preventDefault();
        removeHotspot(ui.selection.screenId, ui.selection.hotspotId);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // переход со схемы (uiStore.openScreen) — показать экран; слой мог быть скрыт, ждём кадр
  const focusScreen = useUiStore(s => s.focusScreen);

  useEffect(() => {
    if (!focusScreen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      fitView({ nodes: [ { id: focusScreen.screenId } ], duration: 300, maxZoom: 1, padding: 0.3 });
    });

    return () => cancelAnimationFrame(frame);
  }, [ focusScreen, fitView ]);

  // первый экран в пустом проекте — показать его
  const hadScreens = useRef(screens.length > 0);

  useEffect(() => {
    if (!hadScreens.current && screens.length) {
      setTimeout(() => fitView({ duration: 250, maxZoom: 1 }), 50);
    }

    hadScreens.current = screens.length > 0;
  }, [ screens.length, fitView ]);

  // картинки, брошенные на canvas, становятся экранами
  const onDragOver = (event: DragEvent) => {
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (event: DragEvent) => {
    const images = Array.from(event.dataTransfer.files).filter(isImageFile);

    // не картинки (.fmg, .bpmn) обработает общий обработчик окна
    if (!images.length) {
      return;
    }

    event.preventDefault();
    addScreens(images, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  const pickFiles = () => fileInput.current?.click();

  return (
    <div className={ `prototype-canvas ${ tool === 'hotspot' ? 'prototype-canvas--draw' : '' }` } data-own-drop onDragOver={ onDragOver } onDrop={ onDrop }>
      <ReactFlow<ScreenFlowNode, HotspotEdge>
        nodes={ nodes }
        edges={ edges }
        nodeTypes={ nodeTypes }
        onNodesChange={ onNodesChange }
        onEdgesChange={ onEdgesChange }
        onNodeClick={ (_, node) => useUiStore.getState().select({ type: 'screen', screenId: node.id }) }
        onNodeDragStart={ (_, node) => useUiStore.getState().select({ type: 'screen', screenId: node.id }) }
        onNodeDragStop={ (_, node) => moveScreen(node.id, node.position) }
        onEdgeClick={ () => useUiStore.getState().select(null) }
        onPaneClick={ () => useUiStore.getState().select(null) }
        onConnect={ onConnect }
        isValidConnection={ isValidConnection }
        // стрелки клавиатуры двигали бы экран мимо store: позиция пишется только в onNodeDragStop
        disableKeyboardA11y
        onBeforeDelete={ onBeforeDelete }
        onEdgesDelete={ onEdgesDelete }
        // клавиатура react-flow слушает document: на скрытом слое и в просмотре — выключить
        deleteKeyCode={ editable ? DELETE_KEYS : null }
        multiSelectionKeyCode={ null }
        selectionKeyCode={ null }
        nodesConnectable
        connectionRadius={ 30 }
        connectionLineStyle={ { stroke: EDGE_COLOR, strokeWidth: 2 } }
        panOnScroll
        minZoom={ 0.05 }
        maxZoom={ 4 }
        fitView
        fitViewOptions={ { maxZoom: 1 } }
        proOptions={ { hideAttribution: true } }
      >
        <Background variant={ BackgroundVariant.Dots } gap={ 22 } size={ 1.4 } color="#CDD2DB" />
        <MiniMap pannable zoomable nodeColor="#D5D9E2" nodeBorderRadius={ 6 } maskColor="rgba(240, 242, 246, 0.72)" />
        <Controls showInteractive={ false } />

        <Panel position="top-left" className="prototype-tools">
          <button type="button" onClick={ pickFiles }>
            <Icon name="plus" />
            Экраны
          </button>
          <span className="prototype-tools__sep" />
          <button
            type="button"
            className={ tool === 'hotspot' ? 'active' : '' }
            aria-pressed={ tool === 'hotspot' }
            title="Зоны: клик по элементу экрана или прямоугольник (R). Esc — выход"
            disabled={ !screens.length }
            onClick={ () => useUiStore.getState().setTool(tool === 'hotspot' ? 'select' : 'hotspot') }
          >
            <Icon name="zone" />
            Зона
            <kbd>R</kbd>
          </button>
          <span className="prototype-tools__sep" />
          <button
            type="button"
            className="prototype-tools__icon"
            title="Показать все экраны"
            aria-label="Показать все экраны"
            disabled={ !screens.length }
            onClick={ () => fitView({ duration: 250, maxZoom: 1 }) }
          >
            <Icon name="fit" />
          </button>
        </Panel>

        { tool === 'hotspot' && (
          <Panel position="top-center" className="prototype-hint">
            Кликните по элементу экрана или нарисуйте прямоугольник
            <kbd>Esc</kbd>
          </Panel>
        ) }
      </ReactFlow>

      { !screens.length && (
        <div className="prototype-empty-hint">
          <span className="prototype-empty-hint__icon"><Icon name="image" size={ 26 } /></span>
          <b>Начните с экранов</b>
          <p>Перетащите сюда скриншоты мобильного приложения — PNG, JPG или SVG</p>
          <button type="button" className="button button--primary" onClick={ pickFiles }>
            <Icon name="plus" />
            Добавить экраны
          </button>
        </div>
      ) }

      <input
        ref={ fileInput }
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        multiple
        hidden
        onChange={ event => {
          const files = Array.from(event.target.files || []);

          event.target.value = '';

          if (files.length) {
            addScreens(files);
          }
        } }
      />
    </div>
  );
}
