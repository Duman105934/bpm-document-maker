import { is } from 'bpmn-js/lib/util/ModelUtil';

import { KIND_LIST } from './kinds.js';
import { getKindIconUrl } from './icons.js';

const GROUP = { id: 'sm', name: 'State machine' };

/**
 * Свои элементы в меню «Создать элемент» (… в палитре) и
 * «Добавить элемент» (… в context pad) — как в Camunda Modeler.
 */
export default class SmCreateAppendMenuProvider {

  constructor(popupMenu, create, autoPlace, mouse, smElementFactory) {
    this._create = create;
    this._autoPlace = autoPlace;
    this._mouse = mouse;
    this._smElementFactory = smElementFactory;
    this._popupMenu = popupMenu;

    popupMenu.registerProvider('bpmn-create', this._createProvider());
    popupMenu.registerProvider('bpmn-append', this._appendProvider());
  }

  _createProvider() {
    return {
      getPopupMenuEntries: () => entries => ({ ...this._entries('create', null), ...entries })
    };
  }

  _appendProvider() {
    return {
      getPopupMenuEntries: target => {
        if (!is(target, 'bpmn:FlowNode') || is(target, 'bpmn:EndEvent')) {
          return entries => entries;
        }

        return entries => ({ ...this._entries('append', target), ...entries });
      }
    };
  }

  _entries(mode, source) {
    const entries = {};

    KIND_LIST.forEach(cfg => {
      entries[`${ mode }-sm-${ cfg.kind }`] = {
        label: `${ cfg.title } — ${ cfg.description }`,
        imageUrl: getKindIconUrl(cfg.kind),
        group: GROUP,
        search: `${ cfg.kind } ${ cfg.title } ${ cfg.description }`,
        action: {
          click: event => this._start(event, cfg.kind, source),
          dragstart: event => this._start(event, cfg.kind, source, true)
        }
      };
    });

    return entries;
  }

  _start(event, kind, source, drag = false) {
    const shape = this._smElementFactory.createShape(kind);

    this._popupMenu.close();

    if (source && !drag) {
      return this._autoPlace.append(source, shape);
    }

    if (event instanceof KeyboardEvent) {
      event = this._mouse.getLastMoveEvent();
    }

    return this._create.start(event, shape, source ? { source } : undefined);
  }
}

SmCreateAppendMenuProvider.$inject = [ 'popupMenu', 'create', 'autoPlace', 'mouse', 'smElementFactory' ];
