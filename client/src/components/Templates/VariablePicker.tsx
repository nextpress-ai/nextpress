import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Braces, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { VariableNamespaceUI } from "@shared/schema-types";

/** Variable namespaces available for template insertion */
const VARIABLE_NAMESPACES: VariableNamespaceUI[] = [
  {
    name: "site",
    label: "Site",
    description: "Site-wide settings",
    variables: [
      { key: "title", label: "Site Title", description: "The site title from settings", example: "My Website" },
      { key: "url", label: "Site URL", description: "The site base URL", example: "https://example.com" },
      { key: "description", label: "Site Description", description: "The site tagline", example: "A great website" },
      { key: "language", label: "Site Language", description: "The site language code", example: "en" },
    ],
  },
  {
    name: "post",
    label: "Post",
    description: "Current post data",
    variables: [
      { key: "title", label: "Post Title", description: "The post title", example: "Hello World" },
      { key: "slug", label: "Post Slug", description: "The post URL slug", example: "hello-world" },
      { key: "date", label: "Post Date", description: "The publish date", example: "2025-01-15" },
      { key: "modified_date", label: "Modified Date", description: "Last modified date", example: "2025-02-01" },
      { key: "excerpt", label: "Post Excerpt", description: "The post summary", example: "A short summary..." },
      { key: "author", label: "Post Author", description: "The author name", example: "John Doe" },
      { key: "url", label: "Post URL", description: "The post permalink", example: "https://example.com/hello-world" },
      { key: "featured_image", label: "Featured Image", description: "Featured image URL", example: "https://example.com/image.jpg" },
    ],
  },
  {
    name: "page",
    label: "Page",
    description: "Current page data",
    variables: [
      { key: "title", label: "Page Title", description: "The page title", example: "About Us" },
      { key: "slug", label: "Page Slug", description: "The page URL slug", example: "about-us" },
      { key: "url", label: "Page URL", description: "The page permalink", example: "https://example.com/about-us" },
    ],
  },
  {
    name: "author",
    label: "Author",
    description: "Author information",
    variables: [
      { key: "name", label: "Author Name", description: "The display name", example: "Jane Doe" },
      { key: "avatar", label: "Author Avatar", description: "The avatar URL", example: "https://example.com/avatar.jpg" },
      { key: "bio", label: "Author Bio", description: "The biography", example: "Writer and developer" },
      { key: "url", label: "Author URL", description: "The profile URL", example: "https://example.com/author/jane" },
    ],
  },
  {
    name: "date",
    label: "Date",
    description: "Current date and time",
    variables: [
      { key: "now", label: "Current Date", description: "Current date (YYYY-MM-DD)", example: "2025-06-15" },
      { key: "year", label: "Current Year", description: "Current year", example: "2025" },
      { key: "month", label: "Current Month", description: "Current month (01-12)", example: "06" },
      { key: "day", label: "Current Day", description: "Current day (01-31)", example: "15" },
      { key: "time", label: "Current Time", description: "Current time (HH:MM)", example: "14:30" },
    ],
  },
];

interface VariablePickerProps {
  /** Called when a variable is selected, receives the variable tag string */
  onInsert: (variable: string) => void;
}

/**
 * VariablePicker — dropdown for inserting template variables.
 * Groups variables by namespace (Site, Post, Page, Author, Date).
 * Clicking a variable inserts {{namespace.field}} at the cursor position.
 */
export function VariablePicker({ onInsert }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInsert = (namespace: string, field: string) => {
    const tag = `{{${namespace}.${field}}}`;
    onInsert(tag);
    setOpen(false);
    toast({
      title: "Variable inserted",
      description: tag,
    });
  };

  const handleCopy = async (namespace: string, field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = `{{${namespace}.${field}}}`;
    await navigator.clipboard.writeText(tag);
    setCopiedKey(`${namespace}.${field}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", "npb-settings-btn-outline")}
        >
          <Braces className="h-3.5 w-3.5" />
          Variables
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium">Template Variables</p>
          <p className="text-xs text-muted-foreground">
            Click to insert a variable into your template
          </p>
        </div>
        <Tabs defaultValue={VARIABLE_NAMESPACES[0].name} className="w-full">
          <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent">
            {VARIABLE_NAMESPACES.map((ns) => (
              <TabsTrigger
                key={ns.name}
                value={ns.name}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent flex-1 text-xs py-2"
              >
                {ns.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {VARIABLE_NAMESPACES.map((ns) => (
            <TabsContent key={ns.name} value={ns.name} className="m-0">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-0.5">
                  {ns.variables.map((variable) => {
                    const varKey = `${ns.name}.${variable.key}`;
                    const isCopied = copiedKey === varKey;
                    return (
                      <div
                        key={variable.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleInsert(ns.name, variable.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleInsert(ns.name, variable.key);
                          }
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-md hover:bg-accent transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {variable.label}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                {`{{${varKey}}}`}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {variable.description}
                            </p>
                            {variable.example && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                                e.g., {variable.example}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => handleCopy(ns.name, variable.key, e)}
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
