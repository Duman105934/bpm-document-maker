/**
 * PDF «Документация флоу»: обложка, оглавление, страницы экранов и узлов
 * в порядке buildFlowOrder.
 *
 * Сначала план и раскладка всех разделов (нужны номера страниц для ссылок),
 * затем отрисовка. Текст — jsPDF напрямую, фрагменты схемы — svg2pdf.
 */

import type { BpmnGraph } from '../../bpmn/graph';
import { buildFlowOrder, sortHotspots } from '../../model/flow';
import type { Asset, Project, Screen } from '../../model/types';
import { anchorInCrop, computeCrop, pruneSvg, type CropRect } from '../bpmn-fragment';
import { rasterizeAsset, type RasterImage } from '../raster';
import { nodeCallouts, screenCallouts, type NodeDoc } from './content';
import { PDF_FONT, PDF_MONO_FONT, glyphCheck, registerFonts } from './fonts';
import {
  A4_LANDSCAPE,
  BOX_PAD,
  FONT_SIZE,
  LINE_HEIGHT,
  columnRects,
  contentArea,
  fitRect,
  layoutSection,
  type Box,
  type LayoutPage,
  type LineStyle,
  type Measurer,
  type Rect
} from './layout';
import { assignPages, planDocument, type PageAssignment, type PlanSection } from './plan';
import { sanitizePdfText, type GlyphCheck } from './text';

export interface FlowPdfInput {
  project: Project;
  graph: BpmnGraph;
  /** обработанный SVG схемы (шрифт PTSans, без <a>); null — схемы нет */
  bpmnDoc: Document | null;
  /** описание узла (collectElementDoc) или null */
  getNodeDoc(id: string): NodeDoc | null;
  getAsset(path: string): Blob | undefined;
}

type Pdf = any;

/**
 * Минимальный масштаб фрагмента схемы (pt на единицу схемы): подпись 11 px печатается
 * не мельче 6,6 pt. Дальние соседи, которые его нарушили бы, во фрагмент не попадают.
 */
const MIN_FRAGMENT_SCALE = 0.6;

/** Покрытие PT Sans глифами — задаётся после регистрации шрифтов в exportFlowPdf. */
let sansCovers: GlyphCheck | undefined;

/** Текст для pdf.text шрифтом PT Sans: символы вне шрифта заменены. */
function pdfText(value: string): string {
  return sanitizePdfText(value, { covers: sansCovers });
}

const G = A4_LANDSCAPE;
const TOC_LINE = 16;
const TOC_TOP = 34;
/** экраны уменьшаются до этой высоты (px) — иначе PDF раздувается */
const MAX_RASTER = { width: 2000, height: 1400 };

const COLOR = {
  text: '#1f2328',
  muted: '#6e7781',
  link: '#0969da',
  line: '#d0d7de',
  box: '#f6f8fa',
  leader: '#8c959f',
  hotspot: '#0969da',
  gateway: '#d1470b',
  highlight: '#d1470b'
};

interface SectionLayout {
  section: PlanSection;
  pages: LayoutPage[];
  screen?: Screen;
  image?: RasterImage | null;
  crop?: CropRect | null;
  nodeId?: string;
}

