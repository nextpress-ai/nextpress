import React from 'react';
import { cn } from '@/lib/utils';
import type { IconReference } from '@/lib/icon-indexes';

// ---------------------------------------------------------------------------
// Lucide icons — import full module, resolve by kebab-case name
// ---------------------------------------------------------------------------
import * as LucideIcons from 'lucide-react';

// ---------------------------------------------------------------------------
// react-icons sets — import per prefix, resolve by PascalCase name
// ---------------------------------------------------------------------------
import * as RiLu from 'react-icons/lu';
import * as RiTb from 'react-icons/tb';
import * as RiFa6 from 'react-icons/fa6';
import * as RiHi2 from 'react-icons/hi2';
import * as RiRi from 'react-icons/ri';
import * as RiPi from 'react-icons/pi';
import * as RiBs from 'react-icons/bs';
import * as RiIo5 from 'react-icons/io5';
import * as RIRx from 'react-icons/rx';

const REACT_ICONS_MODULES: Record<string, Record<string, any>> = {
  lu: RiLu,
  tb: RiTb,
  fa6: RiFa6,
  hi2: RiHi2,
  ri: RiRi,
  pi: RiPi,
  bs: RiBs,
  io5: RiIo5,
  rx: RIRx,
};

// ---------------------------------------------------------------------------
// Lucide name resolution: kebab-case → PascalCase component
// ---------------------------------------------------------------------------

/** Convert kebab-case icon name to PascalCase export name */
function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Resolve a lucide icon by kebab-case name.
 * Tries the base name first (e.g., "ArrowRight"), then with "Icon" suffix.
 */
function resolveLucideIcon(name: string): React.ComponentType<any> | null {
  const pascal = kebabToPascal(name);
  // lucide-react exports both ArrowRight and ArrowRightIcon
  const mod = LucideIcons as Record<string, any>;
  return mod[pascal] || mod[`${pascal}Icon`] || null;
}

// ---------------------------------------------------------------------------
// react-icons name resolution: "prefix:ComponentName" → component
// ---------------------------------------------------------------------------

/**
 * Parse a react-icons reference like "lu:LuSearch" → { prefix: "lu", name: "LuSearch" }
 */
function parseReactIconRef(iconName: string): { prefix: string; name: string } | null {
  const colonIdx = iconName.indexOf(':');
  if (colonIdx === -1) return null;
  return {
    prefix: iconName.slice(0, colonIdx),
    name: iconName.slice(colonIdx + 1),
  };
}

function resolveReactIcon(iconName: string): React.ComponentType<any> | null {
  const parsed = parseReactIconRef(iconName);
  if (!parsed) return null;
  const module = REACT_ICONS_MODULES[parsed.prefix];
  if (!module) return null;
  return module[parsed.name] || null;
}

// ---------------------------------------------------------------------------
// Placeholder for unknown/missing icons
// ---------------------------------------------------------------------------

function PlaceholderIcon({ size = 24, color = '#999' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// IconRenderer — shared component
// ---------------------------------------------------------------------------

export interface IconRendererProps {
  /** Icon reference with set, name, and visual props */
  icon: IconReference;
  /** Override size (px or CSS length string such as `100%`) */
  size?: number | string;
  /** Override color */
  color?: string;
  /** Override stroke width (number in user units, or CSS length string) */
  strokeWidth?: number | string;
  /** Additional className */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Accessible label */
  'aria-label'?: string;
}

/**
 * Renders an icon from any supported set (lucide, react-icons, svgl).
 * Resolves the icon component dynamically from the imported modules.
 */
function resolvePositiveSize(
  value: number | string | undefined,
  fallback: number,
): number | string {
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveStroke(value: number | string | undefined, fallback: number): number | string {
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function IconRenderer({
  icon,
  size,
  color,
  strokeWidth,
  className,
  style,
  ...rest
}: IconRendererProps) {
  const unit = icon.sizeUnit ?? 'px';
  const defaultDim: number | string = unit === 'px' ? (icon.size ?? 24) : '100%';
  const resolvedSize =
    size !== undefined && size !== null
      ? resolvePositiveSize(size, 24)
      : resolvePositiveSize(defaultDim, 24);
  const resolvedColor = color ?? icon.color ?? 'currentColor';
  const strokeUnit = icon.strokeWidthUnit ?? 'px';
  const resolvedStroke =
    strokeWidth !== undefined && strokeWidth !== null
      ? resolveStroke(strokeWidth, 2)
      : resolveStroke(
          strokeUnit === 'px' ? (icon.strokeWidth ?? 2) : `${icon.strokeWidth ?? 2}${strokeUnit}`,
          2,
        );
  const placeholderPixelSize =
    typeof resolvedSize === 'number' ? resolvedSize : (icon.size ?? 24);

  let Component: React.ComponentType<any> | null = null;

  switch (icon.iconSet) {
    case 'lucide':
      Component = resolveLucideIcon(icon.iconName);
      if (Component) {
        return (
          <Component
            size={resolvedSize}
            color={resolvedColor}
            strokeWidth={resolvedStroke}
            className={cn('shrink-0', className)}
            style={style}
            {...rest}
          />
        );
      }
      break;

    case 'react-icons':
      Component = resolveReactIcon(icon.iconName);
      if (Component) {
        return (
          <Component
            size={resolvedSize}
            color={resolvedColor}
            className={cn('shrink-0', className)}
            style={{
              ...style,
              strokeWidth: resolvedStroke,
            }}
            {...rest}
          />
        );
      }
      break;

    case 'svgl':
      // SVGL icons are inline SVGs — for now render placeholder
      // Full SVGL integration loads these as local components
      return (
        <span
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: resolvedSize,
            height: resolvedSize,
            ...style,
          }}
          {...rest}
        >
          <PlaceholderIcon size={placeholderPixelSize} color={resolvedColor} />
        </span>
      );
  }

  // Fallback: render placeholder
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: resolvedSize,
        height: resolvedSize,
        ...style,
      }}
      {...rest}
    >
      <PlaceholderIcon size={placeholderPixelSize} color={resolvedColor} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Utility: preview an icon as a small inline element (for picker grid)
// ---------------------------------------------------------------------------

export function IconPreview({
  iconSet,
  iconName,
  size = 24,
}: {
  iconSet: string;
  iconName: string;
  size?: number;
}) {
  return (
    <IconRenderer
      icon={{ iconSet: iconSet as IconReference['iconSet'], iconName, size, color: 'currentColor', strokeWidth: 2 }}
      size={size}
    />
  );
}
