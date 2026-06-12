import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { IconReference } from '@/lib/icon-indexes';
import { LUCIDE_ICONS } from '@/lib/icon-indexes/lucide';
import { REACT_ICONS_SETS } from '@/lib/icon-indexes/react-icons';
import { SVGL_ICONS } from '@/lib/icon-indexes/svgl';
import { IconRenderer } from '../blocks/shared/IconRenderer';
import {
  NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  truncateWithEllipsis,
} from '@/lib/truncate-with-ellipsis';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 60;

interface IconSetOption {
  id: string;
  label: string;
  storageKey: string;
  iconSet: 'lucide' | 'react-icons' | 'svgl';
  prefix?: string;
  names: string[];
}

const ICON_SET_OPTIONS: IconSetOption[] = [
  {
    id: 'lucide',
    label: 'Lucide',
    storageKey: 'lucide',
    iconSet: 'lucide',
    names: LUCIDE_ICONS,
  },
  ...Object.entries(REACT_ICONS_SETS).map(([prefix, names]) => ({
    id: `react-icons:${prefix}`,
    label: `react-icons / ${prefix}`,
    storageKey: `react-icons:${prefix}`,
    iconSet: 'react-icons' as const,
    prefix,
    names,
  })),
  {
    id: 'svgl',
    label: 'Brands (SVGL)',
    storageKey: 'svgl',
    iconSet: 'svgl',
    names: SVGL_ICONS,
  },
];

function formatIconSetOptionLabel(opt: IconSetOption): string {
  if (opt.iconSet === "lucide") return `Lucide (${opt.names.length.toLocaleString()})`;
  if (opt.iconSet === "svgl") return `Brands / SVGL (${opt.names.length.toLocaleString()})`;
  if (opt.prefix)
    return `react-icons / ${opt.prefix} (${opt.names.length.toLocaleString()})`;
  return opt.label;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (icon: IconReference) => void;
  currentIcon?: IconReference;
}

export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentIcon,
}: IconPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>(
    currentIcon ? getStorageKey(currentIcon) : 'lucide'
  );
  const [page, setPage] = useState(0);

  // Find active set
  const activeSet = useMemo(
    () => ICON_SET_OPTIONS.find((s) => s.storageKey === selectedSet) || ICON_SET_OPTIONS[0],
    [selectedSet]
  );

  // Filter icons by search
  const filteredNames = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return activeSet.names;
    return activeSet.names.filter((name) => name.toLowerCase().includes(query));
  }, [activeSet, search]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredNames.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageNames = filteredNames.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when search or set changes
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleSetChange = useCallback((setKey: string) => {
    setSelectedSet(setKey);
    setPage(0);
  }, []);

  const handleSelect = useCallback(
    (iconName: string) => {
      const ref: IconReference = {
        iconSet: activeSet.iconSet,
        iconName: activeSet.prefix ? `${activeSet.prefix}:${iconName}` : iconName,
        size: currentIcon?.size || 24,
        color: currentIcon?.color || 'currentColor',
        strokeWidth: currentIcon?.strokeWidth || 2,
      };
      onSelect(ref);
      onOpenChange(false);
    },
    [activeSet, currentIcon, onSelect, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>

        {/* Search + Set Selector */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search icons..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={selectedSet} onValueChange={handleSetChange}>
            <SelectTrigger
              className={cn(
                "h-9 min-w-[180px] shrink-0 rounded-md text-sm",
                "npb-settings-select-trigger",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_SET_OPTIONS.map((opt) => (
                <SelectItem key={opt.storageKey} value={opt.storageKey}>
                  {formatIconSetOptionLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-500 mb-2">
          {filteredNames.length.toLocaleString()} icons
          {search ? ` matching "${search}"` : ''}
        </p>

        {/* Icon Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-8 gap-2 p-1">
            {pageNames.map((iconName) => {
              const isSelected =
                currentIcon?.iconName === iconName ||
                currentIcon?.iconName === `${activeSet.prefix}:${iconName}`;
              const storageName = activeSet.prefix
                ? `${activeSet.prefix}:${iconName}`
                : iconName;
              const displayName = truncateWithEllipsis({
                text: storageName,
                maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
              });
              return (
                <button
                  key={iconName}
                  onClick={() => handleSelect(iconName)}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-md transition-colors
                    gap-1 min-h-[60px]
                    ${
                      isSelected
                        ? 'bg-blue-100 ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 border border-transparent hover:border-gray-200'
                    }
                  `}
                  title={storageName}
                >
                  <IconRenderer
                    icon={{
                      iconSet: activeSet.iconSet,
                      iconName: storageName,
                      size: 20,
                      color: 'currentColor',
                      strokeWidth: 2,
                    }}
                    size={20}
                  />
                  <span className="block min-w-0 w-full text-center text-xs leading-tight text-gray-500 truncate">
                    {displayName}
                  </span>
                </button>
              );
            })}
          </div>

          {pageNames.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              No icons found
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStorageKey(icon: IconReference): string {
  if (icon.iconSet === 'lucide') return 'lucide';
  if (icon.iconSet === 'svgl') return 'svgl';
  if (icon.iconSet === 'react-icons') {
    const colonIdx = icon.iconName.indexOf(':');
    if (colonIdx > -1) return `react-icons:${icon.iconName.slice(0, colonIdx)}`;
  }
  return 'lucide';
}
