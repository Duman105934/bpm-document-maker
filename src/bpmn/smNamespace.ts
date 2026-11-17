/**
 * URI расширения sm в заголовке схемы.
 *
 * Схемы, сохранённые с прежним URI, должны открываться как текущие: иначе moddle
 * не узнаёт атрибуты sm:* и виды элементов пропадают. Перед импортом URI
 * в объявлении xmlns:sm заменяется на актуальный из sm.json.
 */

import smDescriptor from '../modeler/sm/moddle/sm.json';

const SM_XMLNS = /(\bxmlns:sm\s*=\s*)(["'])[^"']*\2/;

export function normalizeSmNamespace(xml: string): string {
  return xml.replace(SM_XMLNS, (_match, attr: string, quote: string) => `${ attr }${ quote }${ smDescriptor.uri }${ quote }`);
}
