/**
 * Просмотрщик схемы режима «Просмотр» (NavigatedViewer) вне React-состояния.
 *
 * Переходы на узел и на экран идут через единый проход (tokenWalk);
 * запрос до окончания импорта выполняется после него.
 */

import { tokenWalk } from './tokenWalk';

type Viewer = any;

class ViewerBridge {

  private viewer: Viewer | null = null;
  private ready = false;

  attach(viewer: Viewer) {
    this.viewer = viewer;
    this.ready = false;
    tokenWalk.attach(viewer);
  }

  detach(viewer: Viewer) {
    if (this.viewer === viewer) {
      this.viewer = null;
      this.ready = false;
    }

    tokenWalk.detach(viewer);
  }

  /** Схема импортирована — выполнить отложенный переход на узел. */
  markReady(viewer: Viewer) {
    if (this.viewer !== viewer) {
      return;
    }

    this.ready = true;
    tokenWalk.markReady(viewer);
  }

  /** Пересчитать размеры канвы (слой показан, панель открыта или закрыта). */
  resized() {
    this.viewer?.get('canvas').resized();
    tokenWalk.resized();
  }

  /** До импорта отвечает true: проверка будет при переходе. */
  hasElement(id: string): boolean {
    if (!id) {
      return false;
    }

    if (!this.viewer || !this.ready) {
      return true;
    }

    return !!this.viewer.get('elementRegistry').get(id);
  }

  /**
   * Поставить токен прохода на узел: слой схемы, центрирование, подсветка, инфо-панель.
   *
   * @returns false, если узла нет на схеме
   */
  walkTo(id: string): boolean {
    return tokenWalk.jump({ type: 'node', id });
  }

  /** Перейти в проходе на экран: слой «Прототип», экран в плеере. */
  walkToScreen(id: string): boolean {
    return tokenWalk.jump({ type: 'screen', id });
  }
}

export const viewerBridge = new ViewerBridge();
