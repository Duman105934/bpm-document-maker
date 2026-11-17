/**
 * Фрагмент BPMN-схемы для страницы узла: область обрезки и облегчённый клон SVG.
 *
 * svg2pdf пишет в PDF всё содержимое SVG, даже то, что обрезано viewBox,
 * поэтому группы элементов вне области удаляются из клона.
 */

import type { Bounds, BpmnGraph } from '../bpmn/graph';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CROP_PADDING = 40;
const MIN_CROP = 240;

/**
 * Область фрагмента: узел, соседи по sequenceFlow, связанные JSON/DB и отступ;
 * расширяется до соотношения сторон aspect (w/h) вокруг центра.
 * maxSize — наибольший размер области (в координатах схемы), при котором подписи ещё читаемы
 * (ширина картинки на странице / минимальный масштаб): дальние соседи, с которыми область
 * его превысила бы, не включаются — стрелка к ним просто обрежется краем.
 * null — у узла нет фигуры на схеме.
 */
export function computeCrop(
    graph: BpmnGraph,
    nodeId: string,
    aspect: number,
    maxSize?: { width: number; height: number }
): CropRect | null {
  const node = graph.nodes.get(nodeId);

  if (!node?.bounds) {
    return null;
  }

  const neighbours = new Set<string>([ ...node.dataIn, ...node.dataOut ]);

  node.outgoing.forEach(id => {
    const flow = graph.flows.get(id);

    if (flow) {
      neighbours.add(flow.targetRef);
    }
  });

  node.incoming.forEach(id => {
    const flow = graph.flows.get(id);

    if (flow) {
      neighbours.add(flow.sourceRef);
    }
  });

  neighbours.delete(nodeId);

  const safe = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const center = node.bounds;
  const distance = (b: Bounds) => Math.hypot(
    b.x + b.width / 2 - (center.x + center.width / 2),
    b.y + b.height / 2 - (center.y + center.height / 2)
  );

  // ближние соседи первыми: если дальний не помещается, ближние всё равно остаются
  const candidates = [ ...neighbours ]
    .map(id => graph.nodes.get(id)?.bounds)
    .filter((b): b is Bounds => !!b)
    .sort((a, b) => distance(a) - distance(b));

  let boxes: Bounds[] = [ center ];

  candidates.forEach(candidate => {
    const next = [ ...boxes, candidate ];
    const crop = cropAround(next, safe);

    if (!maxSize || (crop.width <= maxSize.width && crop.height <= maxSize.height)) {
      boxes = next;
    }
  });

  return cropAround(boxes, safe);
}

function cropAround(boxes: Bounds[], aspect: number): CropRect {
  let minX = Math.min(...boxes.map(b => b.x)) - CROP_PADDING;
  let minY = Math.min(...boxes.map(b => b.y)) - CROP_PADDING;
  let maxX = Math.max(...boxes.map(b => b.x + b.width)) + CROP_PADDING;
  let maxY = Math.max(...boxes.map(b => b.y + b.height)) + CROP_PADDING;

  // не меньше минимального размера, чтобы одиночный узел не растягивался на всю страницу
  const grow = (min: number, max: number, size: number) => {
    const extra = Math.max(0, size - (max - min)) / 2;

    return [ min - extra, max + extra ];
  };

  [ minX, maxX ] = grow(minX, maxX, MIN_CROP);
  [ minY, maxY ] = grow(minY, maxY, MIN_CROP * 0.6);

  const width = maxX - minX;
  const height = maxY - minY;

  if (width / height < aspect) {
    [ minX, maxX ] = grow(minX, maxX, height * aspect);
  } else {
    [ minY, maxY ] = grow(minY, maxY, width / aspect);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function intersects(a: CropRect | Bounds, b: CropRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Клон SVG схемы с элементами только из области crop и viewBox = crop.
 * Узлы проверяются по bounds из графа, потоки — по концам; элементы,
 * которых нет в графе (ассоциации данных, подписи), остаются,
 * если их базовый элемент внутри области или граф о нём ничего не знает.
 */
export function pruneSvg(doc: Document, graph: BpmnGraph, crop: CropRect): Document {
  const clone = doc.cloneNode(true) as Document;
  const root = clone.documentElement;

  const inside = (id: string): boolean | null => {
    const node = graph.nodes.get(id);

    if (node) {
      return node.bounds ? intersects(node.bounds, crop) : false;
    }

    const flow = graph.flows.get(id);

    if (flow) {
      return !!(inside(flow.sourceRef) || inside(flow.targetRef));
    }

    return null;
  };

  root.querySelectorAll('[data-element-id]').forEach(gfx => {
    if (!gfx.isConnected) {
      return;
    }

    const id = gfx.getAttribute('data-element-id') || '';
    // подпись — «<id>_label», но сначала полный id: узел может называться и «Task_label»
    const base = graph.nodes.has(id) || graph.flows.has(id) ? id : id.replace(/_label$/, '');
    const keep = inside(base);

    if (keep === false) {
      const group = gfx.parentElement;

      // djs-group — обёртка ровно одного элемента
      if (group && group.classList.contains('djs-group') && group.children.length === 1) {
        group.remove();
      } else {
        gfx.remove();
      }
    }
  });

  root.setAttribute('viewBox', `${ crop.x } ${ crop.y } ${ crop.width } ${ crop.height }`);
  root.setAttribute('width', String(crop.width));
  root.setAttribute('height', String(crop.height));

  return clone;
}

/** Центр узла во фрагменте в долях 0..1; null — узла во фрагменте нет. */
export function anchorInCrop(bounds: Bounds | null | undefined, crop: CropRect): { x: number; y: number } | null {
  if (!bounds || !intersects(bounds, crop)) {
    return null;
  }

  return {
    x: (bounds.x + bounds.width / 2 - crop.x) / crop.width,
    y: (bounds.y + bounds.height / 2 - crop.y) / crop.height
  };
}
