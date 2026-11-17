import SmRenderer from './SmRenderer.js';
import SmElementFactory from './SmElementFactory.js';
import SmPaletteProvider from './SmPaletteProvider.js';
import SmContextPadProvider from './SmContextPadProvider.js';
import SmReplaceMenuProvider from './SmReplaceMenuProvider.js';
import SmCreateAppendMenuProvider from './SmCreateAppendMenuProvider.js';
import SmTooltip from './SmTooltip.js';
import SmLinkBadgeClick from './SmLinkBadgeClick.js';
import SmProjectBridge from './SmProjectBridge.js';
import SmScreenBadgeClick from './SmScreenBadgeClick.js';

export { default as smModdleDescriptor } from './moddle/sm.json';

/**
 * Отрисовка и навигация — для редактора и для режима «Просмотр» (NavigatedViewer).
 */
export const SmViewModule = {
  __init__: [
    'smRenderer',
    'smTooltip',
    'smLinkBadgeClick',
    'smScreenBadgeClick'
  ],
  smRenderer: [ 'type', SmRenderer ],
  smTooltip: [ 'type', SmTooltip ],
  smLinkBadgeClick: [ 'type', SmLinkBadgeClick ],
  smProjectBridge: [ 'type', SmProjectBridge ],
  smScreenBadgeClick: [ 'type', SmScreenBadgeClick ]
};

/**
 * Редактирование: палитра, context pad, замена вида, меню создания.
 */
export const SmEditModule = {
  __depends__: [ SmViewModule ],
  __init__: [
    'smPaletteProvider',
    'smContextPadProvider',
    'smReplaceMenuProvider',
    'smCreateAppendMenuProvider'
  ],
  smElementFactory: [ 'type', SmElementFactory ],
  smPaletteProvider: [ 'type', SmPaletteProvider ],
  smContextPadProvider: [ 'type', SmContextPadProvider ],
  smReplaceMenuProvider: [ 'type', SmReplaceMenuProvider ],
  smCreateAppendMenuProvider: [ 'type', SmCreateAppendMenuProvider ]
};

/** diagram-js модуль элементов state machine (редактор целиком). */
export default SmEditModule;
