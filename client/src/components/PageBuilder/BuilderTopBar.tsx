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
} from "lucide-react";
import { PagesMenu, BlogMenu, DesignMenu } from "@/components/PageBuilder/EditorBar";
import { useTheme } from "@/components/ThemeProvider";

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
}) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="bg-npb-surface-base border-b border-npb-border-default p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!sidebarVisible && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="p-1 h-auto"
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
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-1.5 h-auto"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-zinc-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
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
            currentType={isTemplate ? "template" : "post"}
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
            >
              <Button
                type="button"
                size="sm"
                title="Page — browse, create, settings"
                className="mr-2 gap-2 border border-zinc-950 bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <FileStack className="h-4 w-4 shrink-0 text-white" aria-hidden />
                Page
              </Button>
            </PagesMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
