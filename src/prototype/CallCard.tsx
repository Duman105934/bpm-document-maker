import { describeNode } from '../bpmn/graph';
import Icon from '../app/Icon';
import { useBpmnGraph } from '../bpmn/useBpmnGraph';
import { formatJson } from '../modeler/sm/util.js';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

/** Карточка вызова backend в режиме «Просмотр»: видна на обоих слоях. */
export default function CallCard() {
  const view = useUiStore(s => s.viewCall);
  const activeLayer = useUiStore(s => s.activeLayer);
  const graph = useBpmnGraph();
  const screen = useProjectStore(s => s.project?.screens.find(sc => sc.id === view?.screenId));

  if (!view) {
    return null;
  }

  const { call } = view;
  const ui = useUiStore.getState;
  const node = call.bpmnElementId ? graph.nodes.get(call.bpmnElementId) : undefined;

  return (
    <aside className="call-card" aria-label="Вызов backend">
      <header className="call-card__head">
        <b>{ call.name || 'Вызов backend' }</b>
        <button type="button" className="call-card__close" aria-label="Закрыть" onClick={ () => ui().closeViewCall() }><Icon name="close" size={ 14 } /></button>
      </header>

      <div className="call-card__url">
        <span className="player__method">{ call.method }</span>
        <code>{ call.gatewayUrl || '—' }</code>
      </div>

      { (call.service || call.serviceUrl) && (
        <div className="call-card__route">
          роутинг: { call.service || '?' } → <code>{ call.serviceUrl || '?' }</code>
        </div>
      ) }

      { call.description && <p className="call-card__description">{ call.description }</p> }

      <JsonBlock title="Запрос" value={ call.requestJson } />
      <JsonBlock title="Ответ" value={ call.responseJson } />

      <footer className="call-card__foot">
        { call.bpmnElementId ? (
          node ? (
            <button type="button" onClick={ () => ui().openBpmnElement(call.bpmnElementId!) }>
              Узел: { describeNode(node) }
            </button>
          ) : <span className="element-info__warning">Узел { call.bpmnElementId } не найден на схеме</span>
        ) : <span className="call-card__muted">Узел схемы не задан</span> }

        { activeLayer === 'bpmn' && screen && (
          <button type="button" onClick={ () => ui().openScreen(screen.id) }>
            ← Экран { screen.name || 'Без названия' }
          </button>
        ) }
      </footer>
    </aside>
  );
}

function JsonBlock({ title, value }: { title: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  // невалидный JSON formatJson возвращает как есть
  return (
    <section className="call-card__json">
      <h4>{ title }</h4>
      <pre>{ formatJson(value) }</pre>
    </section>
  );
}
