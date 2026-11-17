import { SCREEN_BADGE_CLASS } from './constants.js';
import { getScreenId } from './util.js';

/**
 * Переход со схемы на экран прототипа.
 *
 * В редакторе — клик по значку экрана на фигуре Cmd / Mobile с sm:screen.
 * В режиме просмотра — клик по всей фигуре.
 *
 * Поверх фигуры лежит прозрачный hit-элемент diagram-js, поэтому попадание
 * в значок определяем по координатам, как в SmLinkBadgeClick.
 *
 * Также перерисовывает значки, когда в проекте меняется список экранов
 * (название в подсказке, «битая» ссылка).
 */
export default class SmScreenBadgeClick {

  constructor(eventBus, elementRegistry, smProjectBridge) {
    eventBus.on('element.click', 1500, event => {
      const { element, originalEvent } = event;

      if (!originalEvent || element.labelTarget) {
        return;
      }

      const screenId = getScreenId(element);

      if (!screenId) {
        return;
      }

      if (!smProjectBridge.isViewMode() && !isInsideBadge(elementRegistry, element, originalEvent)) {
        return;
      }

      if (smProjectBridge.openScreen(screenId)) {

        // не выделять элемент и не открывать context pad
        return false;
      }
    });

    eventBus.on('smProject.screensChanged', () => {
      const elements = elementRegistry.filter(element => !!getScreenId(element));

      if (elements.length) {
        eventBus.fire('elements.changed', { elements });
      }
    });
  }
}

SmScreenBadgeClick.$inject = [ 'eventBus', 'elementRegistry', 'smProjectBridge' ];

function isInsideBadge(elementRegistry, element, originalEvent) {
  const gfx = elementRegistry.getGraphics(element);
  const badge = gfx && gfx.querySelector(`.${ SCREEN_BADGE_CLASS }`);

  if (!badge) {
    return false;
  }

  const rect = badge.getBoundingClientRect();
  const { clientX: x, clientY: y } = originalEvent;

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
