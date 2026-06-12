import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, LayoutTemplate, Plus } from "lucide-react";
import type { Template, BlockConfig } from "@shared/schema-types";
import {
  NPB_TEMPLATE_LIST_NAME_MAX_CHARS,
  truncateWithEllipsis,
} from "@/lib/truncate-with-ellipsis";

interface TemplatesApiResponse {
  templates: Template[];
  total: number;
}

interface TemplateLibraryProps {
  /** Called when a template is selected to insert its blocks */
  onInsertTemplate: (blocks: BlockConfig[]) => void;
}

/**
 * TemplateLibrary — shows available templates in the block library sidebar.
 * Clicking a template inserts all its blocks at the end of the current canvas.
 * Only shown when editing pages or posts (not when editing a template itself).
 */
export function TemplateLibrary({ onInsertTemplate }: TemplateLibraryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<TemplatesApiResponse>({
    queryKey: ["/api/templates", { per_page: 50 }],
    enabled: isOpen,
  });

  const templates = data?.templates ?? [];

  const handleInsert = (template: Template) => {
    const blocks = (template.blocks as BlockConfig[]) ?? [];
    if (blocks.length === 0) return;
    onInsertTemplate(blocks);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto font-semibold text-sm text-npb-text-primary hover:text-npb-text-primary hover:bg-npb-interactive-bg-hover"
        >
          <span className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-npb-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-npb-text-muted" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          {isLoading ? (
            <p className="text-xs text-npb-text-muted text-center py-4">
              Loading templates...
            </p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-npb-text-muted text-center py-4">
              No templates available. Create one first.
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5 pr-2">
                {templates.map((template) => {
                  const blockCount =
                    Array.isArray(template.blocks) ? template.blocks.length : 0;
                  const nameDisplay = truncateWithEllipsis({
                    text: template.name,
                    maxChars: NPB_TEMPLATE_LIST_NAME_MAX_CHARS,
                  });
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleInsert(template)}
                      disabled={blockCount === 0}
                      className="w-full text-left px-3 py-2.5 rounded-md hover:bg-npb-interactive-bg-hover transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium text-npb-text-primary min-w-0 shrink"
                              title={template.name}>
                              {nameDisplay}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              {template.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-npb-text-muted mt-0.5">
                            {blockCount} block{blockCount !== 1 ? "s" : ""}
                            {template.description
                              ? ` · ${template.description}`
                              : ""}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-npb-text-muted opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
