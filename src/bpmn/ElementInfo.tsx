import { useSyncExternalStore } from 'react';

import { useUiStore } from '../store/uiStore';
import Icon from '../app/Icon';
import { tokenWalk } from './tokenWalk';

/** Описание узла из collectElementDoc (modeler/sm/element-doc.js) и его id. */
export interface ElementDoc {
  id: string;
  kind?: string;
  title: string;
  type: string;
  name: string;
  summary: string;
  documentation: string;
  fields: Array<{ key: string; label: string; value: string }>;
  parameters: Array<{ name: string; direction: 'in' | 'out'; type: string; required: boolean; description: string }>;
  json: Array<{ id: string; name: string; direction: string; body: string; error: string | null }>;
  columns: Array<{
    id: string;
    table: string;
    name: string;
    columns: Array<{ name: string; type: string; primaryKey: boolean; nullable: boolean; description: string }>;
  }>;
  links: Array<{ title: string; href: string }>;
  screen?: { id: string; name?: string; code?: string; missing: boolean };
}

/** Инфо-панель узла схемы в режиме «Просмотр». */
export default function ElementInfo({ doc, onClose }: { doc: ElementDoc; onClose(): void }) {
  const walk = useSyncExternalStore(tokenWalk.subscribe, tokenWalk.getSnapshot);
  // узел открыт кликом, а токен прохода стоит в другом месте — проход можно продолжить отсюда
  const canMoveToken = walk.ready && tokenWalk.hasNode(doc.id) && !(walk.pos?.type === 'node' && walk.pos.id === doc.id);

  return (
    <aside className="element-info" aria-label="Описание узла">
      <header className="element-info__head">
        <span className="element-info__kind">{ doc.title }</span>
        <button type="button" className="element-info__close" aria-label="Закрыть" onClick={ onClose }><Icon name="close" size={ 14 } /></button>
      </header>

      <h2 className="element-info__name">{ doc.name || doc.id }</h2>
      { doc.summary && <p className="element-info__summary">{ doc.summary }</p> }

      { canMoveToken && (
        <button
          type="button"
          className="element-info__link"
          title="Продолжить проход с этого узла"
          onClick={ () => tokenWalk.jump({ type: 'node', id: doc.id }) }
        >
          ▶ Проход отсюда
        </button>
      ) }

      { doc.screen && (
        <section>
          <h3>Экран прототипа</h3>
          { doc.screen.missing
            ? <p className="element-info__warning">Экран { doc.screen.id } удалён из прототипа</p>
            : (
              <button
                type="button"
                className="element-info__link"
                onClick={ () => useUiStore.getState().openScreen(doc.screen!.id) }
              >
                → { doc.screen.name || 'Без названия' }{ doc.screen.code ? ` · ${ doc.screen.code }` : '' }
              </button>
            ) }
        </section>
      ) }

      { doc.fields.length > 0 && (
        <dl className="element-info__fields">
          { doc.fields.map(field => (
            <div key={ field.key }>
              <dt>{ field.label }</dt>
              <dd>{ field.value }</dd>
            </div>
          )) }
        </dl>
      ) }

      { doc.documentation && (
        <section>
          <h3>Описание</h3>
          <p className="element-info__doc">{ doc.documentation }</p>
        </section>
      ) }

      { doc.parameters.length > 0 && (
        <section>
          <h3>Параметры</h3>
          <table className="element-info__table">
            <tbody>
              { doc.parameters.map((p, index) => (
                <tr key={ index }>
                  <td>{ p.direction === 'out' ? '←' : '→' }</td>
                  <td><code>{ p.name }</code>{ p.required ? ' *' : '' }</td>
                  <td>{ p.type }</td>
                  <td>{ p.description }</td>
                </tr>
              )) }
            </tbody>
          </table>
        </section>
      ) }

      { doc.json.map(item => (
        <section key={ `json-${ item.id }` }>
          <h3>JSON{ item.id !== doc.id && item.name ? `: ${ item.name }` : '' }</h3>
          { item.error && <p className="element-info__warning">{ item.error }</p> }
          <pre className="element-info__json">{ item.body }</pre>
        </section>
      )) }

      { doc.columns.map(table => (
        <section key={ `db-${ table.id }` }>
          <h3>Таблица { table.table || table.name }</h3>
          <table className="element-info__table">
            <tbody>
              { table.columns.map((c, index) => (
                <tr key={ index }>
                  <td><code>{ c.name }</code>{ c.primaryKey ? ' 🔑' : '' }</td>
                  <td>{ c.type }{ c.nullable ? '?' : '' }</td>
                  <td>{ c.description }</td>
                </tr>
              )) }
            </tbody>
          </table>
        </section>
      )) }

      { doc.links.length > 0 && (
        <section>
          <h3>Ссылки</h3>
          <ul className="element-info__links">
            { doc.links.map((link, index) => (
              <li key={ index }><a href={ link.href } target="_blank" rel="noopener noreferrer">{ link.title || link.href }</a></li>
            )) }
          </ul>
        </section>
      ) }
    </aside>
  );
}
