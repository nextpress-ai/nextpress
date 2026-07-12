import React, { useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { IconReference } from "@/lib/icon-indexes";
import {
  ICON_SETS,
  getIconSetStorageKey,
} from "@/lib/icon-indexes/types";
import { LUCIDE_ICONS } from "@/lib/icon-indexes/lucide";
import { REACT_ICONS_SETS } from "@/lib/icon-indexes/react-icons";
import { SVGL_ICONS } from "@/lib/icon-indexes/svgl";
import { searchIconNames } from "@/lib/icon-indexes/fuzzy-icon-search";
import { IconRenderer } from "../blocks/shared/IconRenderer";
import {
  NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  truncateWithEllipsis,
} from "@/lib/truncate-with-ellipsis";

// ============================================================================
// TYPES
// ============================================================================

type IconSetOption = {
  storageKey: string;
  label: string;
  iconSet: IconReference["iconSet"];
  prefix?: string;
  names: readonly string[];
};

const RESULT_LIMIT = 72;
const BROWSE_PAGE_SIZE = 48;

const ICON_SET_OPTIONS: IconSetOption[] = [
  {
    storageKey: "lucide",
    label: "Lucide",
    iconSet: "lucide",
    names: LUCIDE_ICONS,
  },
  ...ICON_SETS.filter((set) => set.id === "react-icons").map((set) => ({
    storageKey: getIconSetStorageKey(set),
    label: set.label,
    iconSet: "react-icons" as const,
    prefix: set.prefix,
    names: REACT_ICONS_SETS[set.prefix] ?? [],
  })),
  {
    storageKey: "svgl",
    label: "Brands",
    iconSet: "svgl",
    names: SVGL_ICONS,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

type IconPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (icon: IconReference) => void;
  currentIcon?: IconReference;
};

export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentIcon,
}: IconPickerDialogProps) {
  const [search, setSearch] = React.useState("");
  const [browsePage, setBrowsePage] = React.useState(0);
  const [selectedSet, setSelectedSet] = React.useState(() =>
    currentIcon ? getStorageKey(currentIcon) : "lucide",
  );

  const syncFromCurrentIcon = useCallback(() => {
    setSelectedSet(currentIcon ? getStorageKey(currentIcon) : "lucide");
    setSearch(getInitialSearch(currentIcon));
    setBrowsePage(0);
  }, [currentIcon]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) syncFromCurrentIcon();
      onOpenChange(next);
    },
    [onOpenChange, syncFromCurrentIcon],
  );

  const activeSet = useMemo(
    () => ICON_SET_OPTIONS.find((set) => set.storageKey === selectedSet) ?? ICON_SET_OPTIONS[0],
    [selectedSet],
  );

  const searchHits = useMemo(
    () =>
      searchIconNames({
        names: activeSet.names,
        query: search,
        limit: RESULT_LIMIT,
      }),
    [activeSet.names, search],
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setBrowsePage(0);
  }, []);

  const handleSetChange = useCallback((setKey: string) => {
    setSelectedSet(setKey);
    setBrowsePage(0);
  }, []);

  const browseTotalPages = Math.max(
    1,
    Math.ceil(activeSet.names.length / BROWSE_PAGE_SIZE),
  );

  const browseSlice = useMemo(() => {
    const start = browsePage * BROWSE_PAGE_SIZE;
    return activeSet.names.slice(start, start + BROWSE_PAGE_SIZE);
  }, [activeSet.names, browsePage]);

  const handleSelect = useCallback(
    (iconName: string) => {
      const ref: IconReference = {
        iconSet: activeSet.iconSet,
        iconName: activeSet.prefix ? `${activeSet.prefix}:${iconName}` : iconName,
        size: currentIcon?.size ?? 24,
        color: currentIcon?.color ?? "currentColor",
        strokeWidth: currentIcon?.strokeWidth ?? 2,
      };
      onSelect(ref);
      onOpenChange(false);
    },
    [activeSet, currentIcon, onSelect, onOpenChange],
  );

  const trimmedSearch = search.trim();
  const hasSearch = trimmedSearch.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="space-y-1 border-b border-npb-border-subtle px-5 py-4">
          <DialogTitle className="text-base font-semibold">Choose icon</DialogTitle>
          <p className="text-xs text-npb-text-muted">
            Pick from the grid or search by name.
          </p>
        </DialogHeader>

        <div className="space-y-3 border-b border-npb-border-subtle px-5 py-3">
          <div className="flex items-center gap-2">
            <Select value={selectedSet} onValueChange={handleSetChange}>
              <SelectTrigger
                className={cn(
                  "h-9 w-[132px] shrink-0 rounded-md text-xs",
                  "npb-settings-select-trigger",
                )}
                aria-label="Icon set"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {ICON_SET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.storageKey} value={opt.storageKey} className="text-xs">
                    {opt.label}
                    <span className="ml-1 text-npb-text-muted">
                      ({opt.names.length.toLocaleString()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-npb-text-muted" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type icon name…"
                className="h-9 pl-9 text-sm"
                autoFocus={open}
                aria-label="Search icons by name"
              />
            </div>
          </div>

          {hasSearch ? (
            <p className="text-xs text-npb-text-muted">
              {searchHits.length.toLocaleString()} match
              {searchHits.length === 1 ? "" : "es"}
              {searchHits.length >= RESULT_LIMIT ? ` (top ${RESULT_LIMIT})` : ""}
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-npb-text-muted">
                {activeSet.names.length.toLocaleString()} icons in {activeSet.label}
              </p>
              {browseTotalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={browsePage <= 0}
                    onClick={() => setBrowsePage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-npb-border-default disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-npb-text-muted tabular-nums">
                    {browsePage + 1} / {browseTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={browsePage >= browseTotalPages - 1}
                    onClick={() =>
                      setBrowsePage((p) => Math.min(browseTotalPages - 1, p + 1))
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-npb-border-default disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <ScrollArea className="min-h-[280px] flex-1 px-5 py-3">
          {!hasSearch && browseSlice.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm text-npb-text-secondary">This set has no icons yet.</p>
            </div>
          ) : !hasSearch ? (
            <IconGrid
              iconNames={browseSlice}
              activeSet={activeSet}
              currentIcon={currentIcon}
              onSelect={handleSelect}
            />
          ) : searchHits.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm text-npb-text-secondary">No icons match &ldquo;{trimmedSearch}&rdquo;</p>
              <p className="text-xs text-npb-text-muted">
                Try a shorter name or switch the icon set.
              </p>
            </div>
          ) : (
            <IconGrid
              iconNames={searchHits.map((hit) => hit.name)}
              activeSet={activeSet}
              currentIcon={currentIcon}
              onSelect={handleSelect}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

type IconGridProps = {
  iconNames: readonly string[];
  activeSet: IconSetOption;
  currentIcon?: IconReference;
  onSelect: (iconName: string) => void;
};

function IconGrid({ iconNames, activeSet, currentIcon, onSelect }: IconGridProps) {
  return (
    <div className="grid grid-cols-6 gap-2 pb-2 sm:grid-cols-8">
      {iconNames.map((iconName) => {
        const storageName = activeSet.prefix
          ? `${activeSet.prefix}:${iconName}`
          : iconName;
        const isSelected = isSameIcon({
          current: currentIcon,
          iconSet: activeSet.iconSet,
          storageName,
        });
        const displayName = truncateWithEllipsis({
          text: iconName,
          maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
        });

        return (
          <button
            key={storageName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={cn(
              "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors",
              isSelected
                ? "bg-npb-interactive-bg-active ring-2 ring-npb-focus"
                : "border border-transparent hover:border-npb-border-default hover:bg-npb-interactive-bg-hover",
            )}
            title={storageName}
          >
            <IconRenderer
              icon={{
                iconSet: activeSet.iconSet,
                iconName: storageName,
                size: 20,
                color: "currentColor",
                strokeWidth: 2,
              }}
              size={20}
            />
            <span className="block w-full min-w-0 truncate text-center text-[10px] leading-tight text-npb-text-muted">
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStorageKey(icon: IconReference): string {
  if (icon.iconSet === "lucide") return "lucide";
  if (icon.iconSet === "svgl") return "svgl";
  if (icon.iconSet === "react-icons") {
    const colonIdx = icon.iconName.indexOf(":");
    if (colonIdx > -1) return `react-icons:${icon.iconName.slice(0, colonIdx)}`;
  }
  return "lucide";
}

function getInitialSearch(icon?: IconReference): string {
  if (!icon?.iconName) return "";
  const colonIdx = icon.iconName.indexOf(":");
  const raw = colonIdx > -1 ? icon.iconName.slice(colonIdx + 1) : icon.iconName;
  return raw.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function isSameIcon({
  current,
  iconSet,
  storageName,
}: {
  current?: IconReference;
  iconSet: IconReference["iconSet"];
  storageName: string;
}): boolean {
  if (!current) return false;
  return current.iconSet === iconSet && current.iconName === storageName;
}
