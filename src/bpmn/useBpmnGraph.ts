import { useMemo, useSyncExternalStore } from 'react';

import { bpmnBridge } from './bpmnBridge';
import type { BpmnGraph } from './graph';

const subscribe = (listener: () => void) => bpmnBridge.onGraphChanged(listener);
const getRevision = () => bpmnBridge.getGraphRevision();

/** Граф текущей схемы; обновляется при правках и импорте. */
export function useBpmnGraph(): BpmnGraph {
  const revision = useSyncExternalStore(subscribe, getRevision);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => bpmnBridge.getGraph(), [ revision ]);
}
