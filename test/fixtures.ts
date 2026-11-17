import type { Hotspot, Screen } from '../src/model/types';

/** Экран 100×200, показ шириной 100. */
export function screen(id: string, hotspots: Hotspot[] = []): Screen {
  return {
    id,
    name: id,
    code: '',
    description: '',
    asset: { path: `screens/${ id }.png`, mime: 'image/png', width: 100, height: 200 },
    position: { x: 0, y: 0 },
    displayWidth: 100,
    hotspots,
    onOpenCalls: []
  };
}

/**
 * A → Sub (свёрнутый: SubStart → B) → C; на A граничное событие ошибки Err → E.
 * Узлы подпроцесса — на своей плоскости с далёкими координатами.
 */
export const SUBPROCESS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="D" targetNamespace="x">
  <bpmn:process id="P">
    <bpmn:startEvent id="S" />
    <bpmn:task id="A" />
    <bpmn:boundaryEvent id="Err" attachedToRef="A"><bpmn:errorEventDefinition /></bpmn:boundaryEvent>
    <bpmn:task id="E" />
    <bpmn:subProcess id="Sub">
      <bpmn:startEvent id="SubStart" />
      <bpmn:task id="B" />
      <bpmn:sequenceFlow id="fs1" sourceRef="SubStart" targetRef="B" />
    </bpmn:subProcess>
    <bpmn:task id="C" />
    <bpmn:sequenceFlow id="f0" sourceRef="S" targetRef="A" />
    <bpmn:sequenceFlow id="f1" sourceRef="A" targetRef="Sub" />
    <bpmn:sequenceFlow id="f2" sourceRef="Sub" targetRef="C" />
    <bpmn:sequenceFlow id="fe" sourceRef="Err" targetRef="E" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Dia">
    <bpmndi:BPMNPlane id="Plane" bpmnElement="P">
      <bpmndi:BPMNShape id="S_di" bpmnElement="S"><dc:Bounds x="0" y="20" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="A_di" bpmnElement="A"><dc:Bounds x="100" y="0" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Err_di" bpmnElement="Err"><dc:Bounds x="160" y="62" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="E_di" bpmnElement="E"><dc:Bounds x="250" y="150" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Sub_di" bpmnElement="Sub" isExpanded="false"><dc:Bounds x="250" y="0" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="C_di" bpmnElement="C"><dc:Bounds x="400" y="0" width="100" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
  <bpmndi:BPMNDiagram id="DiaSub">
    <bpmndi:BPMNPlane id="PlaneSub" bpmnElement="Sub">
      <bpmndi:BPMNShape id="SubStart_di" bpmnElement="SubStart"><dc:Bounds x="5000" y="-3000" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="B_di" bpmnElement="B"><dc:Bounds x="5100" y="-3020" width="100" height="80" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
