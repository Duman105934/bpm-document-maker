import { getKindIconUrl } from './icons.js';
import { getCompatibleKinds, getKind } from './util.js';

const GROUP = { id: 'sm', name: 'State machine' };

/**
 * Popup menu «Заменить» (гаечный ключ): смена вида.
 *
 * Задачи и промежуточные события ↔ Event / State / Cmd / API / Mobile;
 * объекты и хранилища данных ↔ JSON / DB table.
 *
 * Для sm-элементов показываем только свои варианты (стандартная замена
 * типа сохранила бы sm:kind и запутала бы пользователя).
 */
export default class SmReplaceMenuProvider {

  constructor(popupMenu, smElementFactory, translate) {
    this._smElementFactory = smElementFactory;
    this._translate = translate;

    popupMenu.registerProvider('bpmn-replace', this);
  }

  getPopupMenuEntries(target) {
    const kinds = getCompatibleKinds(target);

    if (!kinds.length) {
      return {};
    }

    const currentKind = getKind(target);
    const smElementFactory = this._smElementFactory;
    const translate = this._translate;

    const smEntries = {};

    kinds
      .filter(cfg => cfg.kind !== currentKind)
      .forEach(cfg => {
        smEntries[`replace-with-sm-${ cfg.kind }`] = {
          label: `${ cfg.title } — ${ cfg.description }`,
          imageUrl: getKindIconUrl(cfg.kind),
          group: GROUP,
          action: () => smElementFactory.switchKind(target, cfg.kind)
        };
      });

    if (currentKind) {
      smEntries['replace-with-sm-none'] = {
        label: translate('Plain BPMN element (no kind)'),
        className: target.type === 'bpmn:Task' ? 'bpmn-icon-task' : '',
        group: GROUP,
        action: () => smElementFactory.switchKind(target, null)
      };

      return () => smEntries;
    }

    return entries => ({ ...smEntries, ...entries });
  }

  getPopupMenuHeaderEntries(target) {
    if (getKind(target)) {

      // маркеры циклов/компенсации для sm-элементов не нужны
      return () => ({});
    }

    return entries => entries;
  }
}

SmReplaceMenuProvider.$inject = [ 'popupMenu', 'smElementFactory', 'translate' ];
