import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Accordion panel for page builder sidebar block settings.
 * Chrome reads tokens from `.npb-editor-sidebar` / `--light` (see `client/src/index.css`).
 */
export const CollapsibleCard = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card
      data-npb-collapsible-card
      className={cn(
        "npb-settings-collapsible-card rounded-none border-0 bg-transparent p-0 shadow-none",
        className
      )}>
      <CardHeader
        className="npb-settings-collapsible-header !p-4"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon className="npb-settings-collapsible-icon h-4 w-4 shrink-0" />
            )}
            <h3 className="npb-settings-collapsible-title">{title}</h3>
          </div>
          {isOpen ? (
            <ChevronDown className="npb-settings-collapsible-chevron h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="npb-settings-collapsible-chevron h-4 w-4 shrink-0" />
          )}
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4 !p-4 !pt-4">{children}</CardContent>
      )}
    </Card>
  );
};
