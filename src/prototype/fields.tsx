/** Поля правой панели прототипа: запись в проект при потере фокуса или Enter. */

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="form-field inspector-field">
      <span>{ label }</span>
      { children }
      { hint && <span className="inspector-field-hint">{ hint }</span> }
    </label>
  );
}

/**
 * Поле, которое пишет в проект при потере фокуса или Enter —
 * одна запись в истории undo на правку, а не на каждую букву.
 */
export function CommitInput({ value, onCommit, multiline, rows = 3, monospace, type = 'text', placeholder, children }: {
  value: string;
  onCommit(value: string): void;
  multiline?: boolean;
  rows?: number;
  monospace?: boolean;
  type?: 'text' | 'number';
  placeholder?: string;
  /** доп. действия под полем; видят текущий ввод, даже не записанный в проект */
  children?: (draft: string, commit: (value: string) => void) => ReactNode;
}) {
  const [ draft, setDraft ] = useState(value);
  const latest = useRef({ draft, value, onCommit });

  latest.current = { draft, value, onCommit };

  // внешнее изменение (undo) — показать новое значение
  useEffect(() => setDraft(value), [ value ]);

  // переключение выделения без blur (например, клик по canvas) — не потерять ввод
  useEffect(() => () => {
    const { draft, value, onCommit } = latest.current;

    if (draft !== value) {
      onCommit(draft);
    }
  }, []);

  const commit = () => {
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const common = {
    value: draft,
    placeholder,
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onBlur: commit
  };

  const commitValue = (next: string) => {
    setDraft(next);

    if (next !== value) {
      onCommit(next);
    }
  };

  const extra = children?.(draft, commitValue);

  if (multiline) {
    return (
      <>
        <textarea rows={ rows } className={ monospace ? 'monospace' : undefined } spellCheck={ !monospace } { ...common } />
        { extra }
      </>
    );
  }

  return (
    <>
    <input
      type={ type }
      { ...common }
      onKeyDown={ event => {
        if (event.key === 'Enter') {
          commit();
        } else if (event.key === 'Escape') {
          setDraft(value);
        }
      } }
    />
    { extra }
    </>
  );
}
