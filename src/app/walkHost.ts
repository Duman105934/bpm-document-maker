/**
 * Связь единого прохода (bpmn/tokenWalk.ts) с приложением: откуда брать экраны
 * и как показать экран, схему и карточку вызова. Подключается один раз из App.
 */

import { tokenWalk } from '../bpmn/tokenWalk';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

tokenWalk.setHost({
  getScreens: () => useProjectStore.getState().project?.screens ?? [],
  startScreenId: () => useProjectStore.getState().project?.startScreenId ?? null,
  viewScreenId: () => useUiStore.getState().viewScreenId,
  showScreen: id => useUiStore.setState({ activeLayer: 'prototype', viewScreenId: id }),
  showSchema: () => {
    if (useUiStore.getState().activeLayer !== 'bpmn') {
      useUiStore.setState({ activeLayer: 'bpmn' });
    }
  },
  showCall: view => {
    if (useUiStore.getState().viewCall?.call !== view?.call) {
      useUiStore.setState({ viewCall: view });
    }
  }
});
