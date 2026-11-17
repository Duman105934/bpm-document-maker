import { useEffect, useSyncExternalStore } from 'react';

import Icon from '../app/Icon';
import { tokenWalk } from './tokenWalk';
import type { WalkOption } from './walk';

/**
 * Панель единого прохода в режиме «Просмотр»: закреплена под обоими слоями.
 * «Шаг» ведёт по флоу — с экрана на схему и обратно, слой переключается сам; «Авто» идёт без остановок
 * до развилки, выбора зоны или конца пути.
 */
export default function WalkBar() {
  const walk = useSyncExternalStore(tokenWalk.subscribe, tokenWalk.getSnapshot);
  const single = walk.options.length === 1 ? walk.options[0] : null;
  const active = walk.active;

  // ← → — шаг назад и вперёд; стрелки при этом не двигают канву схемы
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable))) {
        return;
      }

      if (event.key === 'ArrowRight') {
        void tokenWalk.step();
      } else if (event.key === 'ArrowLeft') {
        tokenWalk.back();
      } else {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('keydown', onKeyDown, true);

    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [ active ]);

  if (!walk.ready) {
    return <div className="walk-bar" aria-hidden />;
  }

  if (!active) {
    return (
      <div className="walk-bar" role="toolbar" aria-label="Проход по флоу">
        <div className="walk-bar__info">
          <span className="walk-bar__title">Проход по флоу</span>
        </div>
        <div className="walk-bar__controls">
          { walk.canStart
            ? (
              <button type="button" className="button button--walk" onClick={ () => tokenWalk.restart() }>
                <Icon name="play" />
                С начала
              </button>
            )
            : <span className="walk-bar__end">В проекте нет ни экранов, ни узлов схемы</span> }
        </div>
        <div className="walk-bar__aside" />
      </div>
    );
  }

  const busy = walk.animating;
  const onScreen = walk.pos?.type === 'screen';

  return (
    <div className="walk-bar walk-bar--active" role="toolbar" aria-label="Проход по флоу">
      <div className="walk-bar__info">
        <span className={ `walk-bar__where walk-bar__where--${ onScreen ? 'screen' : 'node' }` }>
          <Icon name={ onScreen ? 'phone' : 'schema' } size={ 14 } />
          { onScreen ? 'Экран' : 'Схема' }
        </span>
        <span className="walk-bar__step">Шаг { walk.step }</span>
        <b className="walk-bar__current" title={ walk.currentName }>{ walk.currentName }</b>
      </div>

      <div className="walk-bar__controls">
        <button
          type="button"
          className="button button--icon"
          disabled={ !walk.canBack || busy }
          title="Шаг назад (←)"
          aria-label="Шаг назад"
          onClick={ () => tokenWalk.back() }
        >
          <Icon name="arrow-left" />
        </button>

        { walk.options.length === 0 && <span className="walk-bar__end">Конец пути</span> }

        { single && (
          <button
            type="button"
            className="button button--walk"
            disabled={ busy }
            title={ `${ optionTitle(single) } (→)` }
            onClick={ () => tokenWalk.step(single.key) }
          >
            Шаг
            <Icon name="arrow-right" />
          </button>
        ) }

        { single && <span className="walk-bar__next" title={ optionTitle(single) }>{ nextHint(single) }</span> }

        { walk.options.length > 1 && (
          <span className="walk-bar__branches">
            <span className="walk-bar__hint">{ onScreen ? 'Выберите действие' : 'Выберите ветку' }</span>
            { walk.options.map(option => (
              <button
                key={ option.key }
                type="button"
                className={ `walk-bar__branch walk-bar__branch--${ option.kind }` }
                disabled={ busy }
                title={ optionTitle(option) }
                onClick={ () => tokenWalk.step(option.key) }
              >
                { option.label || option.target }
              </button>
            )) }
          </span>
        ) }
      </div>

      <div className="walk-bar__aside">
        { (walk.options.length > 0 || walk.auto) && (
          <button
            type="button"
            className={ `button walk-bar__auto ${ walk.auto ? 'walk-bar__auto--on' : '' }` }
            aria-pressed={ walk.auto }
            title="Идти самому: с экрана на схему и обратно. На развилке ждёт выбора и продолжает"
            onClick={ () => tokenWalk.toggleAuto() }
          >
            <Icon name={ walk.auto ? 'pause' : 'forward' } />
            { walk.auto ? 'Пауза' : 'Авто' }
          </button>
        ) }

        <button
          type="button"
          className="button button--icon"
          title="Начать сначала"
          aria-label="Начать сначала"
          onClick={ () => tokenWalk.restart() }
        >
          <Icon name="restart" />
        </button>
      </div>
    </div>
  );
}

/** Что произойдёт на следующем шаге — подпись рядом с кнопкой «Шаг». */
function nextHint(option: WalkOption): string {
  switch (option.kind) {
  case 'call':
  case 'navigate':
    return `${ option.label } → ${ option.target }`;
  default:
    return option.target;
  }
}

function optionTitle(option: WalkOption): string {
  switch (option.kind) {
  case 'screen':
    return `Показать: ${ option.target }`;
  case 'call':
    return `${ option.label }: вызов backend → ${ option.target }`;
  case 'navigate':
    return `${ option.label }: переход → ${ option.target }`;
  default:
    return `Следующий узел: ${ option.target }`;
  }
}
