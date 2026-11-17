import type { ReactNode } from 'react';

/**
 * Иконки интерфейса: контурные, 24×24, толщина линии одна на все.
 * Цвет — currentColor, размер задаётся свойством size.
 */

const ICONS = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  'file-new': <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 12v6M9 15h6" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  save: <path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 3v5h7V3M7 21v-7h10v7" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  pause: <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />,
  forward: <path d="M4 5.5l8 6.5-8 6.5zM13 5.5l8 6.5-8 6.5z" fill="currentColor" />,
  export: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18h2" /></>,
  schema: (
    <>
      <rect x="2.5" y="9" width="6" height="6" rx="1.2" />
      <rect x="15.5" y="3" width="6" height="6" rx="1.2" />
      <rect x="15.5" y="15" width="6" height="6" rx="1.2" />
      <path d="M8.5 12H12M12 6v12M12 6h3.5M12 18h3.5" />
    </>
  ),
  alert: <path d="M12 3.5l9 16h-18zM12 10v4.5M12 17.2v.1" />,
  settings: (
    <>
      <path d="M4 6h9M19 6h1M4 12h1M11 12h9M4 18h7M17 18h3" />
      <circle cx="16" cy="6" r="2.2" />
      <circle cx="8" cy="12" r="2.2" />
      <circle cx="14" cy="18" r="2.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  zone: <rect x="3.5" y="6" width="17" height="12" rx="2" strokeDasharray="3.2 3" />,
  fit: <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  restart: <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4.6h4.6" />,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5-9 9" /></>,
  target: <><circle cx="12" cy="12" r="7" /><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  flag: <path d="M5 21V4M5 4.5h12l-2.5 4 2.5 4H5" />,
  gateway: <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.1" /></>
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={ size }
      height={ size }
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      { ICONS[name] }
    </svg>
  );
}

/** Знак приложения: экран телефона, связанный с узлом схемы. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={ size } height={ size } viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="7" fill="var(--accent)" />
      <rect x="6" y="5.5" width="8.5" height="15" rx="2" fill="none" stroke="#fff" strokeWidth="1.7" />
      <rect x="17" y="13" width="6" height="6" rx="1.4" fill="#fff" />
      <path d="M14.5 16H17" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
