import { is } from 'bpmn-js/lib/util/ModelUtil';

import { KIND_LIST } from './kinds.js';
import { getKindIconUrl, getScreenGlyphMarkup } from './icons.js';
import { getScreenId } from './util.js';

const SCREEN_ICON_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 16 16" width="28" height="28">' +
  getScreenGlyphMarkup('#2D5BE3', 1.3) + '</svg>'
);

/**
 * Context pad: «добавить следующим» Event / State / Cmd / Mobile
 * и «Перейти к экрану» для элементов с sm:screen.
 */
export default class SmContextPadProvider {

  constructor(contextPad, create, autoPlace, smElementFactory, translate, smProjectBridge) {
    this._create = create;
    this._autoPlace = autoPlace;
    this._smElementFactory = smElementFactory;
    this._translate = translate;
    this._smProjectBridge = smProjectBridge;

    contextPad.registerProvider(this);
  }

  getContextPadEntries(element) {
    const smEntries = {
      ...this._getScreenEntries(element),
      ...(canAppend(element) ? this._getAppendEntries(element) : {})
    };

    if (!Object.keys(smEntries).length) {
      return {};
    }

    return entries => ({ ...entries, ...smEntries });
  }

  _getScreenEntries(element) {
    const screenId = element && !element.labelTarget ? getScreenId(element) : undefined;
    const smProjectBridge = this._smProjectBridge;

    if (!screenId || !smProjectBridge.getScreen(screenId)) {
      return {};
    }

    return {
      'sm.open-screen': {
        group: 'sm-screen',
        className: 'sm-context-pad-entry',
        imageUrl: SCREEN_ICON_URL,
        title: 'Перейти к экрану',
        action: {
          click: () => smProjectBridge.openScreen(screenId)
        }
      }
    };
  }

  _getAppendEntries(element) {
    const create = this._create;
    const autoPlace = this._autoPlace;
    const smElementFactory = this._smElementFactory;
    const translate = this._translate;

    const smEntries = {};

    // данные (JSON, DB table) — через меню «…»
    KIND_LIST.filter(cfg => cfg.family === 'flow').forEach(cfg => {
      smEntries[`append.sm-${ cfg.kind }`] = {
        group: 'sm-append',
        className: 'sm-context-pad-entry',
        imageUrl: getKindIconUrl(cfg.kind),
        title: translate('Append {kind}', { kind: cfg.title }),
        action: {
          click: () => {
            autoPlace.append(element, smElementFactory.createShape(cfg.kind));
          },
          dragstart: event => {
            create.start(event, smElementFactory.createShape(cfg.kind), { source: element });
          }
        }
      };
    });

    return smEntries;
  }
}

SmContextPadProvider.$inject = [ 'contextPad', 'create', 'autoPlace', 'smElementFactory', 'translate', 'smProjectBridge' ];

function canAppend(element) {
  if (!element || element.labelTarget || element.waypoints) {
    return false;
  }

  if (!is(element, 'bpmn:FlowNode') || is(element, 'bpmn:EndEvent')) {
    return false;
  }

  // у события-границы своя логика присоединения, но append тоже работает
  return true;
}
