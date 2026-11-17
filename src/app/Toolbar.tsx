import { useEffect, useRef, type ReactNode } from 'react';

import { useProjectStore } from '../store/projectStore';
import { useUiStore, type Layer } from '../store/uiStore';
import { bpmnBridge } from '../bpmn/bpmnBridge';
import { useProblems } from './useProblems';
import Icon, { BrandMark, type IconName } from './Icon';
import {
  confirmDiscard,
  enterView,
  exitView,
  exportActions,
  importBpmnFile,
  importExampleBpmn,
  openProjectFile,
  saveProject
} from './actions';

const LAYERS: Array<{ id: Layer; label: string; icon: IconName; title: string }> = [
  { id: 'prototype', label: 'Прототип', icon: 'phone', title: 'Экраны мобильного приложения' },
  { id: 'bpmn', label: 'Backend', icon: 'schema', title: 'BPMN-схема обработки на backend' }
];

/** ⌘ на Mac, Ctrl на остальных — для подсказок горячих клавиш. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

export default function Toolbar() {
  const project = useProjectStore(s => s.project);
  const fileName = useProjectStore(s => s.fileName);
  const dirty = useProjectStore(s => s.dirty);
  const activeLayer = useUiStore(s => s.activeLayer);
  const propertiesVisible = useUiStore(s => s.propertiesVisible);
  const viewing = useUiStore(s => s.mode === 'view');
  const ui = useUiStore.getState;

  return (
    <header className="toolbar" role="toolbar" aria-label="Действия с проектом">
      <div className="toolbar__left">
        <span className="toolbar-brand" title="BPM Document Maker"><BrandMark /></span>

        { !viewing && (
          <Dropdown label="Файл">
            <MenuItem icon="file-new" onClick={ () => confirmDiscard() && ui().openDialog('new') }>Новый проект</MenuItem>
            <MenuItem icon="folder" hint={ `${ MOD }O` } onClick={ () => openProjectFile() }>Открыть .fmg…</MenuItem>
            <MenuSeparator />
            <MenuItem icon="save" hint={ `${ MOD }S` } disabled={ !project } onClick={ () => saveProject() }>Сохранить</MenuItem>
            <MenuItem hint={ `⇧${ MOD }S` } disabled={ !project } onClick={ () => saveProject(true) }>Сохранить как…</MenuItem>
            <MenuSeparator />
            <MenuItem icon="settings" disabled={ !project } onClick={ () => ui().openDialog('settings') }>Настройки проекта</MenuItem>
            <MenuSeparator />
            <MenuItem icon="schema" disabled={ !project } onClick={ () => importBpmnFile() }>Импорт схемы .bpmn…</MenuItem>
            <MenuItem disabled={ !project } onClick={ () => importExampleBpmn() }>Пример схемы (оплата по OTP)</MenuItem>
          </Dropdown>
        ) }

        { project && (
          <button
            type="button"
            className="toolbar-title"
            disabled={ viewing }
            title={ viewing ? undefined : 'Настройки проекта' }
            onClick={ () => ui().openDialog('settings') }
          >
            <span className="toolbar-title__name">{ project.meta.name || 'Без названия' }</span>
            <span className="toolbar-title__file" data-dirty={ dirty || undefined }>
              <span className="toolbar-title__dot" aria-hidden />
              { fileName || 'не сохранён в файл' }{ dirty && fileName ? ' · изменён' : '' }
            </span>
          </button>
        ) }

        { viewing && <span className="toolbar-mode">Просмотр</span> }
      </div>

      { project && (
        <nav className="layer-tabs" aria-label="Слои">
          { LAYERS.map(layer => (
            <button
              key={ layer.id }
              type="button"
              className={ layer.id === activeLayer ? 'active' : '' }
              aria-pressed={ layer.id === activeLayer }
              title={ layer.title }
              onClick={ () => {
                bpmnBridge.stopPicking();
                ui().setLayer(layer.id);
              } }
            >
              <Icon name={ layer.icon } />
              { layer.label }
            </button>
          )) }
        </nav>
      ) }

      <div className="toolbar__right">
        { project && !viewing && <ProblemsToggle /> }

        { project && !viewing && activeLayer === 'bpmn' && (
          <button
            type="button"
            className={ `tool-button tool-button--icon ${ propertiesVisible ? 'active' : '' }` }
            aria-pressed={ propertiesVisible }
            title="Показать / скрыть панель свойств"
            aria-label="Панель свойств"
            onClick={ () => ui().toggleProperties() }
          >
            <Icon name="panel" />
          </button>
        ) }

        { project && (
          <Dropdown label="Экспорт" icon="export" align="right">
            <MenuLabel>Документация</MenuLabel>
            <MenuItem onClick={ () => exportActions.flowPdf() }>PDF: документация флоу</MenuItem>
            <MenuItem onClick={ () => exportActions.overviewSvg() }>SVG: весь флоу</MenuItem>
            <MenuSeparator />
            <MenuLabel>Только схема</MenuLabel>
            <MenuItem onClick={ () => exportActions.bpmn() }>BPMN-схема (.bpmn)</MenuItem>
            <MenuItem onClick={ () => exportActions.schemaPdf() }>PDF</MenuItem>
            <MenuItem onClick={ () => exportActions.schemaSvg() }>SVG</MenuItem>
            <MenuItem onClick={ () => exportActions.schemaPng(2) }>PNG 2x</MenuItem>
            <MenuItem onClick={ () => exportActions.schemaPng(4) }>PNG 4x</MenuItem>
          </Dropdown>
        ) }

        { project && !viewing && (
          <button
            type="button"
            className="tool-button"
            title={ `Сохранить (${ MOD }S)` }
            onClick={ () => saveProject() }
          >
            <Icon name="save" />
            Сохранить
          </button>
        ) }

        { project && (viewing ? (
          <button type="button" className="tool-button tool-button--outline" title="Вернуться к редактированию (Esc)" onClick={ () => exitView() }>
            <Icon name="close" />
            Выйти из просмотра
          </button>
        ) : (
          <button
            type="button"
            className="tool-button tool-button--primary"
            title="Пройти флоу по шагам: экраны и схема без редактирования"
            onClick={ () => enterView() }
          >
            <Icon name="play" />
            Просмотр
          </button>
        )) }
      </div>
    </header>
  );
}

function ProblemsToggle() {
  const problems = useProblems();
  const visible = useUiStore(s => s.problemsVisible);
  const errors = problems.filter(p => p.level === 'error').length;

  return (
    <button
      type="button"
      className={ `tool-button problems-toggle ${ visible ? 'active' : '' }` }
      data-level={ errors ? 'error' : problems.length ? 'warning' : 'ok' }
      aria-pressed={ visible }
      title="Битые и неполные ссылки между прототипом и схемой"
      onClick={ () => useUiStore.getState().toggleProblems() }
    >
      <Icon name={ problems.length ? 'alert' : 'check' } />
      Проблемы
      { problems.length > 0 && <span className="problems-toggle__count">{ problems.length }</span> }
    </button>
  );
}

function Dropdown({ label, icon, align, children }: { label: string; icon?: IconName; align?: 'right'; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const details = ref.current;

      if (!details || !details.open) {
        return;
      }

      // клик по пункту меню или вне меню закрывает его
      if (!details.contains(event.target as Node) || (event.target as HTMLElement).closest('[role="menuitem"]')) {
        details.open = false;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details className={ `dropdown ${ align === 'right' ? 'dropdown--right' : '' }` } ref={ ref }>
      <summary className="tool-button">
        { icon && <Icon name={ icon } /> }
        { label }
        <Icon name="chevron-down" size={ 13 } />
      </summary>
      <div className="dropdown-menu" role="menu">{ children }</div>
    </details>
  );
}

function MenuItem({ icon, hint, disabled, onClick, children }: {
  icon?: IconName;
  hint?: string;
  disabled?: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="menuitem" className="menu-item" disabled={ disabled } onClick={ onClick }>
      <span className="menu-item__icon">{ icon && <Icon name={ icon } /> }</span>
      <span className="menu-item__label">{ children }</span>
      { hint && <kbd className="menu-item__hint">{ hint }</kbd> }
    </button>
  );
}

function MenuSeparator() {
  return <div className="menu-separator" role="separator" />;
}

function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu-label">{ children }</div>;
}