export async function exportFlowPdf(input: FlowPdfInput): Promise<Blob> {
  const [ { jsPDF }, { svg2pdf } ] = await Promise.all([ import('jspdf'), import('svg2pdf.js') ]);
  const { project, graph } = input;

  const pdf: Pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });

  await registerFonts(pdf);

  // jsPDF молча выбрасывает символы, которых нет в шрифте, — заменяем их до вывода
  const covers = {
    sans: glyphCheck(pdf, PDF_FONT, 'normal', glyphCheck(pdf, PDF_FONT, 'bold')),
    mono: glyphCheck(pdf, PDF_MONO_FONT, 'normal')
  };

  sansCovers = covers.sans;

  const measurer = createMeasurer(pdf, covers);
  const flow = buildFlowOrder(project, graph);
  const plan = planDocument(project, graph, flow);
  const center = columnRects(G).center;
  const centerAspect = center.width / center.height;
  const screens = new Map(project.screens.map(screen => [ screen.id, screen ]));

  // раскладка разделов ////////////////////

  const layouts: SectionLayout[] = [];

  for (const section of plan.sections) {
    if (section.kind === 'screen') {
      const screen = screens.get(section.id)!;
      const image = await rasterizeAsset(input.getAsset(screen.asset.path), screen.asset, MAX_RASTER);
      const aspect = image ? image.width / image.height : screen.asset.width / Math.max(1, screen.asset.height);
      const callouts = screenCallouts(screen, project, graph, plan);

      layouts.push({ section, screen, image, pages: layoutSection(callouts, aspect, measurer) });
    } else {
      const node = graph.nodes.get(section.id)!;
      const crop = input.bpmnDoc
        ? computeCrop(graph, node.id, centerAspect, { width: center.width / MIN_FRAGMENT_SCALE, height: center.height / MIN_FRAGMENT_SCALE })
        : null;
      const anchorOf = (id: string) => (crop ? anchorInCrop(graph.nodes.get(id)?.bounds, crop) : null);
      const doc = input.getNodeDoc(node.id) ?? fallbackDoc(node.name, node.type);
      const callouts = nodeCallouts(node, doc, graph, plan, anchorOf);

      layouts.push({ section, crop, nodeId: node.id, pages: layoutSection(callouts, crop ? centerAspect : null, measurer) });
    }
  }

  const tocLines = Math.floor((contentArea(G).height - TOC_TOP) / TOC_LINE);
  const pages = assignPages(plan, layouts.map(layout => layout.pages.length), tocLines);

  // отрисовка ////////////////////

  const cover = project.meta.coverAsset
    ? await rasterizeAsset(input.getAsset(project.meta.coverAsset.path), project.meta.coverAsset, MAX_RASTER)
    : null;

  drawCover(pdf, project, cover);
  drawToc(pdf, plan.sections, pages, tocLines);

  for (const layout of layouts) {
    for (let index = 0; index < layout.pages.length; index++) {
      pdf.addPage();

      const page = layout.pages[index];

      drawSectionTitle(pdf, layout.section, index > 0);

      if (layout.screen) {
        drawScreen(pdf, layout.screen, layout.image ?? null, page.image);
      } else {
        await drawFragment(pdf, svg2pdf, input, layout, page.image);
      }

      page.boxes.forEach(box => drawBox(pdf, box, pages));
    }
  }

  drawHeadersAndFooters(pdf, project, pages.total);

  pdf.outline.add(null, 'Оглавление', { pageNumber: 2 });
  plan.sections.forEach(section => {
    pdf.outline.add(null, sanitizePdfText(`${ section.number }. ${ section.title }`), { pageNumber: pages.start.get(section.key)! });
  });

  pdf.setProperties({
    title: sanitizePdfText(project.meta.name || 'Документация флоу'),
    subject: 'Документация флоу',
    author: sanitizePdfText(project.meta.author || ''),
    creator: 'BPM Document Maker'
  });

  return pdf.output('blob');
}

// измеритель ////////////////////

function setStyle(pdf: Pdf, style: LineStyle) {
  if (style === 'mono') {
    pdf.setFont(PDF_MONO_FONT, 'normal');
  } else {
    pdf.setFont(PDF_FONT, style === 'title' || style === 'label' ? 'bold' : 'normal');
  }

  pdf.setFontSize(FONT_SIZE[style]);
}

function createMeasurer(pdf: Pdf, covers: Measurer['covers']): Measurer {
  setStyle(pdf, 'mono');

  const monoAdvance = pdf.getTextWidth('0');

  return {
    covers,
    splitText(text, width, style) {
      if (!text) {
        return [ '' ];
      }

      setStyle(pdf, style);

      return pdf.splitTextToSize(text, width) as string[];
    },
    monoChars(width) {
      return Math.floor(width / monoAdvance);
    }
  };
}

// обложка и оглавление ////////////////////

/** Не больше max строк; у обрезанного — «…» на последней. */
function limitLines(pdf: Pdf, lines: string[], max: number, width: number): string[] {
  if (lines.length <= max) {
    return lines;
  }

  if (max <= 0) {
    return [];
  }

  const kept = lines.slice(0, max);

  kept[max - 1] = truncate(pdf, `${ kept[max - 1] }…`, width);

  return kept;
}

