import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VariablePicker } from "./VariablePicker";
import { ConditionBuilder } from "./ConditionBuilder";
import type { Template, DisplayCondition } from "@shared/schema-types";

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Template;
}

const TEMPLATE_TYPES = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "page", label: "Page" },
  { value: "post", label: "Post" },
  { value: "popup", label: "Popup" },
];

/** Extract display conditions from template settings */
function getDisplayConditions(template?: Template): DisplayCondition[] {
  if (!template?.settings) return [];
  const settings = template.settings as Record<string, unknown>;
  return (settings.displayConditions as DisplayCondition[]) ?? [];
}

/**
 * Modal for creating or editing templates.
 * Organized in two tabs: General (name, type, description) and Display Rules (conditions).
 * Uses key-based reset via formKey to sync state when initialData changes.
 */
export function TemplateModal({ open, onOpenChange, initialData }: TemplateModalProps) {
  // Key-based reset: derive a stable key from initialData to reset form state
  const formKey = initialData?.id ?? "__create__";
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [displayConditions, setDisplayConditions] = useState<DisplayCondition[]>(
    getDisplayConditions(initialData),
  );
  const [prevKey, setPrevKey] = useState(formKey);

  // Sync form state when switching between templates (derived state pattern)
  if (prevKey !== formKey) {
    setPrevKey(formKey);
    setName(initialData?.name || "");
    setType(initialData?.type || "");
    setDescription(initialData?.description || "");
    setDisplayConditions(getDisplayConditions(initialData));
  }

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      type: string;
      description?: string;
      settings?: Record<string, unknown>;
    }) => {
      if (isEdit && initialData) {
        return await apiRequest("PUT", `/api/templates/${initialData.id}`, data);
      }
      return await apiRequest("POST", "/api/templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: isEdit
          ? "Template updated successfully"
          : "Template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEdit
          ? "Failed to update template"
          : "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!type) {
      toast({
        title: "Validation Error",
        description: "Template type is required",
        variant: "destructive",
      });
      return;
    }

    // Build settings with display conditions
    const existingSettings = (initialData?.settings as Record<string, unknown>) ?? {};
    const settings: Record<string, unknown> = { ...existingSettings };
    if (displayConditions.length > 0) {
      settings.displayConditions = displayConditions;
    } else {
      delete settings.displayConditions;
    }

    mutation.mutate({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    });
  };

  const handleClose = () => {
    setName(initialData?.name || "");
    setType(initialData?.type || "");
    setDescription(initialData?.description || "");
    setDisplayConditions(getDisplayConditions(initialData));
    onOpenChange(false);
  };

  /** Insert a variable tag at the end of the description field */
  const handleVariableInsert = (variable: string) => {
    setDescription((prev) => prev + variable);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the template details and display rules."
                : "Enter the details for your new template."}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">
                General
              </TabsTrigger>
              <TabsTrigger value="display-rules" className="flex-1">
                Display Rules
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Template name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <VariablePicker onInsert={handleVariableInsert} />
                </div>
                <Textarea
                  id="description"
                  placeholder="Optional description. Use {{namespace.field}} for dynamic content."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use the Variables button to insert dynamic content like{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {`{{site.title}}`}
                  </code>
                </p>
              </div>
            </TabsContent>

            {/* Display Rules Tab */}
            <TabsContent value="display-rules" className="py-4">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3 pr-3">
                  <div>
                    <Label>Display Rules</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Control where this template appears. Add conditions to
                      show or hide the template based on page type, user status,
                      or URL.
                    </p>
                  </div>
                  <ConditionBuilder
                    conditions={displayConditions}
                    onChange={setDisplayConditions}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-npb-accent hover:bg-npb-accent-hover text-white"
            >
              {mutation.isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
