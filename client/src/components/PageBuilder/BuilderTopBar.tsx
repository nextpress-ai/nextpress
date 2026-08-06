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
} from "lucide-react";
import { PagesMenu, BlogMenu, DesignMenu } from "@/components/PageBuilder/EditorBar";
import { useTheme } from "@/components/ThemeProvider";
import type { BlockConfig } from "@shared/schema-types";

export function BuilderTopBar({
  data,
  isTemplate,
  deviceView,
  setDeviceView,
  blocks,
  sidebarVisible,
  onToggleSidebar,
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
}: {
  data: any;
  isTemplate: boolean;
  deviceView: "desktop" | "tablet" | "mobile";
  setDeviceView: (view: "desktop" | "tablet" | "mobile") => void;
  blocks: any[];
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
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
}) {
  const { isDark, toggleTheme } = useTheme();
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
              aria-label="desktop"
              className={deviceView === "desktop" ? "active" : ""}
              onClick={() => setDeviceView("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "tablet" ? "default" : "outline"}
              size="sm"
              aria-label="tablet"
              className={deviceView === "tablet" ? "active" : ""}
              onClick={() => setDeviceView("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "mobile" ? "default" : "outline"}
              size="sm"
              aria-label="mobile"
              className={deviceView === "mobile" ? "active" : ""}
              onClick={() => setDeviceView("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            {deviceView !== "desktop" ? (
              <span className="text-xs text-npb-text-muted">
                Style edits apply to {deviceView === "mobile" ? "mobile (<768px)" : "tablet (768+)"} only
              </span>
            ) : (
              <span className="text-xs text-npb-text-muted hidden sm:inline">
                Desktop (base styles)
              </span>
            )}
            {onTogglePreviewMode ? (
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                aria-label={isPreviewMode ? "Exit live preview" : "Live preview"}
                title={isPreviewMode ? "Exit live preview" : "Live preview in iframe"}
                onClick={onTogglePreviewMode}
              >
                {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
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

          <BlogMenu currentPostId={data?.id} blogId={data?.blogId ?? undefined}>
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
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            )}
            <PagesMenu
              currentPageId={data?.id}
              onPageSettingsClick={onPageSettingsClick}
              onApplyResponsiveDefaults={onApplyResponsiveDefaults}
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
