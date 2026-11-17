import { useRef, useState } from 'react';

import type { ApiCall, Hotspot, Project, Screen } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import {
  addOnOpenCall,
  removeHotspot,
  removeOnOpenCall,
  removeScreen,
  renameHotspot,
  replaceScreenImage,
  setHotspotGateway,
  setHotspotNavigate,
  setStartScreen,
  updateScreen
} from './actions';
import ApiCallForm from './ApiCallForm';
import { CommitInput, Field } from './fields';

const MIN_DISPLAY_WIDTH = 120;
const MAX_DISPLAY_WIDTH = 1600;

/** Правая панель слоя прототипа: свойства выбранного экрана или зоны. */
export default function Inspector() {
  const project = useProjectStore(s => s.project)!;
  const selection = useUiStore(s => s.selection);

  const screen = selection ? project.screens.find(s => s.id === selection.screenId) : undefined;
  const hotspot = screen && selection?.type === 'hotspot'
    ? screen.hotspots.find(h => h.id === selection.hotspotId)
    : undefined;

  return (
    <aside className="inspector" aria-label="Свойства">
      { hotspot && screen
        ? <HotspotInspector key={ hotspot.id } project={ project } screen={ screen } hotspot={ hotspot } />
        : screen
          ? <ScreenInspector key={ screen.id } project={ project } screen={ screen } />
          : <ProjectOverview project={ project } /> }
    </aside>
  );
}

// обзор ////////////////////

function ProjectOverview({ project }: { project: Project }) {
  return (
    <>
      <h3 className="inspector-title">Экраны</h3>

      { project.screens.length ? (
        <ul className="inspector-list">
          { project.screens.map(screen => (
            <li key={ screen.id }>
              <button
                type="button"
                data-kind={ screen.id === project.startScreenId ? 'start' : 'screen' }
                onClick={ () => useUiStore.getState().select({ type: 'screen', screenId: screen.id }) }
              >
                <span>{ screen.name || 'Без названия' }</span>
                <span className="inspector-list-meta">
                  { screen.id === project.startScreenId ? 'старт · ' : '' }зон: { screen.hotspots.length }
                </span>
              </button>
            </li>
          )) }
        </ul>
      ) : <p className="inspector-hint">Экранов пока нет.</p> }

      <div className="inspector-help">
        <p className="inspector-help__title">Как работать</p>
        <ol>
          <li>Добавьте экраны: кнопка «Экраны» или перетащите картинки на холст.</li>
          <li>Наведите на элемент экрана и потяните «+» на другой экран — появятся зона и переход.</li>
          <li>«Зона» (<kbd>R</kbd>) — клик по элементу или прямоугольник вручную.</li>
          <li>Действие зоны «Вызов через gateway» связывает её с узлом BPMN-схемы.</li>
          <li>«Просмотр» проходит весь флоу по шагам: экраны и схему.</li>
        </ol>
        <p className="inspector-help__keys">
          <kbd>Delete</kbd> — удалить зону или стрелку · <kbd>Ctrl/⌘ Z</kbd> — отменить
        </p>
      </div>
    </>
  );
}

// экран ////////////////////

function ScreenInspector({ project, screen }: { project: Project; screen: Screen }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const isStart = project.startScreenId === screen.id;

  return (
    <>
      <h3 className="inspector-title">Экран</h3>

      <Field label="Название">
        <CommitInput value={ screen.name } onCommit={ name => updateScreen(screen.id, { name }) } />
      </Field>

      <Field label="Код">
        <CommitInput value={ screen.code } placeholder="например, SCR-OTP" onCommit={ code => updateScreen(screen.id, { code }) } />
      </Field>

      <Field label="Описание">
        <CommitInput multiline value={ screen.description } onCommit={ description => updateScreen(screen.id, { description }) } />
      </Field>

      <Field label="Ширина показа, px" hint={ `Картинка ${ screen.asset.width } × ${ screen.asset.height } px` }>
        <CommitInput
          type="number"
          value={ String(screen.displayWidth) }
          onCommit={ value => {
            const width = Math.round(Number(value));

            if (Number.isFinite(width) && width > 0) {
              updateScreen(screen.id, { displayWidth: Math.min(MAX_DISPLAY_WIDTH, Math.max(MIN_DISPLAY_WIDTH, width)) });
            }
          } }
        />
      </Field>

      <div className="inspector-actions">
        <button type="button" disabled={ isStart } onClick={ () => setStartScreen(screen.id) }>
          { isStart ? 'Стартовый экран' : 'Сделать стартовым' }
        </button>
        <button type="button" onClick={ () => fileInput.current?.click() }>Заменить картинку</button>
        <button type="button" className="danger" onClick={ () => removeScreen(screen.id) }>Удалить экран</button>
      </div>

      <input
        ref={ fileInput }
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        hidden
        onChange={ event => {
          const file = event.target.files?.[0];

          event.target.value = '';

          if (file) {
            replaceScreenImage(screen.id, file);
          }
        } }
      />

      <h4 className="inspector-subtitle">Зоны ({ screen.hotspots.length })</h4>

      { screen.hotspots.length ? (
        <ul className="inspector-list">
          { screen.hotspots.map((hotspot, index) => (
            <li key={ hotspot.id }>
              <button
                type="button"
                data-kind={ hotspot.action?.type ?? 'none' }
                onClick={ () => useUiStore.getState().select({ type: 'hotspot', screenId: screen.id, hotspotId: hotspot.id }) }
              >
                <span>{ index + 1 }. { hotspot.name || 'Без названия' }</span>
                <span className="inspector-list-meta">{ describeAction(project, hotspot) }</span>
              </button>
            </li>
          )) }
        </ul>
      ) : <p className="inspector-hint">Наведите на элемент экрана и потяните «+» или включите «Зона» (R).</p> }

      <OnOpenCalls screen={ screen } />
    </>
  );
}

