import { useEffect, useState, type JSX } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { useReorderList } from '@/hooks/use-reorder-list';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatContentStatus } from '@/lib/format-content-status';
import { movePageToMenuPosition } from '@/lib/page-menu-order';
import { cn } from '@/lib/utils';
import type { Page } from '@shared/schema-types';

type PageSiteMenuDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
};

type PagesMenuResponse = {
  pages: Page[];
};

type PageSiteMenuRowProps = {
  page: Page;
  position: number;
  positionCount: number;
  dragOver: boolean;
  onMoveToPosition: (pageId: string, targetPosition: number) => void;
  reorder: ReturnType<typeof useReorderList<Page>>;
};

function PageSiteMenuRow({
  page,
  position,
  positionCount,
  dragOver,
  onMoveToPosition,
  reorder,
}: PageSiteMenuRowProps): JSX.Element {
  return (
    <li
      draggable
      onDragStart={reorder.onDragStart(page.id)}
      onDragOver={reorder.onDragOver(page.id)}
      onDrop={reorder.onDrop(page.id)}
      onDragEnd={reorder.onDragEnd}
      className={cn(
        'flex flex-col gap-2 bg-npb-surface-base px-3 py-2.5 sm:flex-row sm:items-center',
        dragOver && 'bg-npb-accent/5',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-npb-surface-inset text-xs font-semibold tabular-nums text-npb-text-primary"
          aria-label={`Menu position ${position}`}
        >
          {position}
        </span>
        <span className="cursor-grab text-npb-text-muted" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-npb-text-primary">
          {page.title || 'Untitled'}
        </span>
        <Badge
          variant="outline"
          className={
            page.status === 'publish'
              ? 'border-npb-status-success/30 text-npb-status-success'
              : undefined
          }
        >
          {formatContentStatus(page.status ?? 'draft')}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pl-0 pl-10">
        <span className="text-xs font-medium text-npb-text-secondary whitespace-nowrap">
          Re-position to
        </span>
        <Select
          value={String(position)}
          onValueChange={(value) => onMoveToPosition(page.id, Number.parseInt(value, 10))}
        >
          <SelectTrigger
            className="h-8 w-[4.5rem] tabular-nums"
            aria-label={`Re-position ${page.title || 'Untitled'} to`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: positionCount }, (_, index) => {
              const slot = index + 1;
              return (
                <SelectItem key={slot} value={String(slot)}>
                  {slot}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}

/**
 * Arranges site navigation page order — separate from the pages content list.
 */
export function PageSiteMenuDialog({
  open,
  onOpenChange,
  siteId,
}: PageSiteMenuDialogProps): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const menuQueryKey = [
    '/api/pages',
    {
      status: 'any',
      page: 1,
      per_page: 100,
      siteId,
      sort: 'menuOrder',
      order: 'asc',
    },
  ];

  const { data, isLoading, error } = useQuery<PagesMenuResponse>({
    queryKey: menuQueryKey,
    enabled: open && !!siteId,
  });

  const [orderedPages, setOrderedPages] = useState<Page[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || !data?.pages) {
      return;
    }
    setOrderedPages(data.pages);
    setDirty(false);
  }, [data?.pages, open]);

  const applyOrder = (next: Page[]): void => {
    setOrderedPages(next);
    setDirty(true);
  };

  const handleMoveToPosition = (pageId: string, targetPosition: number): void => {
    applyOrder(
      movePageToMenuPosition({
        pages: orderedPages,
        pageId,
        targetPosition,
      }),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/pages/reorder', {
        siteId,
        items: orderedPages.map((page, index) => ({
          id: page.id,
          menuOrder: index,
        })),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site menu order saved.' });
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      setDirty(false);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not save menu order. Try again.',
        variant: 'destructive',
      });
    },
  });

  const reorder = useReorderList({
    items: orderedPages,
    enabled: open && orderedPages.length > 0,
    onReorder: async (items) => {
      const byId = new Map(orderedPages.map((page) => [page.id, page]));
      const next = items
        .sort((left, right) => left.menuOrder - right.menuOrder)
        .map((item) => byId.get(item.id))
        .filter((page): page is Page => !!page);
      applyOrder(next);
    },
  });

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && dirty) {
      setOrderedPages(data?.pages ?? []);
      setDirty(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Site menu</DialogTitle>
          <DialogDescription>
            Drag pages or pick a new position number to set your site navigation order. This does
            not change your pages list.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div role="status" className="py-8 text-center text-sm text-npb-text-muted">
            Loading pages…
          </div>
        ) : error ? (
          <div role="alert" className="py-8 text-center text-sm text-npb-text-muted">
            Could not load pages. Try again.
          </div>
        ) : orderedPages.length === 0 ? (
          <div className="py-8 text-center text-sm text-npb-text-muted">
            No pages yet. Create a page first, then return here to arrange your menu.
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto rounded-md border border-npb-border-strong divide-y divide-npb-divider">
            {orderedPages.map((page, index) => (
              <PageSiteMenuRow
                key={page.id}
                page={page}
                position={index + 1}
                positionCount={orderedPages.length}
                dragOver={reorder.dragOverId === page.id}
                onMoveToPosition={handleMoveToPosition}
                reorder={reorder}
              />
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="npb-btn-accent"
            disabled={!dirty || saveMutation.isPending || orderedPages.length === 0}
            onClick={() => saveMutation.mutate()}
          >
            Save menu order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
