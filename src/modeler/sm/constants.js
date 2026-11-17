/** Размер значка ссылки на фигуре (px). */
export const LINK_BADGE_SIZE = 14;

/** CSS-класс группы значка ссылки. */
export const LINK_BADGE_CLASS = 'sm-link-badge';

/**
 * Положение значка ссылки в локальных координатах фигуры.
 * В крупных фигурах (задачи, пулы) — внутри правого верхнего угла, как маркеры BPMN;
 * в мелких (события, данные) — снаружи у правого верхнего угла.
 */
export function getBadgeBounds(width, height) {
  const inside = width >= 60 && height >= 50;

  return {
    x: inside ? width - LINK_BADGE_SIZE - 5 : width - LINK_BADGE_SIZE / 2 + 2,
    y: inside ? 5 : -LINK_BADGE_SIZE / 2 - 2,
    width: LINK_BADGE_SIZE,
    height: LINK_BADGE_SIZE
  };
}

/** Размер значка экрана прототипа на фигуре (px). */
export const SCREEN_BADGE_SIZE = 14;

/** CSS-класс группы значка экрана. */
export const SCREEN_BADGE_CLASS = 'sm-screen-badge';

/**
 * Положение значка экрана: правый нижний угол — правый верхний занят значком ссылки.
 * В крупных фигурах — внутри, в мелких — снаружи.
 */
export function getScreenBadgeBounds(width, height) {
  const inside = width >= 60 && height >= 50;

  return {
    x: inside ? width - SCREEN_BADGE_SIZE - 5 : width - SCREEN_BADGE_SIZE / 2 + 2,
    y: inside ? height - SCREEN_BADGE_SIZE - 5 : height - SCREEN_BADGE_SIZE / 2 + 2,
    width: SCREEN_BADGE_SIZE,
    height: SCREEN_BADGE_SIZE
  };
}
