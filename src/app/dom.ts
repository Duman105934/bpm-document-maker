/** Фокус в поле ввода — горячие клавиши приложения не перехватывают нажатие. */
export function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;

  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName ?? ''));
}
