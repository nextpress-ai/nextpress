import type { IconSetId } from '@shared/icon-types';

/** Layout length units exposed in block settings (numeric field + unit select). */
export const NPB_NUMERIC_LENGTH_UNITS = [
  'px',
  'rem',
  'em',
  '%',
  'vh',
  'vw',
  'dvh',
  'ch',
] as const;

export type NpbNumericLengthUnit = (typeof NPB_NUMERIC_LENGTH_UNITS)[number];

export function isNumericLengthUnit(value: unknown): value is NpbNumericLengthUnit {
  return (
    typeof value === 'string' &&
    (NPB_NUMERIC_LENGTH_UNITS as readonly string[]).includes(value)
  );
}

/**
 * Unified icon reference stored in block content.
 * Used by Icon block and Button icon extension.
 */
export interface IconReference {
  /** Icon set identifier */
  iconSet: IconSetId;

  /**
   * Icon name within the set:
   * - lucide: kebab-case → "arrow-right", "search"
   * - react-icons: prefixed → "lu:LuSearch", "tb:TbArrowLeft", "fa6:FaHouse"
   * - svgl: slug → "github", "react", "vercel"
   */
  iconName: string;

  /**
   * Icon box magnitude; with `sizeUnit` (default px) forms the rendered width/height.
   * WHY: Legacy saves used pixels only; `sizeUnit` extends the same number to rem/em/etc.
   */
  size?: number;
  /** CSS unit for `size`; omitted means `px` (numeric size is pixel box). */
  sizeUnit?: NpbNumericLengthUnit;
  color?: string;         // CSS color, default "currentColor"
  strokeWidth?: number;   // lucide stroke magnitude, default 2
  /** Unit for stroke width (`px` when omitted — matches historical number-only stroke). */
  strokeWidthUnit?: NpbNumericLengthUnit;
}

/** Metadata for an icon set shown in the picker */
export interface IconSetMeta {
  id: string;
  label: string;
  prefix: string;         // react-icons prefix or 'lucide' / 'svgl'
  iconCount: number;
}

/** All supported icon sets */
export const ICON_SETS: IconSetMeta[] = [
  { id: 'lucide', label: 'Lucide', prefix: 'lucide', iconCount: 1736 },
  { id: 'react-icons', label: 'Lucide (react-icons)', prefix: 'lu', iconCount: 1541 },
  { id: 'react-icons', label: 'Tabler', prefix: 'tb', iconCount: 5754 },
  { id: 'react-icons', label: 'Font Awesome 6', prefix: 'fa6', iconCount: 2048 },
  { id: 'react-icons', label: 'Heroicons', prefix: 'hi2', iconCount: 972 },
  { id: 'react-icons', label: 'Remix Icon', prefix: 'ri', iconCount: 3020 },
  { id: 'react-icons', label: 'Phosphor', prefix: 'pi', iconCount: 9072 },
  { id: 'react-icons', label: 'Bootstrap', prefix: 'bs', iconCount: 2716 },
  { id: 'react-icons', label: 'Ionicons', prefix: 'io5', iconCount: 1332 },
  { id: 'react-icons', label: 'Radix', prefix: 'rx', iconCount: 318 },
  { id: 'svgl', label: 'Brands (SVGL)', prefix: 'svgl', iconCount: 100 },
];

/** Get the storage key for an icon set entry */
export function getIconSetStorageKey(set: IconSetMeta): string {
  if (set.id === 'react-icons') return `react-icons:${set.prefix}`;
  return set.id;
}

/**
 * Single-line label for narrow rows (settings, canvas toolbar). Pair with
 * `truncateWithEllipsis` (`NPB_ICON_REFERENCE_ROW_MAX_CHARS`) and a tooltip/`title` for the full string.
 */
export function formatIconReferenceLabel(icon: IconReference): string {
  return `${icon.iconSet} / ${icon.iconName}`;
}

function isIconSetId(value: unknown): value is IconReference['iconSet'] {
  return value === 'lucide' || value === 'react-icons' || value === 'svgl';
}

/**
 * Reads `icon` from structured block content or legacy flat `{ icon }` (Icon / Button blocks).
 * WHY: one parser for toolbar + settings so persisted shape stays aligned.
 */
export function extractIconReferenceFromBlockContent(content: unknown): IconReference | null {
  if (!content || typeof content !== 'object') return null;
  const r = content as Record<string, unknown>;
  let raw: unknown;
  if (r.kind === 'structured' && r.data && typeof r.data === 'object') {
    raw = (r.data as Record<string, unknown>).icon;
  } else {
    raw = r.icon;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const iconSet = isIconSetId(o.iconSet) ? o.iconSet : 'lucide';
  const iconName = typeof o.iconName === 'string' ? o.iconName : null;
  if (!iconName) return null;
  return {
    iconSet,
    iconName,
    size: typeof o.size === 'number' ? o.size : 24,
    sizeUnit: isNumericLengthUnit(o.sizeUnit) ? o.sizeUnit : undefined,
    color: typeof o.color === 'string' ? o.color : 'currentColor',
    strokeWidth: typeof o.strokeWidth === 'number' ? o.strokeWidth : 2,
    strokeWidthUnit: isNumericLengthUnit(o.strokeWidthUnit)
      ? o.strokeWidthUnit
      : undefined,
  };
}
