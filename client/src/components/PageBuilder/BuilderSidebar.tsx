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
import { cn } from '@/lib/utils';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Moon,
  Plus,
  Settings,
  Sidebar,
  Sun,
} from 'lucide-react';
import type { BlockConfig } from '@shared/schema-types';

const SIDEBAR_THEME_STORAGE_KEY = 'npb-sidebar-theme';

type SidebarChromeTheme = 'dark' | 'light';

function readStoredSidebarTheme(): SidebarChromeTheme {
  try {
    const v = localStorage.getItem(SIDEBAR_THEME_STORAGE_KEY);
    return v === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function persistSidebarTheme(next: SidebarChromeTheme): void {
  try {
    localStorage.setItem(SIDEBAR_THEME_STORAGE_KEY, next);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Header layout: title left; icon cluster L→R — theme toggle, fold all block groups, collapse sidebar.
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
}: {
  activeTab: 'blocks' | 'settings';
  setActiveTab: (tab: 'blocks' | 'settings') => void;
  selectedBlock: any;
  updateBlock: (blockId: string, updates: any) => void;
  setHoverHighlight: (area: 'padding' | 'margin' | null) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onInsertTemplate?: (blocks: BlockConfig[]) => void;
}) {
  const [sidebarTheme, setSidebarTheme] = useState<SidebarChromeTheme>(
    readStoredSidebarTheme
  );
  const isLight = sidebarTheme === 'light';

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

  const setChromeTheme = (next: SidebarChromeTheme) => {
    setSidebarTheme(next);
    persistSidebarTheme(next);
  };

  const rootClass = cn(
    'npb-editor-sidebar flex h-full min-h-0 w-80 shrink-0 flex-col border-r transition-all duration-300 ease-out sm:w-80 lg:w-80',
    isLight
      ? 'npb-editor-sidebar--light border-zinc-200/90 bg-zinc-100 text-zinc-900 shadow-[12px_0_24px_-12px_rgb(0_0_0/0.08)]'
      : 'border-zinc-800/50 bg-[#050507] text-zinc-300 shadow-[12px_0_32px_-14px_rgb(0_0_0/0.85)]'
  );

  const headerRowClass = cn(
    'flex w-full items-center justify-between gap-2 border-b p-4',
    isLight
      ? 'border-zinc-200/75 bg-white'
      : 'bg-[#050507] [border-bottom-color:var(--npb-coll-header-divider)]'
  );

  const titleClass = cn(
    'text-lg font-semibold tracking-tight',
    isLight ? 'text-zinc-900' : 'text-zinc-100'
  );

  const headerIconBtnClass = cn(
    'h-9 w-9 shrink-0 p-0',
    isLight
      ? 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-zinc-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100'
      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:ring-zinc-500/55 focus-visible:ring-offset-0'
  );

  const tabsListClass = cn(
    'grid h-auto min-h-10 w-full grid-cols-2 rounded-lg border p-1',
    isLight
      ? 'border-zinc-200/70 bg-zinc-50 shadow-[inset_0_1px_0_0_rgb(0_0_0/0.03)]'
      : 'border-zinc-800/45 bg-zinc-950 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]'
  );

  const tabTriggerClass = cn(
    'flex min-h-9 items-center gap-2 rounded-md border border-transparent px-4 py-2.5 text-sm font-medium transition-colors',
    isLight
      ? 'text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 data-[state=active]:bg-white data-[state=active]:text-zinc-900'
      : 'text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-100 data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-50'
  );

  const panelShellClass = cn(
    'relative h-full overflow-hidden rounded-lg border shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]',
    isLight
      ? 'border-zinc-200/55 bg-white shadow-[inset_0_1px_0_0_rgb(0_0_0/0.025)]'
      : 'border-zinc-800/40 bg-zinc-950'
  );

  const scrollPanelBottomFade = (
    <div className="npb-editor-scroll-fade" aria-hidden />
  );

  const emptySettingsClass = cn(
    'rounded-lg border border-dashed p-6 text-center text-sm',
    isLight
      ? 'border-zinc-300/70 bg-zinc-50 text-zinc-600'
      : 'border-zinc-700/50 bg-black/40 text-zinc-400'
  );

  const templateWrapClass = cn(
    'mt-4 rounded-lg border shadow-sm',
    isLight ? 'border-zinc-200/60 bg-zinc-50' : 'border-zinc-800/35 bg-zinc-950/90'
  );

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
                    isLight ? 'Switch sidebar to dark theme' : 'Switch sidebar to light theme'
                  }
                  onClick={() => setChromeTheme(isLight ? 'dark' : 'light')}>
                  {isLight ? (
                    <Moon className="h-5 w-5" aria-hidden />
                  ) : (
                    <Sun className="h-5 w-5" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isLight ? 'Use dark sidebar' : 'Use light sidebar'}
              </TooltipContent>
            </Tooltip>

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