const COVER_BOTTOM = G.height - G.margin - 24;

function drawCover(pdf: Pdf, project: Project, cover: RasterImage | null) {
  const { meta } = project;
  const x = G.margin + 24;
  const textWidth = cover ? 400 : G.width - 2 * x;
  const LABEL_W = 70;
  const ROW_LINE = 14;
  let y = 150;

  pdf.setTextColor(COLOR.muted);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(11);
  pdf.text('Документация флоу', x, y - 40);

  // строки «Автор / Версия / Дата» считаются заранее — под них оставляется место внизу
  pdf.setFontSize(10);

  const rows = ([ [ 'Автор', meta.author ], [ 'Версия', meta.version ], [ 'Дата', meta.date ] ] as const)
    .filter(([ , value ]) => value)
    .map(([ label, value ]) => ({
      label,
      lines: limitLines(pdf, pdf.splitTextToSize(pdfText(String(value)), textWidth - LABEL_W) as string[], 3, textWidth - LABEL_W)
    }));
  const rowsHeight = rows.reduce((sum, row) => sum + row.lines.length * ROW_LINE + 2, 0);
  const bottom = COVER_BOTTOM - rowsHeight;

  pdf.setTextColor(COLOR.text);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(26);

  const title = limitLines(pdf, pdf.splitTextToSize(pdfText(meta.name || 'Без названия'), textWidth) as string[], 4, textWidth);

  pdf.text(title, x, y);
  y += title.length * 30 + 6;

  if (meta.code) {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(13);
    pdf.setTextColor(COLOR.muted);
    pdf.text(truncate(pdf, pdfText(meta.code), textWidth), x, y);
    y += 26;
  }

  if (meta.description) {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(COLOR.text);

    // сколько строк помещается над блоком «Автор / Версия / Дата»
    const fit = Math.floor((bottom - 16 - y) / 15) + 1;
    const lines = limitLines(pdf, pdf.splitTextToSize(pdfText(meta.description), textWidth) as string[], Math.min(18, fit), textWidth);

    if (lines.length) {
      pdf.text(lines, x, y);
      y += lines.length * 15 + 16;
    }
  }

  // строки внизу не уходят за страницу, даже если сверху тесно
  y = Math.min(Math.max(y, 0), bottom);

  pdf.setFontSize(10);
  rows.forEach(({ label, lines }) => {
    pdf.setTextColor(COLOR.muted);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.text(label, x, y);
    pdf.setTextColor(COLOR.text);
    pdf.text(lines, x + LABEL_W, y);
    y += lines.length * ROW_LINE + 2;
  });

  if (cover) {
    const box = fitRect({ x: 480, y: 70, width: G.width - 480 - G.margin - 10, height: G.height - 140 }, cover.width / cover.height);

    pdf.addImage(cover.data, 'JPEG', box.x, box.y, box.width, box.height);
  }
}

