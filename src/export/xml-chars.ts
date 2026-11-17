/**
 * Символы, запрещённые в XML 1.0 (U+000B из Word, U+000C, U+0001, U+FFFE, одиночные суррогаты),
 * делают SVG неразбираемым: браузер показывает ошибку, Figma не импортирует.
 * Регулярка строкой: проверка регулярных литералов в tsc спотыкается о диапазон \u{…}.
 */
const INVALID_XML_CHARS = new RegExp(
  '[^\\u0009\\u000A\\u000D\\u0020-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]',
  'gu'
);

export function stripInvalidXmlChars(value: string): string {
  return value.replace(INVALID_XML_CHARS, '');
}
