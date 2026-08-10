import { useCallback, useState } from 'react';

type ReorderItem = {
  id: string;
};

type UseReorderListParams<T extends ReorderItem> = {
  items: T[];
  enabled: boolean;
  onReorder: (items: Array<{ id: string; menuOrder: number }>) => Promise<void>;
};

type UseReorderListResult = {
  dragOverId: string | null;
  onDragStart: (id: string) => (event: React.DragEvent) => void;
  onDragOver: (id: string) => (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (id: string) => (event: React.DragEvent) => void;
};

/**
 * Native HTML5 reorder for admin lists when manual order sorting is active.
 */
export function useReorderList<T extends ReorderItem>({
  items,
  enabled,
  onReorder,
}: UseReorderListParams<T>): UseReorderListResult {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDragStart = useCallback(
    (id: string) => (event: React.DragEvent) => {
      if (!enabled) return;
      setDraggingId(id);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    },
    [enabled],
  );

  const onDragOver = useCallback(
    (id: string) => (event: React.DragEvent) => {
      if (!enabled || !draggingId || draggingId === id) return;
      event.preventDefault();
      setDragOverId(id);
    },
    [draggingId, enabled],
  );

  const onDrop = useCallback(
    (targetId: string) => async (event: React.DragEvent) => {
      event.preventDefault();
      if (!enabled || !draggingId || draggingId === targetId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }

      const fromIndex = items.findIndex((item) => item.id === draggingId);
      const toIndex = items.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }

      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      await onReorder(next.map((item, index) => ({ id: item.id, menuOrder: index })));

      setDraggingId(null);
      setDragOverId(null);
    },
    [draggingId, enabled, items, onReorder],
  );

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  return {
    dragOverId,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
  };
}
