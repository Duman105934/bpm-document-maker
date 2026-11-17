/**
 * Связь схемы с проектом прототипа: список экранов и переход на экран.
 *
 * Данные даёт приложение через config.smProject:
 *   { getScreens(): {id, name, code}[], onOpenScreen(id), isViewMode(): boolean }
 * Без config.smProject сервис работает с пустым списком (тесты, старые схемы).
 */
export default class SmProjectBridge {

  constructor(smProject, eventBus) {
    this._project = smProject || null;
    this._eventBus = eventBus;
  }

  /** @returns {Array<{ id: string, name: string, code: string }>} */
  getScreens() {
    try {
      return (this._project && this._project.getScreens()) || [];
    } catch (error) {
      console.error('smProject.getScreens', error);

      return [];
    }
  }

  getScreen(id) {
    return id ? this.getScreens().find(screen => screen.id === id) : undefined;
  }

  /**
   * Опции выпадающего списка экранов.
   * Если текущее значение не найдено среди экранов — показать его как «(удалён)».
   */
  getScreenOptions(currentId) {
    const screens = this.getScreens();
    const options = [ { value: '', label: '—' } ];

    if (currentId && !screens.some(screen => screen.id === currentId)) {
      options.push({ value: currentId, label: `(удалён) ${ currentId }` });
    }

    screens.forEach(screen => {
      const name = screen.name || 'Без названия';

      options.push({ value: screen.id, label: screen.code ? `${ name } · ${ screen.code }` : name });
    });

    return options;
  }

  /** @returns {boolean} false, если экрана нет или приложение не подключено */
  openScreen(id) {
    if (!id || !this._project || !this.getScreen(id)) {
      return false;
    }

    this._project.onOpenScreen(id);

    return true;
  }

  isViewMode() {
    return !!(this._project && this._project.isViewMode && this._project.isViewMode());
  }

  /** Список экранов изменился — обновить панель свойств и значки. */
  notifyScreensChanged() {
    this._eventBus.fire('smProject.screensChanged');
  }
}

SmProjectBridge.$inject = [ 'config.smProject', 'eventBus' ];
