import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { emptyMeta, extForMime, newId } from '../model/project';
import type { Asset, ProjectMeta } from '../model/types';
import { readImageFile, isImageFile } from '../io/images';
import { invalidateDraftAsset } from '../io/draft';
import { assets } from '../store/assets';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { createNewProject } from './actions';

type CoverState =
  | { kind: 'keep' }
  | { kind: 'none' }
  | { kind: 'new'; asset: Asset; blob: Blob; url: string };

/**
 * Диалог настроек процесса. В режиме «new» создаёт проект,
 * в режиме «settings» правит meta текущего проекта.
 * Эти данные идут на обложку PDF.
 */
export default function ProjectMetaDialog({ mode }: { mode: 'new' | 'settings' }) {
  const project = useProjectStore(s => s.project);
  const close = () => useUiStore.getState().openDialog(null);

  const initial = useMemo<ProjectMeta>(
    () => (mode === 'settings' && project ? project.meta : emptyMeta()),
    // данные берутся один раз при открытии диалога
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ mode ]
  );

  const [ meta, setMeta ] = useState<ProjectMeta>(initial);
  const [ cover, setCover ] = useState<CoverState>(mode === 'settings' && initial.coverAsset ? { kind: 'keep' } : { kind: 'none' });
  const [ error, setError ] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // освободить object URL выбранной, но не сохранённой обложки
  useEffect(() => () => {
    if (cover.kind === 'new') {
      URL.revokeObjectURL(cover.url);
    }
  }, [ cover ]);

  const field = (key: keyof ProjectMeta) => ({
    value: (meta[key] as string) ?? '',
    onChange: (event: { target: { value: string } }) => setMeta(m => ({ ...m, [key]: event.target.value }))
  });

  async function pickCover(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setError('Обложка должна быть картинкой (PNG, JPG, SVG, WebP)');
      return;
    }

    const info = await readImageFile(file);

    setError(null);
    setCover({
      kind: 'new',
      blob: info.blob,
      url: URL.createObjectURL(info.blob),
      asset: { path: `${ newId('cover') }.${ extForMime(info.mime) }`, mime: info.mime, width: info.width, height: info.height }
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!meta.name.trim()) {
      setError('Укажите название процесса');
      nameRef.current?.focus();
      return;
    }

    const cleaned: ProjectMeta = { ...meta, name: meta.name.trim(), code: meta.code.trim() };

    if (mode === 'new') {
      const coverAsset = cover.kind === 'new' ? cover.asset : null;

      await createNewProject(
        { ...cleaned, coverAsset },
        cover.kind === 'new' ? { path: cover.asset.path, blob: cover.blob } : null
      );
    } else {
      const previous = project?.meta.coverAsset;
      let coverAsset = previous ?? null;

      if (cover.kind === 'none') {
        coverAsset = null;
      }

      // путь новой обложки уникален, а прежний Blob остаётся до «Новый» / «Открыть»:
      // Ctrl+Z вернёт ссылку на прежнюю обложку, и картинка должна быть на месте
      if (cover.kind === 'new') {
        assets.set(cover.asset.path, cover.blob);
        invalidateDraftAsset(cover.asset.path);
        coverAsset = cover.asset;
      }

      useProjectStore.getState().updateMeta({ ...cleaned, coverAsset });
      useUiStore.getState().showStatus('Настройки проекта сохранены', 'success');
    }

    close();
  }

  const coverUrl = cover.kind === 'new'
    ? cover.url
    : cover.kind === 'keep' ? assets.getUrl(project?.meta.coverAsset?.path) : undefined;

  return (
    <div className="dialog-backdrop" onMouseDown={ event => event.target === event.currentTarget && close() }>
      <form className="dialog" onSubmit={ submit } role="dialog" aria-modal="true" aria-labelledby="meta-dialog-title">
        <h2 id="meta-dialog-title">{ mode === 'new' ? 'Новый проект' : 'Настройки проекта' }</h2>
        <p className="dialog-hint">Эти данные попадут на обложку PDF-документа.</p>

        <div className="form-grid">
          <label className="form-field form-field--wide">
            <span>Название процесса *</span>
            <input ref={ nameRef } { ...field('name') } placeholder="Например, Оплата по QR" />
          </label>

          <label className="form-field">
            <span>Код процесса</span>
            <input { ...field('code') } placeholder="Например, QR_PAYMENT" />
          </label>

          <label className="form-field">
            <span>Версия документа</span>
            <input { ...field('version') } placeholder="1.0" />
          </label>

          <label className="form-field">
            <span>Автор</span>
            <input { ...field('author') } placeholder="ФИО аналитика" />
          </label>

          <label className="form-field">
            <span>Дата</span>
            <input type="date" { ...field('date') } />
          </label>

          <label className="form-field form-field--wide">
            <span>Описание</span>
            <textarea rows={ 4 } { ...field('description') } placeholder="Цель процесса, участники, границы" />
          </label>

          <div className="form-field form-field--wide">
            <span>Картинка для обложки</span>
            <div className="cover-picker">
              { coverUrl
                ? <img src={ coverUrl } alt="Обложка" />
                : <div className="cover-empty">нет</div> }
              <div className="cover-actions">
                <label className="button">
                  Выбрать…
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={ event => pickCover(event.target.files?.[0]) }
                  />
                </label>
                { coverUrl && (
                  <button type="button" className="button" onClick={ () => setCover({ kind: 'none' }) }>Убрать</button>
                ) }
              </div>
            </div>
          </div>
        </div>

        { error && <div className="form-error" role="alert">{ error }</div> }

        <div className="dialog-actions">
          <button type="button" className="button" onClick={ close }>Отмена</button>
          <button type="submit" className="button button--primary">{ mode === 'new' ? 'Создать' : 'Сохранить' }</button>
        </div>
      </form>
    </div>
  );
}
