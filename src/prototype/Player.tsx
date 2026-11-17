import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from 'react';

import { tokenWalk } from '../bpmn/tokenWalk';

import type { ApiCall, Hotspot, Screen } from '../model/types';
import { assets } from '../store/assets';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

/** Сколько длится подсветка всех зон после клика мимо них, мс. */
const FLASH_MS = 700;

/**
 * Слой «Прототип» в режиме «Просмотр»: один экран по центру, кликабельные зоны.
 * Экран выбирает единый проход (WalkBar): нажатие зоны — шаг прохода.
 * Клик мимо зон кратко подсвечивает все зоны — как в Figma.
 */
export default function Player() {
  const project = useProjectStore(s => s.project)!;
  const screenId = useUiStore(s => s.viewScreenId);
  const screen = project.screens.find(s => s.id === screenId) ?? null;

  if (!project.screens.length) {
    return <div className="player player--empty"><p>В прототипе нет экранов</p></div>;
  }

  return (
    <div className="player">
      <header className="player__bar">
        <label className="player__pick">
          <span>Экран</span>
          <select
            value={ screenId ?? '' }
            aria-label="Экран"
            onChange={ event => event.target.value && useUiStore.getState().openScreen(event.target.value) }
          >
            { !screen && <option value="">— выберите экран —</option> }
            { project.screens.map(s => (
              <option key={ s.id } value={ s.id }>
                { s.name || 'Без названия' }{ s.code ? ` · ${ s.code }` : '' }{ s.id === project.startScreenId ? ' (старт)' : '' }
              </option>
            )) }
          </select>
        </label>

        <span className="player__hint">Нажимайте на зоны экрана или идите по шагам на панели прохода</span>
      </header>

      { screen
        ? <PlayerScreen key={ screen.id } screen={ screen } />
        : <div className="player player--empty"><p>Выберите экран</p></div> }
    </div>
  );
}

function PlayerScreen({ screen }: { screen: Screen }) {
  const [ flash, setFlash ] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const url = assets.getUrl(screen.asset.path);
  const { width, height } = screen.asset;
  const ratio = width > 0 && height > 0 ? width / height : 375 / 812;

  useEffect(() => () => clearTimeout(timer.current), []);

  const showZones = () => {
    clearTimeout(timer.current);
    setFlash(true);
    timer.current = setTimeout(() => setFlash(false), FLASH_MS);
  };

  // зоны, которыми можно сделать шаг прохода с этого экрана, и зона, «нажатая» текущим шагом
  const walk = useSyncExternalStore(tokenWalk.subscribe, tokenWalk.getSnapshot);
  const here = walk.pos?.type === 'screen' && walk.pos.id === screen.id;
  const stepZones = new Set(here ? walk.options.map(option => option.hotspotId).filter(Boolean) : []);

  const onHotspot = async (event: MouseEvent, hotspot: Hotspot) => {
    event.stopPropagation();

    const action = hotspot.action;
    const ui = useUiStore.getState();

    if (!action) {
      showZones();
      return;
    }

    // зона ведёт на экран или на узел схемы — это шаг прохода
    if (await tokenWalk.pressZone(screen.id, hotspot.id)) {
      return;
    }

    if (action.type === 'gateway') {
      // узел схемы не задан или не найден — показать хотя бы карточку вызова
      ui.viewOpenCall(action.call, screen.id);
    } else if (action.targetScreenId !== screen.id) {
      ui.showStatus('Экран перехода удалён из прототипа', 'warning');
    }
  };

  const onCall = async (call: ApiCall) => {
    if (!await tokenWalk.pressCall(screen.id, call.id)) {
      useUiStore.getState().viewOpenCall(call, screen.id);
    }
  };

  return (
    <div className="player__stage">
      {/* рамка — контейнер размеров: блок экрана вписывается в неё с пропорциями картинки,
          поэтому зоны в процентах блока совпадают с картинкой при любом окне */}
      <div className="player__frame">
      <div
        className={ `player__screen ${ flash ? 'player__screen--flash' : '' }` }
        style={ { '--ratio': ratio } as CSSProperties }
        onClick={ showZones }
      >
        { url
          ? <img src={ url } alt={ screen.name } draggable={ false } />
          : <div className="screen-node__missing">Нет картинки { screen.asset.path }</div> }

        { screen.hotspots.map(hotspot => (
          <button
            key={ hotspot.id }
            type="button"
            className={ [
              'player-hotspot',
              hotspot.action?.type === 'gateway' ? 'player-hotspot--gateway' : '',
              stepZones.has(hotspot.id) ? 'player-hotspot--step' : '',
              walk.pressing === hotspot.id ? 'player-hotspot--pressing' : ''
            ].filter(Boolean).join(' ') }
            title={ hotspotTitle(hotspot) }
            aria-label={ hotspotTitle(hotspot) }
            style={ {
              left: `${ hotspot.rect.x * 100 }%`,
              top: `${ hotspot.rect.y * 100 }%`,
              width: `${ hotspot.rect.w * 100 }%`,
              height: `${ hotspot.rect.h * 100 }%`
            } }
            onClick={ event => onHotspot(event, hotspot) }
          />
        )) }
      </div>
      </div>

      <aside className="player__side">
        <h2 className="player__title">{ screen.name || 'Без названия' }</h2>
        { screen.code && <div className="player__code">{ screen.code }</div> }
        { screen.description && <p className="player__description">{ screen.description }</p> }

        { screen.onOpenCalls.length > 0 && (
          <section className="player__calls">
            <h3>При открытии экрана</h3>
            <ul>
              { screen.onOpenCalls.map(call => (
                <li key={ call.id }>
                  <button type="button" onClick={ () => onCall(call) }>
                    <span className="player__method">{ call.method }</span>
                    { call.name || call.gatewayUrl || 'Вызов без названия' }
                  </button>
                </li>
              )) }
            </ul>
          </section>
        ) }
      </aside>
    </div>
  );
}

function hotspotTitle(hotspot: Hotspot): string {
  const name = hotspot.name || 'Зона';
  const action = hotspot.action;

  if (action?.type === 'navigate') {
    const target = useProjectStore.getState().project?.screens.find(s => s.id === action.targetScreenId);

    return `${ name } → ${ target?.name || 'экран' }`;
  }

  if (action?.type === 'gateway') {
    return `${ name }: ${ action.call.method } ${ action.call.gatewayUrl || action.call.name }`;
  }

  return `${ name } (без действия)`;
}
