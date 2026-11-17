/**
 * Открытие и сохранение файлов в браузере.
 *
 * Если доступен File System Access API (Chrome, Edge), файл сохраняется на место,
 * иначе (Safari, Firefox) — через <input type=file> и скачивание.
 */

export interface FileType {
  description: string;
  accept: Record<string, string[]>;
}

export const FMG_TYPES: FileType[] = [ {
  description: 'Проект BPM Document Maker',
  accept: { 'application/octet-stream': [ '.fmg' ] }
} ];

export const BPMN_TYPES: FileType[] = [ {
  description: 'BPMN-диаграмма',
  accept: { 'application/xml': [ '.bpmn', '.xml' ] }
} ];

export const IMAGE_TYPES: FileType[] = [ {
  description: 'Картинки экранов',
  accept: { 'image/*': [ '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif' ] }
} ];

export type FileHandle = any;

export interface OpenedFile {
  name: string;
  file: File;
  handle?: FileHandle;
}

const w = (typeof window !== 'undefined' ? window : {}) as any;

export const supportsFileSystemAccess = 'showOpenFilePicker' in w && 'showSaveFilePicker' in w;

/** @returns null, если пользователь отменил выбор */
export async function openFiles(types: FileType[], { multiple = false } = {}): Promise<OpenedFile[] | null> {
  if (supportsFileSystemAccess) {
    try {
      const handles: FileHandle[] = await w.showOpenFilePicker({ types, multiple });

      return Promise.all(handles.map(async handle => {
        const file: File = await handle.getFile();

        return { name: file.name, file, handle };
      }));
    } catch (error) {
      if (isAbort(error)) {
        return null;
      }

      throw error;
    }
  }

  return openWithInput(types, multiple);
}

export async function openFile(types: FileType[]): Promise<OpenedFile | null> {
  const files = await openFiles(types);

  return files && files.length ? files[0] : null;
}

function openWithInput(types: FileType[], multiple: boolean): Promise<OpenedFile[] | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');

    input.type = 'file';
    input.multiple = multiple;
    input.accept = acceptString(types);

    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);

      resolve(files.length ? files.map(file => ({ name: file.name, file })) : null);
    });

    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

function acceptString(types: FileType[]): string {
  return types.flatMap(t => Object.values(t.accept).flat()).join(',');
}

/**
 * Сохранить Blob. С handle — перезаписать тот же файл.
 *
 * @returns null, если пользователь отменил диалог
 */
export async function saveFile(
    blob: Blob,
    { types, handle, suggestedName, saveAs = false }: {
      types: FileType[];
      handle?: FileHandle | null;
      suggestedName: string;
      saveAs?: boolean;
    }
): Promise<{ name: string; handle?: FileHandle } | null> {
  if (supportsFileSystemAccess) {
    try {
      if (!handle || saveAs) {
        handle = await w.showSaveFilePicker({ suggestedName, types });
      }

      const writable = await handle.createWritable();

      await writable.write(blob);
      await writable.close();

      return { name: handle.name, handle };
    } catch (error) {
      if (isAbort(error)) {
        return null;
      }

      throw error;
    }
  }

  downloadBlob(blob, suggestedName);

  return { name: suggestedName };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Имя файла без расширения — для экспорта. */
export function baseName(fileName: string | null | undefined): string {
  return (fileName || 'project').replace(/\.[a-z0-9]+$/i, '') || 'project';
}

/** Безопасное имя файла из названия проекта. */
export function safeFileName(name: string, fallback = 'project'): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ');

  return cleaned || fallback;
}

export function isAbort(error: unknown): boolean {
  return !!error && (error as any).name === 'AbortError';
}