function drawToc(pdf: Pdf, sections: PlanSection[], pages: PageAssignment, linesPerPage: number) {
  const area = contentArea(G);
  const right = area.x + area.width;

  for (let p = 0; p < pages.tocPages; p++) {
    pdf.addPage();
    pdf.setTextColor(COLOR.text);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(16);
    pdf.text(p === 0 ? 'Оглавление' : 'Оглавление (продолжение)', area.x, area.y + 16);

    sections.slice(p * linesPerPage, (p + 1) * linesPerPage).forEach((section, i) => {
      const y = area.y + TOC_TOP + i * TOC_LINE + 10;
      const page = pages.start.get(section.key)!;
      const label = pdfText(`${ section.number }. ${ section.title }`);
      const kind = section.kind === 'screen' ? 'экран' : 'узел схемы';
      const suffix = section.unreachable ? `${ kind }, вне флоу` : kind;

      pdf.setFont(PDF_FONT, section.kind === 'screen' ? 'bold' : 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(COLOR.text);

      const text = truncate(pdf, label, area.width - 200);

      pdf.text(text, area.x, y);

      const after = area.x + pdf.getTextWidth(text) + 6;

      pdf.setFont(PDF_FONT, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(COLOR.muted);
      pdf.text(suffix, after, y);

      pdf.setFontSize(10);
      pdf.setTextColor(COLOR.text);
      pdf.text(String(page), right, y, { align: 'right' });

      // пунктир от названия к номеру страницы
      const from = after + pdf.getTextWidth(suffix) * 0.8 + 8;
      const to = right - pdf.getTextWidth(String(page)) - 6;

      if (to > from) {
        pdf.setDrawColor(COLOR.line);
        pdf.setLineWidth(0.5);
        pdf.setLineDashPattern([ 1, 2 ], 0);
        pdf.line(from, y, to, y);
        pdf.setLineDashPattern([], 0);
      }

      pdf.link(area.x, y - 10, area.width, TOC_LINE, { pageNumber: page });
    });
  }
}

// разделы ////////////////////

function drawSectionTitle(pdf: Pdf, section: PlanSection, continued: boolean) {
  const title = `${ section.number }. ${ section.title }${ section.unreachable ? ' — вне флоу' : '' }${ continued ? ' (продолжение)' : '' }`;

  pdf.setTextColor(COLOR.text);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(11);
  pdf.text(truncate(pdf, pdfText(title), G.width - 2 * G.margin - 220), G.margin, G.margin + 10);
}

function drawScreen(pdf: Pdf, screen: Screen, image: RasterImage | null, rect: Rect) {
  if (image) {
    pdf.addImage(image.data, 'JPEG', rect.x, rect.y, rect.width, rect.height);
  } else {
    pdf.setTextColor(COLOR.muted);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(9);
    pdf.text('Картинка экрана не найдена', rect.x + rect.width / 2, rect.y + rect.height / 2, { align: 'center' });
  }

  pdf.setDrawColor(COLOR.line);
  pdf.setLineWidth(0.6);
  pdf.rect(rect.x, rect.y, rect.width, rect.height);

  sortHotspots(screen.hotspots).forEach((hotspot, index) => {
    const color = hotspot.action?.type === 'gateway' ? COLOR.gateway : COLOR.hotspot;
    const x = rect.x + hotspot.rect.x * rect.width;
    const y = rect.y + hotspot.rect.y * rect.height;

    pdf.setDrawColor(color);
    pdf.setLineWidth(1);
    pdf.roundedRect(x, y, hotspot.rect.w * rect.width, hotspot.rect.h * rect.height, 2, 2);
    drawMarker(pdf, x, y, String(index + 1), color);
  });
}

async function drawFragment(pdf: Pdf, svg2pdf: any, input: FlowPdfInput, layout: SectionLayout, rect: Rect) {
  const node = layout.nodeId ? input.graph.nodes.get(layout.nodeId) : undefined;

  if (!layout.crop || !input.bpmnDoc || !node?.bounds) {
    const area = columnRects(G).center;

    pdf.setTextColor(COLOR.muted);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(9);
    pdf.text('Узел не отображается на схеме', area.x + area.width / 2, area.y + area.height / 2, { align: 'center' });

    return;
  }

  const crop = layout.crop;
  const fragment = pruneSvg(input.bpmnDoc, input.graph, crop);

  // svg2pdf нужен элемент в DOM, чтобы вычислить стили
  const host = document.createElement('div');

  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:0;height:0;overflow:hidden;';
  const svg = document.importNode(fragment.documentElement, true);

  // подписи схемы печатаются шрифтом PT Sans — та же замена символов вне шрифта
  svg.querySelectorAll('text, tspan').forEach(node => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
        child.nodeValue = pdfText(child.nodeValue);
      }
    });
  });

  host.appendChild(svg);
  document.body.appendChild(host);

  // обрезка по области фрагмента: части фигур на краю не вылезают на выноски
  pdf.saveGraphicsState();

  try {
    pdf.rect(rect.x, rect.y, rect.width, rect.height, null);
    pdf.clip();
    pdf.discardPath();
    await svg2pdf(host.firstElementChild, pdf, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  } finally {
    pdf.restoreGraphicsState();
    host.remove();
  }

  pdf.setDrawColor(COLOR.line);
  pdf.setLineWidth(0.6);
  pdf.rect(rect.x, rect.y, rect.width, rect.height);

  // подсветка узла страницы
  const scale = rect.width / crop.width;
  const b = node.bounds;

  pdf.setDrawColor(COLOR.highlight);
  pdf.setLineWidth(1.4);
  pdf.roundedRect(
    rect.x + (b.x - crop.x) * scale - 4,
    rect.y + (b.y - crop.y) * scale - 4,
    b.width * scale + 8,
    b.height * scale + 8,
    4,
    4
  );
}

