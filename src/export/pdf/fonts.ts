/**
 * Встроенные шрифты PDF: PT Sans (обычный, жирный) и PT Mono — все OFL.
 * jsPDF принимает только TTF; файлы подключаются через Vite ?url
 * и загружаются один раз за сессию.
 */

import fontRegularUrl from '../../assets/fonts/PTSans-Regular.ttf?url';
import fontBoldUrl from '../../assets/fonts/PTSans-Bold.ttf?url';
import fontMonoUrl from '../../assets/fonts/PTMono-Regular.ttf?url';

export const PDF_FONT = 'PTSans';
export const PDF_MONO_FONT = 'PTMono';

type Pdf = {
  addFileToVFS(name: string, data: string): unknown;
  addFont(file: string, family: string, style: string): unknown;
  setFont(family: string, style?: string): unknown;
  getFont?(family?: string, style?: string): { metadata?: { characterToGlyph?(code: number): number } } | undefined;
};

let fontCache: Promise<string[]> | null = null;

/** Зарегистрировать шрифты в документе; mono = false — без PT Mono. */
export async function registerFonts(pdf: Pdf, { mono = true }: { mono?: boolean } = {}) {
  if (!fontCache) {
    fontCache = Promise.all([ loadBase64(fontRegularUrl), loadBase64(fontBoldUrl), loadBase64(fontMonoUrl) ]);

    // неудачная загрузка не должна запоминаться навсегда
    fontCache.catch(() => {
      fontCache = null;
    });
  }

  const [ regular, bold, monoFont ] = await fontCache;

  pdf.addFileToVFS('PTSans-Regular.ttf', regular);
  pdf.addFont('PTSans-Regular.ttf', PDF_FONT, 'normal');

  pdf.addFileToVFS('PTSans-Bold.ttf', bold);
  pdf.addFont('PTSans-Bold.ttf', PDF_FONT, 'bold');

  if (mono) {
    pdf.addFileToVFS('PTMono-Regular.ttf', monoFont);
    pdf.addFont('PTMono-Regular.ttf', PDF_MONO_FONT, 'normal');
  }

  pdf.setFont(PDF_FONT, 'normal');
}

/**
 * Проверка «есть ли глиф» по таблице cmap зарегистрированного шрифта.
 * also — второй шрифт (например, жирный), в котором глиф тоже должен быть.
 * Шрифт не найден — считаем, что глиф есть (поведение как без проверки).
 */
export function glyphCheck(pdf: Pdf, family: string, style: string, also?: (ch: string) => boolean): (ch: string) => boolean {
  let metadata: { characterToGlyph?(code: number): number } | undefined;

  try {
    metadata = pdf.getFont?.(family, style)?.metadata;
  } catch (error) {
    metadata = undefined;
  }

  const toGlyph = metadata?.characterToGlyph?.bind(metadata);

  if (!toGlyph) {
    return also ?? (() => true);
  }

  return ch => toGlyph(ch.charCodeAt(0)) > 0 && (!also || also(ch));
}

export async function loadBase64(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить шрифт для PDF (${ response.status })`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }

  return btoa(binary);
}
