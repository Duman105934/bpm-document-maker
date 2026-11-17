import { KINDS } from './kinds.js';

/**
 * Создание и смена вида элементов state machine.
 */
export default class SmElementFactory {

  constructor(bpmnFactory, elementFactory, modeling, bpmnReplace, selection) {
    this._bpmnFactory = bpmnFactory;
    this._elementFactory = elementFactory;
    this._modeling = modeling;
    this._bpmnReplace = bpmnReplace;
    this._selection = selection;
  }

  /**
   * Новая фигура (ещё не на диаграмме) нужного вида.
   */
  createShape(kind) {
    const cfg = KINDS[kind];

    if (!cfg) {
      throw new Error(`unknown kind <${ kind }>`);
    }

    const businessObject = this._bpmnFactory.create(cfg.type);

    businessObject.set('sm:kind', kind);

    return this._elementFactory.createShape({
      type: cfg.type,
      businessObject,
      width: cfg.size.width,
      height: cfg.size.height
    });
  }

  /**
   * Сменить вид существующего элемента. Если BPMN-тип отличается (Event ↔ Task),
   * элемент заменяется через bpmnReplace; размер приводится к размеру вида,
   * центр фигуры сохраняется.
   *
   * @param {Object} element
   * @param {string|null} kind  null — убрать вид (обычная BPMN-задача/событие)
   */
  switchKind(element, kind) {
    const cfg = kind ? KINDS[kind] : null;
    const targetType = cfg ? cfg.type : element.type;

    let target = element;

    if (target.type !== targetType) {
      target = this._bpmnReplace.replaceElement(element, { type: targetType });
      this._selection.select(target);
    }

    this._modeling.updateProperties(target, { 'sm:kind': kind || undefined });

    const size = cfg ? cfg.size : this._elementFactory.getDefaultSize(target.businessObject);
    const cx = target.x + target.width / 2;
    const cy = target.y + target.height / 2;

    if (target.width !== size.width || target.height !== size.height) {
      this._modeling.resizeShape(target, {
        x: Math.round(cx - size.width / 2),
        y: Math.round(cy - size.height / 2),
        width: size.width,
        height: size.height
      });
    }

    return target;
  }
}

SmElementFactory.$inject = [ 'bpmnFactory', 'elementFactory', 'modeling', 'bpmnReplace', 'selection' ];
