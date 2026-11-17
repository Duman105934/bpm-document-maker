import { exportSvg } from './svg-export.js';
import { getPageLayout, toPageRect } from './link-geometry.js';
import { PDF_FONT, registerFonts } from './pdf/fonts';

/**
 * Экспорт диаграммы в векторный PDF:
 *  - одна страница по размеру диаграммы;
 *  - текст остаётся текстом (выделяется и ищется), кириллица — встроенный шрифт PT Sans;
 *  - ссылки элементов — кликабельные link-аннотации.
 *
 * jsPDF и svg2pdf.js загружаются только при первом экспорте.
 *
 * @returns {Promise<Blob>}
 */
export async function exportPdf(modeler, { title = 'BPMN' } = {}) {
  const [ { jsPDF }, { svg2pdf } ] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js')
  ]);

  const { svg, viewBox, linkAreas } = await exportSvg(modeler, { fontFamily: PDF_FONT, anchors: false });

  const layout = getPageLayout(viewBox);

  const pdf = new jsPDF({
    orientation: layout.width >= layout.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [ layout.width, layout.height ],
    compress: true
  });

  await registerFonts(pdf, { mono: false });

  pdf.setProperties({
    title,
    subject: 'BPMN-диаграмма',
    creator: 'BPM Document Maker'
  });

  // svg2pdf нужен элемент в DOM, чтобы корректно вычислить стили
  const host = document.createElement('div');

  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:0;height:0;overflow:hidden;';
  host.innerHTML = svg;
  document.body.appendChild(host);

  try {
    const svgElement = host.querySelector('svg');

    await svg2pdf(svgElement, pdf, {
      x: layout.margin,
      y: layout.margin,
      width: viewBox.width * layout.scale,
      height: viewBox.height * layout.scale
    });
  } finally {
    host.remove();
  }

  linkAreas.forEach(area => {
    const rect = toPageRect(area, viewBox, layout);

    pdf.link(rect.x, rect.y, rect.width, rect.height, { url: area.href });
  });

  return pdf.output('blob');
}
