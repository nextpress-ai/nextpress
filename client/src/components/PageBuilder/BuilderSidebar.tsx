import { useMemo, useState } from 'react';
import BlockLibrary, { buildBlockLibraryCategories } from './BlockLibrary';
import BlockSettings from './BlockSettings';
import { TemplateLibrary } from './TemplateLibrary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
  Settings,
  Sidebar,
} from 'lucide-react';
import type { BlockConfig } from '@shared/schema-types';
import { ResponsiveHealthBanner } from './ResponsiveHealthBanner';

/**
 * Header layout: title left; icon cluster L→R — fold all block groups, collapse sidebar.
 */
export function BuilderSidebar({
  activeTab,
  setActiveTab,
  selectedBlock,
  updateBlock,
  setHoverHighlight,
  sidebarVisible,
  onToggleSidebar,
  onInsertTemplate,
  blocks = [],
  onApplyResponsiveDefaults,
}: {
  activeTab: 'blocks' | 'settings';
  setActiveTab: (tab: 'blocks' | 'settings') => void;
  selectedBlock: any;
  updateBlock: (blockId: string, updates: any) => void;
  setHoverHighlight: (area: 'padding' | 'margin' | null) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onInsertTemplate?: (blocks: BlockConfig[]) => void;
  blocks?: BlockConfig[];
  onApplyResponsiveDefaults?: () => void;
}) {
  const libraryCategories = useMemo(() => buildBlockLibraryCategories(), []);

  const [libraryOpen, setLibraryOpen] = useState<Record<string, boolean>>(() =>
    libraryCategories.reduce<Record<string, boolean>>(
      (acc, c) => ({ ...acc, [c.id]: true }),
      {}
    )
  );

  const allLibraryGroupsExpanded = useMemo(() => {
    if (libraryCategories.length === 0) return true;
    return libraryCategories.every((c) => libraryOpen[c.id] !== false);
  }, [libraryCategories, libraryOpen]);

  const rootClass =
    'npb-editor-sidebar flex h-full min-h-0 w-80 shrink-0 flex-col bg-npb-surface-base text-npb-text-secondary shadow-[var(--npb-shadow-surface)] transition-all duration-300 ease-out sm:w-80 lg:w-80';

  const headerRowClass =
    'flex w-full items-center justify-between gap-2 bg-npb-surface-header p-4';

  const titleClass = 'text-lg font-semibold tracking-tight text-npb-text-primary';

  const headerIconBtnClass =
    'h-9 w-9 shrink-0 rounded-[var(--npb-radius-input)] p-0 text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary focus-visible:ring-npb-focus focus-visible:ring-offset-0';

  const tabsListClass =
    'grid h-auto min-h-10 w-full grid-cols-2 rounded-[var(--npb-radius-surface)] bg-npb-surface-inset p-1';

  const tabTriggerClass =
    'flex min-h-9 items-center gap-2 rounded-[var(--npb-radius-input)] px-4 py-2.5 text-sm font-medium text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active transition-colors';

  const panelShellClass =
    'relative h-full overflow-hidden rounded-[var(--npb-radius-surface)] bg-npb-surface-raised';

  const scrollPanelBottomFade = (
    <div className="npb-editor-scroll-fade" aria-hidden />
  );

  const emptySettingsClass =
    'rounded-[var(--npb-radius-surface)] bg-npb-surface-inset/60 p-6 text-center text-sm text-npb-text-muted';

  const templateWrapClass =
    'mt-4 rounded-[var(--npb-radius-surface)] bg-npb-surface-raised';

  const handleToggleLibraryFold = () => {
    if (libraryCategories.length === 0) return;
    const nextOpen = !allLibraryGroupsExpanded;
    setLibraryOpen(
      Object.fromEntries(libraryCategories.map((c) => [c.id, nextOpen]))
    );
  };

  const handleCategoryOpenChange = (categoryId: string, open: boolean) => {
    setLibraryOpen((prev) => ({
      ...prev,
      [categoryId]: open,
    }));
  };

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
                  onClick={handleToggleLibraryFold}
                  disabled={libraryCategories.length === 0}>
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
                  aria-label="Collapse sidebar">
                  <Sidebar className="h-5 w-5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <ResponsiveHealthBanner blocks={blocks} onApplyDefaults={onApplyResponsiveDefaults} />
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'blocks' | 'settings')}
          className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <TabsList className={tabsListClass}>
            <TabsTrigger value="blocks" className={tabTriggerClass}>
              <Plus className="h-4 w-4" /> Blocks
            </TabsTrigger>
            <TabsTrigger value="settings" className={tabTriggerClass}>
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="blocks" className="mt-4 flex-1 overflow-hidden">
            <div className={panelShellClass}>
              <ScrollArea
                className="h-full rounded-[inherit]"
                bottomOverlay={scrollPanelBottomFade}>
                <div className="max-w-full pr-2">
                  <BlockLibrary
                    categories={libraryCategories}
                    openCategories={libraryOpen}
                    onCategoryOpenChange={handleCategoryOpenChange}
                  />
                  {onInsertTemplate && (
                    <div className={templateWrapClass}>
                      <TemplateLibrary onInsertTemplate={onInsertTemplate} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-4 flex-1 overflow-hidden">
            <div className={panelShellClass}>
              <ScrollArea
                className="h-full rounded-[inherit]"
                bottomOverlay={scrollPanelBottomFade}>
                <div className="max-w-full pr-2">
                  {selectedBlock ? (
                    <BlockSettings
                      block={selectedBlock}
                      onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
                      onHoverArea={(area) => setHoverHighlight(area)}
                    />
                  ) : (
                    <div className={emptySettingsClass}>
                      Select a block to edit its settings
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
