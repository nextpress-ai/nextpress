import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { FileText, Plus, Search, Settings2 } from "lucide-react";
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
}

/**
 * PagesMenu — unified page actions: browse/create pages and optional Page Settings entry.
 * Opens Command palette for searchable page list from "Browse Pages".
 */
export function PagesMenu({
  children,
  currentPageId,
  onPageSettingsClick,
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
      publish: "bg-green-100 text-green-500 ring-1 ring-green-300",
      published: "bg-green-100 text-green-500 ring-1 ring-green-300",
      draft: "bg-orange-100 text-orange-500 ring-1 ring-orange-300",
      private: "bg-yellow-100 text-yellow-500 ring-1 ring-yellow-300",
      trash: "bg-red-100 text-red-500 ring-1 ring-red-300",
    };
    return colors[status] || "bg-gray-300 text-gray-500 ring-1 ring-gray-300";
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
                    ${isCurrentPage ? "bg-blue-50/80" : ""}
                  `}
                  {...(isCurrentPage ? { "aria-current": "page" } : {})}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText
                        className={`w-4 h-4 flex-shrink-0 ${
                          isCurrentPage ? "text-blue-600" : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`truncate font-medium ${
                          isCurrentPage
                            ? "text-blue-600"
                            : "text-gray-700 group-hover:text-blue-600"
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
                          <BiPencil className="w-2 h-2 text-gray-500 hover:text-gray-700" />
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
