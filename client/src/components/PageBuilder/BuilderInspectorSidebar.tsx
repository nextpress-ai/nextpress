import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PanelRightClose } from 'lucide-react';
import type { BlockConfig } from '@shared/schema-types';
import { BuilderInspectorPanel } from './BuilderInspectorPanel';

/** Right rail: selected block settings at wide builder widths. */
export type BuilderInspectorSidebarProps = {
  selectedBlock: BlockConfig | null;
  updateBlock: (blockId: string, updates: Partial<BlockConfig>) => void;
  setHoverHighlight: (area: 'padding' | 'margin' | null) => void;
  onToggleInspector: () => void;
};

const rootClass =
  'npb-builder-inspector-sidebar npb-editor-sidebar flex h-full min-h-0 w-[var(--npb-builder-inspector-width)] shrink-0 flex-col overflow-hidden border-l border-npb-border-strong bg-npb-surface-base text-npb-text-secondary shadow-[var(--npb-shadow-surface)]';
const headerRowClass =
  'flex w-full items-center justify-between gap-2 border-b border-npb-divider bg-npb-surface-base p-4';
const titleClass =
  'text-lg font-semibold tracking-tight text-npb-text-primary';
const headerIconBtnClass =
  'h-9 w-9 shrink-0 rounded-[var(--npb-radius-input)] p-0 text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary focus-visible:ring-npb-focus focus-visible:ring-offset-0';

/**
 * Fixed right inspector rail for wide viewports so settings sit beside the canvas.
 */
export function BuilderInspectorSidebar({
  selectedBlock,
  updateBlock,
  setHoverHighlight,
  onToggleInspector,
}: BuilderInspectorSidebarProps): ReactElement {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={rootClass}>
        <div className={headerRowClass}>
          <h2 className={titleClass}>Block settings</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleInspector}
                className={headerIconBtnClass}
                aria-label="Collapse block settings">
                <PanelRightClose className="h-5 w-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Collapse block settings</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <BuilderInspectorPanel
            selectedBlock={selectedBlock}
            updateBlock={updateBlock}
            setHoverHighlight={setHoverHighlight}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
