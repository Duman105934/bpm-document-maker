/**
 * Картинки проекта (экраны, обложка). Лежат вне zustand: Blob не нужен
 * в истории undo и в JSON. Путь в карте = путь внутри .fmg.
 */

class AssetStore {

  private blobs = new Map<string, Blob>();
  private urls = new Map<string, string>();

  get(path: string): Blob | undefined {
    return this.blobs.get(path);
  }

  has(path: string): boolean {
    return this.blobs.has(path);
  }

  set(path: string, blob: Blob) {
    this.revoke(path);
    this.blobs.set(path, blob);
  }

  delete(path: string) {
    this.revoke(path);
    this.blobs.delete(path);
  }

  /** object URL для <img>; кэшируется до замены или удаления картинки */
  getUrl(path: string | undefined | null): string | undefined {
    if (!path) {
      return undefined;
    }

    const cached = this.urls.get(path);

    if (cached) {
      return cached;
    }

    const blob = this.blobs.get(path);

    if (!blob) {
      return undefined;
    }

    const url = URL.createObjectURL(blob);

    this.urls.set(path, url);

    return url;
  }

  replaceAll(entries: Map<string, Blob>) {
    this.clear();
    entries.forEach((blob, path) => this.blobs.set(path, blob));
  }

  clear() {
    [ ...this.urls.keys() ].forEach(path => this.revoke(path));
    this.blobs.clear();
  }

  entries(): Map<string, Blob> {
    return new Map(this.blobs);
  }

  private revoke(path: string) {
    const url = this.urls.get(path);

    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(path);
    }
  }
}

export const assets = new AssetStore();
