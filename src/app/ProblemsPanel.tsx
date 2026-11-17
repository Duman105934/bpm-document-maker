import type { Problem } from '../model/refs';
import { useUiStore } from '../store/uiStore';
import Icon from './Icon';
import { useProblems } from './useProblems';

/** Панель «Проблемы»: битые ссылки между прототипом и схемой. Клик ведёт к месту. */
export default function ProblemsPanel() {
  const problems = useProblems();
  const errors = problems.filter(p => p.level === 'error').length;

  return (
    <section className="problems-panel" aria-label="Проблемы">
      <header className="problems-panel__head">
        <b>Проблемы</b>
        <span className="problems-panel__count">
          { problems.length ? `ошибок: ${ errors }, предупреждений: ${ problems.length - errors }` : 'нет' }
        </span>
        <button
          type="button"
          className="problems-panel__close"
          aria-label="Закрыть панель"
          onClick={ () => useUiStore.getState().toggleProblems(false) }
        ><Icon name="close" size={ 14 } /></button>
      </header>

      { problems.length ? (
        <ul className="problems-panel__list">
          { problems.map(problem => (
            <li key={ problem.id }>
              <button type="button" data-level={ problem.level } onClick={ () => openProblem(problem) }>
                <span className="problems-panel__icon" aria-hidden><Icon name="alert" size={ 14 } /></span>
                <span>{ problem.message }</span>
              </button>
            </li>
          )) }
        </ul>
      ) : <p className="problems-panel__empty">Все ссылки между прототипом и схемой в порядке.</p> }
    </section>
  );
}

export function openProblem({ target }: Problem) {
  const ui = useUiStore.getState();

  switch (target.type) {
  case 'project':
    ui.setLayer('prototype');
    ui.select(null);
    break;
  case 'screen':
  case 'call':
    ui.openScreen(target.screenId);
    break;
  case 'hotspot':
    ui.openScreen(target.screenId, target.hotspotId);
    break;
  case 'bpmn':
    ui.openBpmnElement(target.elementId);
    break;
  }
}
