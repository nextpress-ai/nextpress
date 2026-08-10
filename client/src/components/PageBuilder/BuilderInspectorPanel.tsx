import type { ReactElement } from 'react';
import type { BlockConfig } from '@shared/schema-types';
import BlockSettings from './BlockSettings';

/** Inputs shared by compact and wide inspector shells. */
export type BuilderInspectorPanelProps = {
  selectedBlock: BlockConfig | null;
  updateBlock: (blockId: string, updates: Partial<BlockConfig>) => void;
  setHoverHighlight: (area: 'padding' | 'margin' | null) => void;
};

const panelShellClass =
  'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--npb-radius-surface)] bg-npb-surface-raised';
const scrollBodyClass = 'min-h-0 flex-1 overflow-y-auto overscroll-contain';
const scrollPanelBottomFade = (
  <div className="npb-editor-scroll-fade pointer-events-none" aria-hidden />
);
const emptySettingsClass =
  'rounded-[var(--npb-radius-surface)] bg-npb-surface-inset/60 p-6 text-center text-sm text-npb-text-muted';

/**
 * Renders selected-block controls or a clear empty state in one scrollable
 * inspector surface, reusable by compact and wide builder shells.
 */
export function BuilderInspectorPanel({
  selectedBlock,
  updateBlock,
  setHoverHighlight,
}: BuilderInspectorPanelProps): ReactElement {
  return (
    <div
      className={panelShellClass}
      data-testid="builder-inspector-panel"
      role="region"
      aria-label="Block inspector">
      <div className={scrollBodyClass}>
        <div className="max-w-full pr-2 pb-4">
          {selectedBlock ? (
            <BlockSettings
              block={selectedBlock}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
              onHoverArea={setHoverHighlight}
            />
          ) : (
            <div className={emptySettingsClass} role="status">
              Select a block to edit its settings
            </div>
          )}
        </div>
      </div>
      {scrollPanelBottomFade}
    </div>
  );
}