function drawBox(pdf: Pdf, box: Box, pages: PageAssignment) {
  // линия-выноска к якорю
  if (box.anchor) {
    const fromX = box.side === 'left' ? box.x + box.width : box.x;
    const fromY = box.y + 9;

    pdf.setDrawColor(COLOR.leader);
    pdf.setLineWidth(0.5);
    pdf.line(fromX, fromY, box.anchor.x, box.anchor.y);
    pdf.setFillColor(COLOR.leader);
    pdf.circle(box.anchor.x, box.anchor.y, 1.6, 'F');
  }

  pdf.setFillColor(COLOR.box);
  pdf.setDrawColor(COLOR.line);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(box.x, box.y, box.width, box.height, 3, 3, 'FD');

  let y = box.y + BOX_PAD;

  box.lines.forEach(line => {
    const height = LINE_HEIGHT[line.style];
    const baseline = y + height * 0.78;
    const x = box.x + BOX_PAD;

    setStyle(pdf, line.style);
    pdf.setTextColor(line.style === 'muted' ? COLOR.muted : line.style === 'link' ? COLOR.link : COLOR.text);
    pdf.text(line.text, x, baseline);

    if (line.style === 'link') {
      const width = pdf.getTextWidth(line.text);
      const page = line.target ? pages.start.get(line.target) : undefined;

      if (page) {
        pdf.link(x, y, width, height, { pageNumber: page });

        if (line.last) {
          pdf.setTextColor(COLOR.muted);
          pdf.text(` (стр. ${ page })`, x + width, baseline);
        }
      } else if (line.url) {
        pdf.link(x, y, width, height, { url: line.url });
      }
    }

    y += height;
  });
}

function drawMarker(pdf: Pdf, x: number, y: number, label: string, color: string) {
  pdf.setFillColor(color);
  pdf.setDrawColor('#ffffff');
  pdf.setLineWidth(0.8);
  pdf.circle(x, y, 6, 'FD');
  pdf.setTextColor('#ffffff');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(7);
  pdf.text(label, x, y + 2.4, { align: 'center' });
}

function drawHeadersAndFooters(pdf: Pdf, project: Project, total: number) {
  const name = pdfText(project.meta.name || '');

  for (let page = 2; page <= total; page++) {
    pdf.setPage(page);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(COLOR.muted);
    pdf.text(truncate(pdf, name, 200), G.width - G.margin, G.margin + 10, { align: 'right' });
    pdf.text(`стр. ${ page } из ${ total }`, G.width / 2, G.height - G.margin - 2, { align: 'center' });

    pdf.setDrawColor(COLOR.line);
    pdf.setLineWidth(0.5);
    pdf.line(G.margin, G.margin + G.header - 5, G.width - G.margin, G.margin + G.header - 5);
  }
}

// картинки ////////////////////

// утилиты ////////////////////

function truncate(pdf: Pdf, text: string, width: number): string {
  if (pdf.getTextWidth(text) <= width) {
    return text;
  }

  let result = text;

  while (result.length > 1 && pdf.getTextWidth(`${ result }…`) > width) {
    result = result.slice(0, -1);
  }

  return `${ result }…`;
}

function fallbackDoc(name: string, type: string): NodeDoc {
  return {
    title: /Gateway$/.test(type) ? 'Развилка' : type.replace('bpmn:', ''),
    name,
    summary: '',
    documentation: '',
    fields: [],
    parameters: [],
    json: [],
    columns: [],
    links: []
  };
}
