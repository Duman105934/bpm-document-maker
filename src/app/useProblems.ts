import { useMemo } from 'react';

import { useBpmnGraph } from '../bpmn/useBpmnGraph';
import { findProblems, type Problem } from '../model/refs';
import { useProjectStore } from '../store/projectStore';

/** Битые и неполные ссылки проекта; пересчитываются при правках прототипа и схемы. */
export function useProblems(): Problem[] {
  const project = useProjectStore(s => s.project);
  const graph = useBpmnGraph();

  return useMemo(() => project ? findProblems(project, graph) : [], [ project, graph ]);
}
