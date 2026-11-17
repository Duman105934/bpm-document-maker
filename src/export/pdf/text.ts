/**
 * Подготовка текста для PDF: перенос моноширинных строк, JSON по строкам,
 * замена символов, которых нет во встроенных шрифтах.
 */

import { formatJson } from '../../modeler/sm/util.js';

/** Есть ли у шрифта глиф для символа (одна кодовая единица BMP). */
export type GlyphCheck = (ch: string) => boolean;

/**
 * Замены для символов, которых нет во встроенных шрифтах (по разбору cmap: в PT Mono нет ⇒ ✓ ✔ ✕,
 * во всех трёх нет ₸ ✅ ⚠ ★ и узких пробелов, в PT Sans нет ещё ↑ ↓ ↔ и псевдографики).
 * Без замены jsPDF молча выбрасывает символ: «1000 ₸» печатается как «1000 ».
 */
const REPLACEMENTS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '↑': '^',
  '↓': 'v',
  '↔': '<->',
  '⇒': '=>',
  '⇐': '<=',
  '⇔': '<=>',
  '✓': 'v',
  '✔': 'v',
  '✅': 'v',
  '✕': 'x',
  '✖': 'x',
  '✗': 'x',
  '❌': 'x',
  '⚠': '!',
  '★': '*',
  '☆': '*',
  '•': '-',
  '₸': 'тг',
  '₽': 'руб.',
  '€': 'EUR',
  '…': '...',
  '—': '-',
  '–': '-',
  '«': '"',
  '»': '"',
  '“': '"',
  '”': '"',
  '„': '"',
  '‘': "'",
  '’': "'",
  '\u00A0': ' ',
  '\u2007': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u202F': ' '
};

/** Псевдографика рамок: ─ │ ┌ … — в ASCII. */
function boxDrawing(ch: string): string | null {
  const code = ch.charCodeAt(0);

  if (code < 0x2500 || code > 0x257F) {
    return null;
  }

  if ([ 0x2500, 0x2501, 0x2504, 0x2505, 0x2508, 0x2509, 0x254C, 0x254D, 0x2550 ].includes(code)) {
    return '-';
  }

  if ([ 0x2502, 0x2503, 0x2506, 0x2507, 0x250A, 0x250B, 0x254E, 0x254F, 0x2551 ].includes(code)) {
    return '|';
  }

  return '+';
}

/**
 * Убрать управляющие символы и символы вне BMP (эмодзи → «?»), табы — в пробелы.
 * covers — есть ли глиф в шрифте, которым строка будет напечатана: символы без глифа
 * заменяются по таблице, иначе на «?». Без covers (тесты, измерения до регистрации шрифтов)
 * заменяются только символы из таблицы, которых заведомо нет в PT Sans.
 */
export function sanitizePdfText(value: string, { mono = false, covers }: { mono?: boolean; covers?: GlyphCheck } = {}): string {
  const text = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '?')
    .replace(/[\uD800-\uDFFF]/g, '');

  if (!covers) {
    // без проверки шрифта: моноширинный PT Mono содержит стрелки, PT Sans — нет
    return mono ? text : text.replace(/[→←⇒✓✔✕\u00A0]/g, ch => REPLACEMENTS[ch] ?? ch);
  }

  return text.replace(/[^\n\u0020-\u007E]/g, ch => {
    if (covers(ch)) {
      return ch;
    }

    const replacement = REPLACEMENTS[ch] ?? boxDrawing(ch);

    // замена тоже должна печататься этим шрифтом («тг» — кириллица есть в обоих)
    if (replacement !== null && [ ...replacement ].every(c => c.charCodeAt(0) < 0x7F || covers(c))) {
      return replacement;
    }

    return '?';
  });
}

/**
 * Перенос одной моноширинной строки по maxChars.
 * Продолжения получают отступ исходной строки (+2), чтобы JSON читался.
 */
export function wrapMono(line: string, maxChars: number): string[] {
  const limit = Math.max(8, Math.floor(maxChars));

  if (line.length <= limit) {
    return [ line ];
  }

  // глубокая вложенность: отступ не шире половины колонки, иначе первый кусок — одни пробелы
  const lead = line.match(/^ */)?.[0].length ?? 0;
  const maxLead = Math.floor(limit / 2);

  if (lead > maxLead) {
    line = line.slice(lead - maxLead);
  }

  const indent = Math.min(Math.min(lead, maxLead) + 2, maxLead);
  const pad = ' '.repeat(indent);
  const result: string[] = [];
  let rest = line;
  let first = true;

  while (rest.length) {
    const width = first ? limit : limit - indent;
    let chunk = rest.slice(0, width);

    if (rest.length > width) {
      // по возможности рвём после пробела или запятой
      const cut = Math.max(chunk.lastIndexOf(' '), chunk.lastIndexOf(','));

      if (cut > width / 2) {
        chunk = rest.slice(0, cut + 1);
      }
    }

    result.push(first ? chunk.trimEnd() : pad + chunk.trimEnd());
    rest = rest.slice(chunk.length).replace(/^ +/, '');
    first = false;
  }

  return result;
}

/** Отформатированный JSON по строкам с переносом. Пустой текст — пустой массив. */
export function jsonLines(text: string, maxChars: number, covers?: GlyphCheck): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  return sanitizePdfText(formatJson(text), { mono: true, covers })
    .split('\n')
    .flatMap(line => wrapMono(line, maxChars));
}

/** Моноширинный текст (не JSON) по строкам с переносом. */
export function monoLines(text: string, maxChars: number, covers?: GlyphCheck): string[] {
  return sanitizePdfText(text, { mono: true, covers })
    .split('\n')
    .flatMap(line => wrapMono(line, maxChars));
}
