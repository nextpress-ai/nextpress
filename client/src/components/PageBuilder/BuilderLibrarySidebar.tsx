import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronsDownUp, ChevronsUpDown, Sidebar } from 'lucide-react';
import { ResponsiveHealthBanner } from './ResponsiveHealthBanner';
import { BuilderLibraryPanel } from './BuilderLibraryPanel';
import type { BlockConfig } from '@shared/schema-types';
import { useBuilderLibraryState } from './use-builder-library-state';

/** Left rail: block library and templates at wide builder widths. */
export type BuilderLibrarySidebarProps = {
  onToggleSidebar: () => void;
  onInsertTemplate?: (blocks: BlockConfig[]) => void;
  blocks?: BlockConfig[];
  onApplyResponsiveDefaults?: () => boolean | void;
  responsiveHealthBannerDismissed?: boolean;
};

const rootClass =
  'npb-builder-library-sidebar npb-editor-sidebar flex h-full min-h-0 w-[var(--npb-builder-library-width)] shrink-0 flex-col overflow-hidden border-r border-npb-border-strong bg-npb-surface-base text-npb-text-secondary shadow-[var(--npb-shadow-surface)]';
const headerRowClass =
  'flex w-full items-center justify-between gap-2 bg-npb-surface-header p-4';
const titleClass =
  'text-lg font-semibold tracking-tight text-npb-text-primary';
const headerIconBtnClass =
  'h-9 w-9 shrink-0 rounded-[var(--npb-radius-input)] p-0 text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary focus-visible:ring-npb-focus focus-visible:ring-offset-0';

/**
 * Fixed left library rail for wide viewports. Blocks are added via drag-and-drop.
 */
export function BuilderLibrarySidebar({
  onToggleSidebar,
  onInsertTemplate,
  blocks = [],
  onApplyResponsiveDefaults,
  responsiveHealthBannerDismissed = false,
}: BuilderLibrarySidebarProps): ReactElement {
  const {
    categories,
    openCategories,
    allLibraryGroupsExpanded,
    onToggleLibraryFold,
    onCategoryOpenChange,
  } = useBuilderLibraryState();

  return (
    <TooltipProvider delayDuration={300}>
      <div className={rootClass}>
        <div className={headerRowClass}>
          <h2 className={titleClass}>NextPress Editor</h2>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={headerIconBtnClass}
                  aria-label={
                    allLibraryGroupsExpanded
                      ? 'Collapse all block groups'
                      : 'Expand all block groups'
                  }
                  onClick={onToggleLibraryFold}
                  disabled={categories.length === 0}>
                  {allLibraryGroupsExpanded ? (
                    <ChevronsDownUp className="h-5 w-5" aria-hidden />
                  ) : (
                    <ChevronsUpDown className="h-5 w-5" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {allLibraryGroupsExpanded
                  ? 'Collapse all block groups'
                  : 'Expand all block groups'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSidebar}
                  className={headerIconBtnClass}
                  aria-label="Collapse block library">
                  <Sidebar className="h-5 w-5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse block library</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <ResponsiveHealthBanner
          blocks={blocks}
          onApplyDefaults={onApplyResponsiveDefaults}
          dismissed={responsiveHealthBannerDismissed}
        />
        <div className="min-h-0 flex-1 p-3 sm:p-4">
          <BuilderLibraryPanel
            categories={categories}
            openCategories={openCategories}
            onCategoryOpenChange={onCategoryOpenChange}
            onInsertTemplate={onInsertTemplate}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
