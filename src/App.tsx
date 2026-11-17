import { useEffect, useState } from 'react';

import BpmnEditor from './bpmn/BpmnEditor';
import BpmnViewer from './bpmn/BpmnViewer';
import WalkBar from './bpmn/WalkBar';
import { bpmnBridge, emptyXml } from './bpmn/bpmnBridge';
import Toolbar from './app/Toolbar';
import Toast from './app/Toast';
import Icon, { BrandMark } from './app/Icon';
import ProjectMetaDialog from './app/ProjectMetaDialog';
import ProblemsPanel from './app/ProblemsPanel';
import PrototypeLayer from './prototype/PrototypeLayer';
import Player from './prototype/Player';
import './styles/view.css';
import './app/walkHost';
import CallCard from './prototype/CallCard';
import { useDraftAutosave } from './app/useDraftAutosave';
import { useGlobalShortcuts, useFileDrop } from './app/useGlobalEvents';
import { openProjectFile } from './app/actions';
import { loadDraft } from './io/draft';
import { getAssetPaths, validateProject } from './model/project';
import { assets } from './store/assets';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

export default function App() {
  const project = useProjectStore(s => s.project);
  const session = useProjectStore(s => s.session);
  const activeLayer = useUiStore(s => s.activeLayer);
  const dialog = useUiStore(s => s.dialog);
  const picking = useUiStore(s => s.picking);
  const problemsVisible = useUiStore(s => s.problemsVisible);
  const mode = useUiStore(s => s.mode);
  const viewXml = useUiStore(s => s.viewXml);
  const editing = mode === 'edit';
  const [ booting, setBooting ] = useState(true);

  useDraftAutosave();
  useGlobalShortcuts();
  const dragging = useFileDrop();

  // правки схемы пользователем помечают проект изменённым
  useEffect(() => bpmnBridge.onChanged(() => useProjectStore.getState().touchBpmn()), []);

  // смена id узла (вид, правка ID, их undo) — ссылки вызовов идут за узлом
  useEffect(() => bpmnBridge.onRemap((oldId, newId) => useProjectStore.getState().remapBpmnRef(oldId, newId)), []);

  // восстановление черновика
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await loadDraft();

        if (cancelled || !result) {
          return;
        }

        const { draft, assets: loaded } = result;
        const { project: restored, warnings } = validateProject(draft.project);
        const problems: string[] = [];
        const missing = getAssetPaths(restored).filter(path => !loaded.has(path));
        let dirty = draft.dirty;

        if (missing.length) {
          console.warn('В черновике нет картинок', missing);
          problems.push(`нет картинок: ${ missing.length }`);
        }

        // редактор схемы появляется вместе с проектом — импорт ждёт его
        assets.replaceAll(loaded);
        useProjectStore.getState().loadProject(restored, { fileName: draft.fileName, dirty });

        try {
          await bpmnBridge.importXml(draft.bpmnXml || emptyXml);
        } catch (error) {
          console.error('Схема черновика не читается', error);
          problems.push('схема не читается, открыта пустая');
          // сохранение «на место» не должно молча записать пустую схему
          dirty = true;
          await bpmnBridge.importXml(emptyXml);
        }

        useProjectStore.setState({ dirty });

        if (warnings.length) {
          console.warn('Черновик', warnings);
        }

        if (problems.length) {
          useUiStore.getState().showStatus(
            `Черновик восстановлен с ошибками: ${ problems.join('; ') }. Подробности в консоли`, 'warning', 0
          );
        } else {
          useUiStore.getState().showStatus('Восстановлен черновик из прошлой сессии', 'info', 6000);
        }
      } catch (error) {
        console.error('Не удалось восстановить черновик', error);
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // несохранённые изменения
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const { project, dirty } = useProjectStore.getState();

      // черновик в браузере сохранится, но файл проекта может быть не сохранён
      if (project && dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <div className="app">
      <Toolbar />

      <main className={ `workspace ${ project && !editing ? 'workspace--view' : '' }` }>
        <div className="workspace__stage">
          { project ? (
            <>
              {/* редактор в просмотре остаётся смонтированным, но скрыт */}
              <section { ...layerProps(editing && activeLayer === 'prototype') } aria-label="Прототип">
                {/* новый проект — новый canvas: сброс viewport и fitView */}
                <PrototypeLayer key={ session } />
              </section>
              <section { ...layerProps(editing && activeLayer === 'bpmn') } aria-label="Backend (BPMN)">
                <BpmnEditor visible={ editing && activeLayer === 'bpmn' } />
              </section>

              { !editing && viewXml !== null && (
                <>
                  <section { ...layerProps(activeLayer === 'prototype') } aria-label="Прототип: просмотр">
                    <Player />
                  </section>
                  <section { ...layerProps(activeLayer === 'bpmn') } aria-label="Backend: просмотр">
                    <BpmnViewer xml={ viewXml } visible={ activeLayer === 'bpmn' } />
                  </section>
                  <CallCard />
                </>
              ) }

              { editing && problemsVisible && <ProblemsPanel /> }
            </>
          ) : !booting && <StartScreen /> }

          {/* сообщения и подсказка выбора узла — поверх слоёв, сверху по центру */}
          <div className="notices">
            { project && picking && (
              <div className="pick-bar" role="status">
                <Icon name="target" />
                Выберите узел на схеме
                <kbd>Esc</kbd>
                <button type="button" onClick={ () => bpmnBridge.stopPicking() }>Отмена</button>
              </div>
            ) }
            <Toast />
          </div>
        </div>

        {/* одна панель прохода на оба слоя: шаг сам переключает «Прототип» и «Backend» */}
        { project && !editing && viewXml !== null && <WalkBar /> }
      </main>

      { dialog && <ProjectMetaDialog key={ dialog } mode={ dialog } /> }

      { dragging && (
        <div className="drop-overlay">
          <div className="drop-overlay__card">
            <Icon name="folder" size={ 28 } />
            Отпустите, чтобы открыть файл
          </div>
        </div>
      ) }
    </div>
  );
}

