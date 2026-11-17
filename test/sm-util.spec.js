import { describe, it, expect } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';

import smDescriptor from '../src/modeler/sm/moddle/sm.json';
import { formatJson, getCompatibleKinds, getJsonError, getKind } from '../src/modeler/sm/util.js';

const moddle = new BpmnModdle({ sm: smDescriptor });

function shape(type, attrs = {}) {
  return { type, businessObject: moddle.create(type, attrs) };
}

describe('sm util', () => {

  it('detects kind on tasks, events and data elements', () => {
    expect(getKind(shape('bpmn:Task', { 'sm:kind': 'api' }))).toBe('api');
    expect(getKind(shape('bpmn:DataStoreReference', { 'sm:kind': 'db' }))).toBe('db');
    expect(getKind(shape('bpmn:Task', { 'sm:kind': 'unknown' }))).toBeUndefined();
    expect(getKind(shape('bpmn:Task'))).toBeUndefined();
  });

  it('offers only kinds of the same family', () => {
    const flow = getCompatibleKinds(shape('bpmn:Task')).map(k => k.kind);
    const data = getCompatibleKinds(shape('bpmn:DataObjectReference')).map(k => k.kind);

    expect(flow).toEqual([ 'event', 'state', 'cmd', 'api', 'mobile' ]);
    expect(data).toEqual([ 'json', 'db' ]);
    expect(getCompatibleKinds(shape('bpmn:ExclusiveGateway'))).toEqual([]);
  });

  it('validates and formats JSON', () => {
    expect(getJsonError('')).toBeNull();
    expect(getJsonError('{"a": 1}')).toBeNull();
    expect(getJsonError('{a: 1}')).toMatch(/JSON|property|token/i);
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatJson('{bad')).toBe('{bad');
  });
});