/** Вызовы backend, которые экран делает сам при открытии. */
function OnOpenCalls({ screen }: { screen: Screen }) {
  const [ expanded, setExpanded ] = useState<string | null>(null);

  return (
    <>
      <h4 className="inspector-subtitle">Вызовы при открытии ({ screen.onOpenCalls.length })</h4>

      { screen.onOpenCalls.length ? (
        <ul className="call-list">
          { screen.onOpenCalls.map(call => {
            const open = expanded === call.id;

            return (
              <li key={ call.id } className={ open ? 'call-list__item--open' : undefined }>
                <div className="call-list__head">
                  <button
                    type="button"
                    className="call-list__toggle"
                    aria-expanded={ open }
                    onClick={ () => setExpanded(open ? null : call.id) }
                  >
                    <span>{ open ? '▾' : '▸' } { call.name || 'Без названия' }</span>
                    <span className="inspector-list-meta">{ describeCall(call) }</span>
                  </button>
                  <button
                    type="button"
                    className="call-list__remove"
                    title="Удалить вызов"
                    aria-label="Удалить вызов"
                    onClick={ () => removeOnOpenCall(screen.id, call.id) }
                  >×</button>
                </div>

                { open && <ApiCallForm call={ call } callRef={ { screenId: screen.id, callId: call.id } } /> }
              </li>
            );
          }) }
        </ul>
      ) : <p className="inspector-hint">Запросы, которые экран отправляет сам, без нажатия.</p> }

      <div className="inspector-actions">
        <button type="button" onClick={ () => setExpanded(addOnOpenCall(screen.id)) }>Добавить вызов</button>
      </div>
    </>
  );
}

function describeCall(call: ApiCall): string {
  return [ call.method, call.gatewayUrl ].filter(Boolean).join(' ') || 'без URL';
}

// зона ////////////////////

function HotspotInspector({ project, screen, hotspot }: { project: Project; screen: Screen; hotspot: Hotspot }) {
  const action = hotspot.action;
  const targets = project.screens.filter(s => s.id !== screen.id);
  const targetId = action?.type === 'navigate' ? action.targetScreenId : '';
  const targetMissing = !!targetId && !project.screens.some(s => s.id === targetId);

  return (
    <>
      <button
        type="button"
        className="inspector-back"
        onClick={ () => useUiStore.getState().select({ type: 'screen', screenId: screen.id }) }
      >← { screen.name || 'Экран' }</button>

      <h3 className="inspector-title">Зона</h3>

      <Field label="Название">
        <CommitInput value={ hotspot.name } onCommit={ name => renameHotspot(screen.id, hotspot.id, name) } />
      </Field>

      <Field label="Действие">
        <select
          value={ action?.type ?? '' }
          onChange={ event => {
            const type = event.target.value;

            // смена действия стирает заполненный вызов — только с подтверждением (Ctrl+Z вернёт, но это неочевидно)
            if (action?.type === 'gateway' && type !== 'gateway' && isCallFilled(action.call) &&
              !window.confirm('У зоны заполнен вызов backend (URL, JSON, узел схемы). Заменить действие и удалить вызов?')) {
              return;
            }

            if (!type) {
              setHotspotNavigate(screen.id, hotspot.id, null);
            } else if (type === 'navigate' && targets[0]) {
              setHotspotNavigate(screen.id, hotspot.id, targetId || targets[0].id);
            } else if (type === 'gateway') {
              setHotspotGateway(screen.id, hotspot.id);
            }
          } }
        >
          <option value="">Нет</option>
          <option value="navigate" disabled={ !targets.length }>Переход на экран</option>
          <option value="gateway">Вызов через gateway</option>
        </select>
      </Field>

      { action?.type === 'navigate' && (
        <Field label="Целевой экран">
          <select value={ targetId } onChange={ event => setHotspotNavigate(screen.id, hotspot.id, event.target.value) }>
            { targetMissing && <option value={ targetId }>(удалён) { targetId }</option> }
            { targets.map(target => (
              <option key={ target.id } value={ target.id }>{ target.name || target.id }</option>
            )) }
          </select>
        </Field>
      ) }

      { action?.type === 'gateway' && (
        <ApiCallForm call={ action.call } callRef={ { screenId: screen.id, hotspotId: hotspot.id } } />
      ) }

      { !action && (
        <p className="inspector-hint">
          Выберите действие или потяните точку справа от зоны на другой экран.
        </p>
      ) }

      <div className="inspector-actions">
        <button type="button" className="danger" onClick={ () => removeHotspot(screen.id, hotspot.id) }>Удалить зону</button>
      </div>
    </>
  );
}

function describeAction(project: Project, hotspot: Hotspot): string {
  const action = hotspot.action;

  if (!action) {
    return 'нет действия';
  }

  if (action.type === 'navigate') {
    const target = project.screens.find(s => s.id === action.targetScreenId);

    return `→ ${ target ? target.name || 'без названия' : 'экран удалён' }`;
  }

  return `⇄ ${ action.call.name || describeCall(action.call) }`;
}

/** В вызове есть что терять: что-то кроме названия по умолчанию и метода. */
function isCallFilled(call: ApiCall): boolean {
  return !!(call.gatewayUrl || call.service || call.serviceUrl || call.requestJson || call.responseJson ||
    call.description || call.bpmnElementId);
}
