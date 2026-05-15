import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import type { DisplayCondition, ConditionTypeDefinitionUI } from "@shared/schema-types";

/** All available condition types for the UI builder */
const CONDITION_TYPES: ConditionTypeDefinitionUI[] = [
  {
    type: "is_home",
    label: "Is Homepage",
    description: "Show on the site homepage",
    hasValue: false,
  },
  {
    type: "is_single",
    label: "Is Single Post",
    description: "Show on individual post pages",
    hasValue: false,
  },
  {
    type: "is_page",
    label: "Is Page",
    description: "Show on page type content",
    hasValue: false,
  },
  {
    type: "is_archive",
    label: "Is Archive",
    description: "Show on archive or listing pages",
    hasValue: false,
  },
  {
    type: "is_404",
    label: "Is 404 Page",
    description: "Show on not-found pages",
    hasValue: false,
  },
  {
    type: "is_logged_in",
    label: "User Is Logged In",
    description: "Show for authenticated users",
    hasValue: false,
  },
  {
    type: "is_logged_out",
    label: "User Is Logged Out",
    description: "Show for guest visitors",
    hasValue: false,
  },
  {
    type: "post_in_category",
    label: "Post In Category",
    description: "Show if post belongs to a category",
    hasValue: true,
    valueType: "text",
  },
  {
    type: "post_has_tag",
    label: "Post Has Tag",
    description: "Show if post has a specific tag",
    hasValue: true,
    valueType: "text",
  },
  {
    type: "page_slug",
    label: "Page Slug Is",
    description: "Show on a specific page by slug",
    hasValue: true,
    valueType: "text",
  },
  {
    type: "url_contains",
    label: "URL Contains",
    description: "Show if URL contains a path",
    hasValue: true,
    valueType: "text",
  },
  {
    type: "user_role",
    label: "User Has Role",
    description: "Show for users with a specific role",
    hasValue: true,
    valueType: "text",
  },
  {
    type: "device_type",
    label: "Device Type",
    description: "Show on a specific device type",
    hasValue: true,
    valueType: "select",
    valueOptions: [
      { value: "mobile", label: "Mobile" },
      { value: "desktop", label: "Desktop" },
      { value: "tablet", label: "Tablet" },
    ],
  },
];

interface ConditionBuilderProps {
  /** Current conditions */
  conditions: DisplayCondition[];
  /** Called when conditions change */
  onChange: (conditions: DisplayCondition[]) => void;
}

/**
 * ConditionBuilder — visual builder for display conditions.
 * Each row has a condition type dropdown, operator toggle, optional value input,
 * and a delete button. Rows are combined with AND/OR logic.
 */
export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    const newCondition: DisplayCondition = {
      id: nanoid(),
      type: "is_home",
      operator: "is",
      logic: conditions.length > 0 ? "and" : undefined,
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<DisplayCondition>) => {
    onChange(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeCondition = (id: string) => {
    const filtered = conditions.filter((c) => c.id !== id);
    // Fix logic on the first remaining condition (it shouldn't have logic)
    if (filtered.length > 0) {
      filtered[0] = { ...filtered[0], logic: undefined };
    }
    onChange(filtered);
  };

  const toggleLogic = (id: string) => {
    const condition = conditions.find((c) => c.id === id);
    if (!condition) return;
    updateCondition(id, {
      logic: condition.logic === "or" ? "and" : "or",
    });
  };

  const getConditionDef = (type: string) =>
    CONDITION_TYPES.find((ct) => ct.type === type);

  if (conditions.length === 0) {
    return (
      <div className="npb-condition-builder space-y-3">
        <p className="npb-settings-hint-muted-fallback text-sm">
          No display rules set. This template will show on all pages.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          className={cn("gap-1.5", "npb-settings-btn-outline")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Condition
        </Button>
      </div>
    );
  }

  return (
    <div className="npb-condition-builder space-y-3">
      <div className="space-y-2">
        {conditions.map((condition, index) => {
          const def = getConditionDef(condition.type);
          const showLogicToggle = index > 0;

          return (
            <div key={condition.id} className="space-y-1.5">
              {showLogicToggle && (
                <div className="flex items-center gap-2 pl-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="npb-settings-btn-ghost h-6 px-2 text-xs font-medium"
                    onClick={() => toggleLogic(condition.id)}
                  >
                    <Badge
                      variant={condition.logic === "or" ? "default" : "secondary"}
                      className="text-[10px] px-2 py-0"
                    >
                      {condition.logic === "or" ? "OR" : "AND"}
                    </Badge>
                  </Button>
                  <div className="npb-settings-rule-h" />
                </div>
              )}

              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    {/* Condition type selector */}
                    <Select
                      value={condition.type}
                      onValueChange={(value) => {
                        const newDef = getConditionDef(value);
                        updateCondition(condition.id, {
                          type: value,
                          value: newDef?.hasValue ? condition.value : undefined,
                        });
                      }}
                    >
                      <SelectTrigger className={cn("flex-1", "npb-settings-select-trigger")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_TYPES.map((ct) => (
                          <SelectItem key={ct.type} value={ct.type}>
                            <div className="flex flex-col">
                              <span>{ct.label}</span>
                              <span className="npb-settings-hint-muted-fallback text-xs">
                                {ct.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator toggle */}
                    <Select
                      value={condition.operator}
                      onValueChange={(value: "is" | "is_not") =>
                        updateCondition(condition.id, { operator: value })
                      }
                    >
                      <SelectTrigger className={cn("w-24", "npb-settings-select-trigger")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="is">is</SelectItem>
                        <SelectItem value="is_not">is not</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value input (if condition needs a value) */}
                  {def?.hasValue && (
                    <div className="pl-0">
                      {def.valueType === "select" && def.valueOptions ? (
                        <Select
                          value={condition.value ?? ""}
                          onValueChange={(value) =>
                            updateCondition(condition.id, { value })
                          }
                        >
                          <SelectTrigger className="npb-settings-select-trigger">
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            {def.valueOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Enter value..."
                          value={condition.value ?? ""}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              value: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="npb-settings-btn-ghost npb-settings-btn-ghost--danger h-9 w-9 shrink-0"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        className={cn("gap-1.5", "npb-settings-btn-outline")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Condition
      </Button>
    </div>
  );
}
