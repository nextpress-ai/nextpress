import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { FileText, Plus, Search, Settings2, Smartphone } from "lucide-react";
import { BiPencil } from "react-icons/bi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useContentLists } from "@/hooks/useContentLists";
import { Badge } from "@/components/ui/badge";

interface PagesMenuProps {
  children: ReactNode;
  currentPageId?: string;
  /** Opens the editor Page Settings modal when set */
  onPageSettingsClick?: () => void;
  onApplyResponsiveDefaults?: () => void;
}

/**
 * PagesMenu — unified page actions: browse/create pages and optional Page Settings entry.
 * Opens Command palette for searchable page list from "Browse Pages".
 */
export function PagesMenu({
  children,
  currentPageId,
  onPageSettingsClick,
  onApplyResponsiveDefaults,
}: PagesMenuProps) {
  const [, setLocation] = useLocation();
  const [showCommand, setShowCommand] = useState(false);
  const { pages, pagesLoading } = useContentLists();

  const handlePageSelect = (pageId: string) => {
    setShowCommand(false);
    window.location.href = `/admin/page-builder/page/${pageId}`;
  };

  const handleCreateNew = () => {
    setLocation("/admin/pages?create=true");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      publish: 'bg-npb-status-success/15 text-npb-status-success',
      published: 'bg-npb-status-success/15 text-npb-status-success',
      draft: 'bg-npb-status-warning/15 text-npb-status-warning',
      private: 'bg-npb-status-warning/15 text-npb-status-warning',
      trash: 'bg-npb-status-error/15 text-npb-status-error',
    };
    return colors[status] ?? 'bg-npb-surface-inset text-npb-text-muted';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setShowCommand(true)}>
            <Search className="w-4 h-4" />
            Browse Pages
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateNew}>
            <Plus className="w-4 h-4" />
            Create New Page
          </DropdownMenuItem>
          {onApplyResponsiveDefaults ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onApplyResponsiveDefaults();
                }}
              >
                <Smartphone className="w-4 h-4" />
                Apply mobile-friendly defaults
              </DropdownMenuItem>
            </>
          ) : null}
          {onPageSettingsClick ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onPageSettingsClick();
                }}
              >
                <Settings2 className="w-4 h-4" />
                Page settings…
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command Palette for browsing pages */}
      <CommandDialog
        open={showCommand}
        onOpenChange={setShowCommand}
        title="Search Pages"
        description="Search and select a page to edit"
      >
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>
            {pagesLoading ? "Loading pages..." : "No pages found."}
          </CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => {
              const isCurrentPage = currentPageId === page.id;
              return (
                <CommandItem
                  key={page.id}
                  value={page.id}
                  onSelect={() => handlePageSelect(page.id)}
                  className={`
                    group cursor-pointer px-3 py-2.5 rounded-md transition-colors
                    ${isCurrentPage ? 'bg-npb-accent/10' : ''}
                  `}
                  {...(isCurrentPage ? { "aria-current": "page" } : {})}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText
                        className={`w-4 h-4 flex-shrink-0 ${
                          isCurrentPage ? 'text-npb-accent' : 'text-npb-text-muted'
                        }`}
                      />
                      <span
                        className={`truncate font-medium ${
                          isCurrentPage
                            ? 'text-npb-accent'
                            : 'text-npb-text-primary group-hover:text-npb-accent'
                        }`}
                      >
                        {page.title || "Untitled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {page.status && (
                        <Badge
                          className={`text-xs px-2 py-3 h-5 rounded-full font-medium ${getStatusColor(
                            page.status
                          )}`}
                        >
                          <BiPencil className="h-2 w-2 text-npb-text-muted group-hover:text-npb-text-secondary" />
                          {page.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
