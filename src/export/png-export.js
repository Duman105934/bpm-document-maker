import { exportSvg } from './svg-export.js';

/**
 * Экспорт в PNG с масштабом (2x, 4x) для детализации. Ссылки в PNG невозможны.
 *
 * @returns {Promise<Blob>}
 */
export async function exportPng(modeler, { scale = 2 } = {}) {
  const { svg, viewBox } = await exportSvg(modeler);

  const width = Math.ceil(viewBox.width * scale);
  const height = Math.ceil(viewBox.height * scale);

  // ограничение браузеров на размер canvas (~16k по стороне, ~268 Мпикс площадь)
  const limit = Math.min(1, 16384 / width, 16384 / height, Math.sqrt(268e6 / (width * height)));

  const canvas = document.createElement('canvas');

  canvas.width = Math.floor(width * limit);
  canvas.height = Math.floor(height * limit);

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const image = await loadSvgImage(svg);

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG')), 'image/png');
  });
}

function loadSvgImage(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([ svg ], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось отрисовать SVG'));
    };

    image.src = url;
  });
}
