import { describe, it, expect } from 'vitest';

import { jsonLines, monoLines, sanitizePdfText, wrapMono } from '../src/export/pdf/text';

describe('pdf/text', () => {

  it('wrapMono: короткая строка не меняется', () => {
    expect(wrapMono('  "a": 1', 40)).toEqual([ '  "a": 1' ]);
  });

  it('wrapMono: длинная строка переносится с отступом и не теряет символы', () => {
    const line = '    "description": "' + 'слово '.repeat(20).trim() + '"';
    const lines = wrapMono(line, 30);

    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(l => expect(l.length).toBeLessThanOrEqual(30));
    lines.slice(1).forEach(l => expect(l.startsWith('      ')).toBe(true));
    expect(lines.map(l => l.trim()).join(' ').replace(/\s+/g, ' ')).toBe(line.trim().replace(/\s+/g, ' '));
  });

  it('wrapMono: строка без пробелов режется жёстко', () => {
    const lines = wrapMono('x'.repeat(50), 20);

    expect(lines[0]).toHaveLength(20);
    expect(lines.join('').replace(/ /g, '')).toBe('x'.repeat(50));
  });

  it('jsonLines форматирует JSON и сохраняет казахские буквы', () => {
    expect(jsonLines('{"аты":"Әлия Ғалымқызы","ұпай":1}', 80)).toEqual([
      '{',
      '  "аты": "Әлия Ғалымқызы",',
      '  "ұпай": 1',
      '}'
    ]);
  });

  it('jsonLines: пустой текст — пусто, некорректный JSON — как есть', () => {
    expect(jsonLines('   ', 80)).toEqual([]);
    expect(jsonLines('{oops', 80)).toEqual([ '{oops' ]);
  });

  it('sanitizePdfText заменяет стрелки для PT Sans, но не для PT Mono', () => {
    expect(sanitizePdfText('a → b\tc')).toBe('a -> b  c');
    expect(sanitizePdfText('a → b', { mono: true })).toBe('a → b');
  });

  it('sanitizePdfText убирает управляющие символы и эмодзи', () => {
    expect(sanitizePdfText('ок\u0007 😀 һі')).toBe('ок ? һі');
  });

  it('monoLines делит по строкам', () => {
    expect(monoLines('a\nb', 10)).toEqual([ 'a', 'b' ]);
  });
});

describe('pdf/text — символы вне шрифта (B4)', () => {

  // «шрифт»: ASCII и кириллица, без ₸ ✓ стрелок и узких пробелов
  const covers = (ch: string) => /[ -~Ѐ-ӿ]/.test(ch);

  it('заменяет по таблице, а неизвестное — на «?»', () => {
    expect(sanitizePdfText('1000 ₸', { covers })).toBe('1000 тг');
    expect(sanitizePdfText('"status": "✓ ok"', { covers })).toBe('"status": "v ok"');
    expect(sanitizePdfText('A → B ↔ C', { covers })).toBe('A -> B <-> C');
    expect(sanitizePdfText('1 000 ₸', { covers })).toBe('1 000 тг');
    expect(sanitizePdfText('┌─┐', { covers })).toBe('+-+');
    expect(sanitizePdfText('Ж ♫', { covers })).toBe('Ж ?');
  });

  it('символ, который есть в шрифте, не трогает', () => {
    expect(sanitizePdfText('→ ₸', { covers: () => true })).toBe('→ ₸');
  });

  it('моноширинный режим тоже заменяет по проверке', () => {
    expect(monoLines('✓ ⇒ ₸', 40, covers)).toEqual([ 'v => тг' ]);
    expect(jsonLines('{"s":"✓"}', 40, covers)).toEqual([ '{', '  "s": "v"', '}' ]);
  });
});

describe('pdf/text — wrapMono на глубокой вложенности (B12)', () => {

  it('отступ не шире половины колонки, пустых строк нет', () => {
    const line = ' '.repeat(60) + '"key": "' + 'v'.repeat(40) + '"';
    const lines = wrapMono(line, 51);

    lines.forEach(l => {
      expect(l.trim().length).toBeGreaterThan(0);
      expect(l.length).toBeLessThanOrEqual(51);
    });
    expect(lines.join('').replace(/ /g, '')).toBe(line.replace(/ /g, ''));
  });
});
