/**
 * Group block data model: content shape, named layout presets, and defaults.
 * No React here — see `group-settings.tsx` for the UI.
 */

/** Semantic content only — layout CSS lives on `block.styles`. */
export type GroupSemanticContent = {
  tagName?: string;
  className?: string;
  layoutPreset?: string;
};

/** @deprecated Layout fields belong on styles. Kept for legacy persisted content reads. */
export type GroupContent = GroupSemanticContent & {
  display?: "block" | "flex" | "grid" | "inline" | "inline-flex" | "inline-block";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  overflow?: "visible" | "hidden" | "auto" | "scroll";
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  width?: string;
  height?: string;
};

export const DEFAULT_SEMANTIC_CONTENT: GroupSemanticContent = {
  tagName: "div",
  className: "",
};

/** @deprecated Use DEFAULT_SEMANTIC_CONTENT — layout defaults are on styles. */
export const DEFAULT_CONTENT: GroupContent = {
  ...DEFAULT_SEMANTIC_CONTENT,
  display: "block",
  flexDirection: "column",
  flexWrap: "nowrap",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  gap: "0px",
  overflow: "visible",
};

/** Named layout presets for quick container configuration */
export const LAYOUT_PRESETS: Record<string, Partial<GroupContent> & { label: string; description: string }> = {
  'default': {
    label: 'Default',
    description: 'Standard block layout',
    display: 'block',
  },
  'flex-column': {
    label: 'Vertical Stack',
    description: 'Items stacked vertically with flex',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  'flex-row': {
    label: 'Horizontal Row',
    description: 'Items side by side, wraps on small screens',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '16px',
  },
  'flex-center': {
    label: 'Centered',
    description: 'Content centered both ways',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  'flex-between': {
    label: 'Space Between',
    description: 'Items spread evenly across container',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  'grid-2col': {
    label: '2-Column Grid',
    description: 'Equal two-column grid layout',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  'grid-3col': {
    label: '3-Column Grid',
    description: 'Equal three-column grid layout',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  'grid-auto': {
    label: 'Auto Grid',
    description: 'Responsive auto-fill grid',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  'sidebar-left': {
    label: 'Sidebar Left',
    description: 'Fixed sidebar with flexible main area',
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gap: '24px',
  },
  'sidebar-right': {
    label: 'Sidebar Right',
    description: 'Flexible main area with fixed sidebar',
    display: 'grid',
    gridTemplateColumns: '1fr 250px',
    gap: '24px',
  },
  'hero-centered': {
    label: 'Hero Centered',
    description: 'Full-width centered hero section',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    minHeight: '400px',
    className: 'text-center',
  },
};