/**
 * Слой показан или скрыт. Скрытый — visibility:hidden (не display:none, иначе saveSVG() вернёт
 * пустую схему) и inert: hit-элементы diagram-js с pointer-events:all не перехватывают клики
 * и фокус видимого слоя ни в одном браузере.
 */
function layerProps(visible: boolean) {
  return { className: visible ? 'layer' : 'layer layer--hidden', inert: !visible };
}

function StartScreen() {
  return (
    <div className="start-screen">
      <div className="start-card">
        <BrandMark size={ 44 } />
        <h1>BPM Document Maker</h1>
        <p className="start-lead">
          Документация сквозного флоу: экраны мобильного приложения, вызовы backend
          через API Gateway и BPMN-схема обработки — в одном проекте.
        </p>

        <div className="start-actions">
          <button type="button" className="button button--primary button--large" onClick={ () => useUiStore.getState().openDialog('new') }>
            <Icon name="plus" />
            Новый проект
          </button>
          <button type="button" className="button button--large" onClick={ () => openProjectFile() }>
            <Icon name="folder" />
            Открыть .fmg
          </button>
        </div>
        <p className="start-hint">или перетащите файл проекта в окно</p>

        <ul className="start-features">
          <li>
            <span className="start-features__icon"><Icon name="phone" size={ 18 } /></span>
            <b>Прототип</b>
            <span>Скриншоты экранов, зоны и переходы — как в Figma</span>
          </li>
          <li>
            <span className="start-features__icon"><Icon name="schema" size={ 18 } /></span>
            <b>Backend</b>
            <span>BPMN-схема, связанная с экранами и вызовами</span>
          </li>
          <li>
            <span className="start-features__icon"><Icon name="export" size={ 18 } /></span>
            <b>Документ</b>
            <span>Проход по шагам, PDF и SVG всего флоу</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
