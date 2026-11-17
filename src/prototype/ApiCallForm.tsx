import { useMemo } from 'react';

import { describeNode } from '../bpmn/graph';
import { useBpmnGraph } from '../bpmn/useBpmnGraph';
import { formatJson, getJsonError } from '../modeler/sm/util.js';
import { HTTP_METHODS, type ApiCall, type HttpMethod } from '../model/types';
import { useUiStore } from '../store/uiStore';
import { pickCallNode, updateCall, type CallRef } from './actions';
import { CommitInput, Field } from './fields';

/** Узлы, к которым имеет смысл привязать вызов: не объекты данных. */
const DATA_TYPES = new Set([ 'bpmn:DataObjectReference', 'bpmn:DataStoreReference' ]);

/** Форма вызова backend через API Gateway. */
export default function ApiCallForm({ call, callRef }: { call: ApiCall; callRef: CallRef }) {
  const graph = useBpmnGraph();
  const picking = useUiStore(s => s.picking);
  const set = (patch: Partial<ApiCall>) => updateCall(callRef, patch);

  const nodeOptions = useMemo(() => Array.from(graph.nodes.values())
    .filter(node => !DATA_TYPES.has(node.type))
    .map(node => ({ id: node.id, label: describeNode(node) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru')), [ graph ]);

  const nodeId = call.bpmnElementId || '';
  const nodeMissing = !!nodeId && !graph.nodes.has(nodeId);

  return (
    <div className="api-call-form">
      <Field label="Название">
        <CommitInput value={ call.name } placeholder="например, Отправить OTP" onCommit={ name => set({ name }) } />
      </Field>

      <div className="api-call-row">
        <Field label="Метод">
          <select value={ call.method } onChange={ event => set({ method: event.target.value as HttpMethod }) }>
            { HTTP_METHODS.map(method => <option key={ method } value={ method }>{ method }</option>) }
          </select>
        </Field>

        <Field label="Внешний URL (gateway)">
          <CommitInput value={ call.gatewayUrl } placeholder="/api/v1/otp/send" onCommit={ gatewayUrl => set({ gatewayUrl }) } />
        </Field>
      </div>

      <Field label="Сервис">
        <CommitInput value={ call.service } placeholder="otp-service" onCommit={ service => set({ service }) } />
      </Field>

      <Field label="Внутренний URL сервиса">
        <CommitInput value={ call.serviceUrl } placeholder="/internal/otp/send" onCommit={ serviceUrl => set({ serviceUrl }) } />
      </Field>

      <JsonField label="JSON запроса" value={ call.requestJson } onCommit={ requestJson => set({ requestJson }) } />
      <JsonField label="JSON ответа" value={ call.responseJson } onCommit={ responseJson => set({ responseJson }) } />

      <Field label="Описание">
        <CommitInput multiline value={ call.description } onCommit={ description => set({ description }) } />
      </Field>

      <Field
        label="Узел BPMN"
        hint={ nodeMissing ? '⚠ Узел не найден на схеме' : 'С какого узла схемы начинается обработка' }
      >
        <select
          className={ nodeMissing ? 'invalid' : undefined }
          value={ nodeId }
          onChange={ event => set({ bpmnElementId: event.target.value || undefined }) }
        >
          <option value="">—</option>
          { nodeMissing && <option value={ nodeId }>(нет на схеме) { nodeId }</option> }
          { nodeOptions.map(option => <option key={ option.id } value={ option.id }>{ option.label }</option>) }
        </select>
      </Field>

      <div className="inspector-actions">
        <button type="button" disabled={ picking } onClick={ () => pickCallNode(callRef) }>Выбрать на схеме</button>
        <button
          type="button"
          disabled={ !nodeId || nodeMissing }
          onClick={ () => useUiStore.getState().openBpmnElement(nodeId) }
        >Перейти к узлу</button>
      </div>
    </div>
  );
}

function JsonField({ label, value, onCommit }: { label: string; value: string; onCommit(value: string): void }) {
  return (
    <div className="form-field inspector-field">
      <span>{ label }</span>
      <CommitInput multiline monospace rows={ 4 } value={ value } placeholder="{ }" onCommit={ onCommit }>
        { (draft, commit) => {
          const error = getJsonError(draft);

          return (
            <div className="json-field-footer">
              <span className={ `inspector-field-hint ${ error ? 'inspector-field-hint--error' : '' }` }>
                { error ? `JSON некорректен: ${ error }` : '' }
              </span>
              <button
                type="button"
                className="field-inline-button"
                disabled={ !draft.trim() || !!error }
                onClick={ () => commit(formatJson(draft)) }
              >Форматировать</button>
            </div>
          );
        } }
      </CommitInput>
    </div>
  );
}
