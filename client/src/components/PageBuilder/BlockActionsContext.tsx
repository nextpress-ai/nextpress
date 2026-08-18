import React, { createContext, useContext } from 'react';

export type HoverHighlight = 'padding' | 'margin' | null;

export interface BlockActionsContextValue {
  selectedBlockId: string | null;
  editingBlockId: string | null;
  hoveredBlockId: string | null;
  onSelect: (id: string | null) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onHoverBlock: (id: string | null) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  hoverHighlight: HoverHighlight;
}

const BlockActionsContext = createContext<BlockActionsContextValue | null>(null);

export function useBlockActions() {
  return useContext(BlockActionsContext);
}

export function BlockActionsProvider({ value, children }: { value: BlockActionsContextValue; children: React.ReactNode }) {
  return <BlockActionsContext.Provider value={value}>{children}</BlockActionsContext.Provider>;
}
