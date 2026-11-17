import { LINK_BADGE_CLASS } from './constants.js';
import { getSafeLinks } from './util.js';

/**
 * Клик по значку 🔗 на фигуре открывает первую ссылку элемента в новой вкладке.
 *
 * Поверх фигуры лежит прозрачный hit-элемент diagram-js, поэтому цель клика
 * определяем по координатам значка, а не по event.target.
 */
export default class SmLinkBadgeClick {

  constructor(eventBus, elementRegistry) {
    eventBus.on('element.click', 1500, event => {
      const { element, originalEvent } = event;

      if (!originalEvent || element.labelTarget) {
        return;
      }

      const gfx = elementRegistry.getGraphics(element);
      const badge = gfx && gfx.querySelector(`.${ LINK_BADGE_CLASS }`);

      if (!badge) {
        return;
      }

      const rect = badge.getBoundingClientRect();
      const { clientX: x, clientY: y } = originalEvent;

      const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

      if (!inside) {
        return;
      }

      const [ link ] = getSafeLinks(element);

      if (link) {
        window.open(link.href, '_blank', 'noopener,noreferrer');
      }
    });
  }
}

SmLinkBadgeClick.$inject = [ 'eventBus', 'elementRegistry' ];
