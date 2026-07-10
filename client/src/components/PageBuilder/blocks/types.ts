// client/src/components/PageBuilder/blocks/types.ts
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type React from "react";

export type BlockCategory = 'basic' | 'form' | 'media' | 'layout' | 'advanced' | 'post';

/**
 * Props for block components using the new component pattern.
 * Components manage their own internal state and sync with parent via value/onChange.
 */
export interface BlockComponentProps {
  value: BlockConfig;
  onChange: (updated: BlockConfig) => void;
  /** Propagate nested child updates to the page tree (container/group/columns). */
  onNestedBlockChange?: (updated: BlockConfig) => void;
  isPreview?: boolean;
  isSelected?: boolean;
}

export interface BlockDefinition {
  id: string; // Canonical machine key (e.g., 'core/heading', 'core/paragraph')
  label: string; // User-facing display name (e.g., 'Heading', 'Paragraph')
  icon: any;
  description: string;
  category: BlockCategory;
  defaultContent: any;
  defaultStyles: Record<string, any>;
  isContainer?: boolean; // identifies blocks that can contain children
  handlesOwnChildren?: boolean; // renderer manages its own children
  hasSettings?: boolean; // indicates if the block has settings UI

  /** Parse persisted BlockContent into the editor model. Unwraps `kind: "structured"` by default. */
  parseContent?: (raw: BlockConfig["content"]) => unknown;
  /** Serialize the editor model back to persisted BlockContent. Wraps plain objects as `kind: "structured"` by default. */
  serializeContent?: (content: unknown) => BlockContent;
  
   // New component pattern (preferred)
   component?: React.ComponentType<BlockComponentProps>;
   
   // Legacy pattern (for backward compatibility)
   settings?: (props: { block: BlockConfig; onUpdate: (updates: Partial<BlockConfig>) => void }) => React.JSX.Element;
}