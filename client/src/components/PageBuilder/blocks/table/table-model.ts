/**
 * Table block data model: cell/row/table shapes and defaults. No React here —
 * see `table-settings.tsx` for the editor UI.
 */

import type { BlockContent } from "@shared/schema-types";

// ============================================================================
// TYPES
// ============================================================================

export interface TableCell {
  content: string;
  tag: 'td' | 'th';
}

export interface TableRow {
  cells: TableCell[];
}

export type TableData = {
  body?: TableRow[];
  head?: TableRow[];
  foot?: TableRow[];
  hasFixedLayout?: boolean;
  caption?: string;
  className?: string;
};

export type TableContent = BlockContent & {
  data?: TableData;
};

export const DEFAULT_DATA: TableData = {
  body: [],
  head: [],
  foot: [],
  hasFixedLayout: false,
  caption: '',
  className: '',
};

export const DEFAULT_CONTENT: TableContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};
