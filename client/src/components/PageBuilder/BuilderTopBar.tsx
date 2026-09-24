import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Tablet,
  Monitor,
  Sidebar,
  FileStack,
  Pen,
  Palette,
  RotateCcw,
  RotateCw,
  Sun,
  Moon,
  Eye,
  EyeOff,
  PanelRightOpen,
  Info,
} from "lucide-react";
import { blockRegistry } from "@/components/PageBuilder/blocks";
import { topLevelBlockOptions, topLevelSelectionId } from "@/components/PageBuilder/top-level-blocks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PagesMenu, BlogMenu, DesignMenu } from "@/components/PageBuilder/EditorBar";
import { useTheme } from "@/components/ThemeProvider";
import type { BlockConfig } from "@shared/schema-types";

export function BuilderTopBar({
  data,
  isTemplate,
  deviceView,
  setDeviceView,
  blocks,
  selectedBlockId,
  onSelectBlock,
  sidebarVisible,
  onToggleSidebar,
  inspectorVisible,
  onToggleInspector,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPageSettingsClick,
  contentType = "page",
  onApplyTemplate,
  isPreviewMode = false,
  onTogglePreviewMode,
  onApplyResponsiveDefaults,
  onCreateNewPage,
  onCreateNewPost,
}: {
  data: any;
  isTemplate: boolean;
  deviceView: "desktop" | "tablet" | "mobile";
  setDeviceView: (view: "desktop" | "tablet" | "mobile") => void;
  blocks: BlockConfig[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  inspectorVisible?: boolean;
  onToggleInspector?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onPageSettingsClick?: () => void;
  contentType?: "post" | "page" | "template";
  onApplyTemplate?: (params: {
    templateId: string;
    blocks: BlockConfig[];
  }) => void;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
  onApplyResponsiveDefaults?: () => void;
  onCreateNewPage?: () => void;
  onCreateNewPost?: () => void;
}) {
  const { isDark, toggleTheme } = useTheme();
  const deviceHint =
    deviceView === "mobile"
      ? "Edits apply on phones only."
      : deviceView === "tablet"
        ? "Edits apply on tablets only."
        : "Edits apply on every screen size.";
  const blockNames = Object.fromEntries(
    Object.entries(blockRegistry).map(([name, definition]) => [name, definition.label]),
  );
  const blockOptions = topLevelBlockOptions(blocks, blockNames);
  const shownBlockId = topLevelSelectionId(blocks, selectedBlockId);
  return (
    <div className="bg-npb-surface-base p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!sidebarVisible && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="npb-interactive-ghost p-1 h-auto"
                aria-label="Show block library"
              >
                <Sidebar className="w-5 h-5 text-npb-text-primary" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          {/* <h3 className="font-medium">{data ? (isTemplate ? data.name : data.title) : 'Untitled'}</h3> */}
          {/* <Separator orientation="vertical" className="h-6" /> */}
          <div className="flex items-center gap-2">
            <Button
              variant={deviceView === "desktop" ? "default" : "outline"}
              size="sm"
              aria-label="Desktop preview"
              aria-pressed={deviceView === "desktop"}
              className={deviceView === "desktop" ? "active" : ""}
              onClick={() => setDeviceView("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "tablet" ? "default" : "outline"}
              size="sm"
              aria-label="Tablet preview"
              aria-pressed={deviceView === "tablet"}
              className={deviceView === "tablet" ? "active" : ""}
              onClick={() => setDeviceView("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "mobile" ? "default" : "outline"}
              size="sm"
              aria-label="Mobile preview"
              aria-pressed={deviceView === "mobile"}
              className={deviceView === "mobile" ? "active" : ""}
              onClick={() => setDeviceView("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label={deviceHint}
                >
                  <Info className="h-4 w-4 text-npb-text-muted" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{deviceHint}</TooltipContent>
            </Tooltip>
            {blockOptions.length > 0 && !isPreviewMode ? (
              <Select
                value={shownBlockId}
                onValueChange={(id) => {
                  onSelectBlock(id);
                  document
                    .querySelector(`[data-block-id="${CSS.escape(id)}"]`)
                    ?.scrollIntoView({ block: "nearest", inline: "nearest" });
                }}
              >
                <SelectTrigger size="sm" aria-label="Blocks on this page" className="h-8 w-44 max-w-[12rem]">
                  <SelectValue placeholder="Blocks" />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {blockOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {onTogglePreviewMode ? (
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                aria-label={isPreviewMode ? "Exit live preview" : "Live preview"}
                aria-pressed={isPreviewMode}
                title={isPreviewMode ? "Exit live preview" : "Live preview in iframe"}
                onClick={onTogglePreviewMode}
              >
                {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {inspectorVisible === false && onToggleInspector ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleInspector}
                className="npb-interactive-ghost p-1 h-auto"
                aria-label="Show block settings"
              >
                <PanelRightOpen className="w-5 h-5 text-npb-text-primary" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="npb-interactive-ghost p-1.5 h-auto"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-npb-text-muted" />
            ) : (
              <Moon className="w-4 h-4 text-npb-text-secondary" />
            )}
          </Button>

          <div className="text-sm text-npb-text-muted">{blocks.length} blocks</div>

          <BlogMenu
            currentPostId={data?.id}
            blogId={data?.blogId ?? undefined}
            onCreateNewPost={onCreateNewPost}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pen className="w-4 h-4" />
              Blog
            </Button>
          </BlogMenu>

          <DesignMenu
            currentPostId={data?.id}
            currentType={contentType === "template" ? "template" : contentType}
            onApplyTemplate={onApplyTemplate}
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Palette className="w-4 h-4" />
              Design
            </Button>
          </DesignMenu>

          <div className="flex items-center gap-3">
            {onUndo && (
              <Button
                size="sm"
                variant="outline"
                onClick={onUndo}
                disabled={canUndo === false}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            {onRedo && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRedo}
                disabled={canRedo === false}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            )}
            <PagesMenu
              currentPageId={data?.id}
              onPageSettingsClick={onPageSettingsClick}
              onApplyResponsiveDefaults={onApplyResponsiveDefaults}
              onCreateNewPage={onCreateNewPage}
            >
              <Button
                type="button"
                size="sm"
                title="Page — browse, create, settings"
                className="npb-interactive-emphasis mr-2 gap-2 focus-visible:ring-2 focus-visible:ring-npb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-npb-surface-base"
              >
                <FileStack className="h-4 w-4 shrink-0" aria-hidden />
                Page
              </Button>
            </PagesMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
