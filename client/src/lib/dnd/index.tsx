import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Public types compatible with previous library usage
export interface DropLocation {
  droppableId: string;
  index: number;
}

export interface DropResult {
  draggableId: string;
  source: DropLocation;
  destination: DropLocation | null;
  reason: 'DROP' | 'CANCEL';
  mode?: 'FLUID' | 'SNAP';
  type?: string;
  combine?: any;
}

type DroppableDirection = 'horizontal' | 'vertical';

type RegisteredDroppable = {
  element: HTMLElement;
  direction: DroppableDirection;
  isDropDisabled: boolean;
};

type DragDropContextProps = {
  children: React.ReactNode;
  onDragEnd: (result: DropResult) => void;
  onDragStart?: () => void;
  renderOverlay?: (data: { id: string }) => React.ReactNode;
};

type InternalDragState = {
  draggingId: string | null;
  sourceDroppableId: string | null;
  sourceIndex: number | null;
};

type DndRegistry = {
  droppables: Map<string, RegisteredDroppable>;
};

const DndContext = createContext<{
  registerDroppable: (
    id: string,
    el: HTMLElement | null,
    options?: {
      direction?: DroppableDirection;
      isDropDisabled?: boolean;
    },
  ) => void;
  getDroppableState: (id: string) => {
    direction: DroppableDirection;
    isDropDisabled: boolean;
  } | null;
  onDragStart: (draggableId: string, droppableId: string, index: number) => void;
  onDragEnd: (destination: DropLocation | null) => void;
  finalizeDrag: (meta: { id: string; source: string; index: number }, destination: DropLocation | null) => void;
  isDraggingOver: (droppableId: string) => boolean;
  currentDrag: InternalDragState;
  setOver: (droppableId: string | null, index: number) => void;
  getOverIndex: (droppableId: string) => number;
  getOver: () => { id: string | null; index: number };
  wasDropCommitted: () => boolean;
  clearDropCommitted: () => void;
  showOverlay: (data: { id: string; x: number; y: number }) => void;
  updateOverlay: (coords: { x: number; y: number }) => void;
  clearOverlay: () => void;
}>({
  registerDroppable: () => {},
  getDroppableState: () => null,
  onDragStart: () => {},
  onDragEnd: () => {},
  finalizeDrag: () => {},
  isDraggingOver: () => false,
  currentDrag: { draggingId: null, sourceDroppableId: null, sourceIndex: null },
  setOver: () => {},
  getOverIndex: () => -1,
  getOver: () => ({ id: null, index: -1 }),
  wasDropCommitted: () => false,
  clearDropCommitted: () => {},
  showOverlay: () => {},
  updateOverlay: () => {},
  clearOverlay: () => {},
});

export function DragDropContext({ children, onDragEnd, onDragStart, renderOverlay }: DragDropContextProps) {
  const registryRef = useRef<DndRegistry>({ droppables: new Map() });
  const [dragState, setDragState] = useState<InternalDragState>({ draggingId: null, sourceDroppableId: null, sourceIndex: null });
  const [overState, setOverState] = useState<{ id: string | null; index: number }>({ id: null, index: -1 });
  const [overlay, setOverlay] = useState<{ id: string | null; x: number; y: number; visible: boolean }>({ id: null, x: 0, y: 0, visible: false });
  const committedRef = useRef<boolean>(false);

  const registerDroppable = useCallback((
    id: string,
    el: HTMLElement | null,
    options?: {
      direction?: DroppableDirection;
      isDropDisabled?: boolean;
    },
  ) => {
    const registry = registryRef.current;
    if (el) {
      registry.droppables.set(id, {
        element: el,
        direction: options?.direction ?? 'vertical',
        isDropDisabled: options?.isDropDisabled ?? false,
      });
    } else {
      registry.droppables.delete(id);
    }
  }, []);

  const getDroppableState = useCallback((id: string) => {
    const registered = registryRef.current.droppables.get(id);
    if (!registered) return null;
    return {
      direction: registered.direction,
      isDropDisabled: registered.isDropDisabled,
    };
  }, []);

  const ctxOnDragStart = useCallback((draggableId: string, droppableId: string, index: number) => {
    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] ctxOnDragStart', { draggableId, droppableId, index });
    if (dragState.draggingId) return;
    setDragState({ draggingId: draggableId, sourceDroppableId: droppableId, sourceIndex: index });
    try { onDragStart?.(); } catch (e) { console.warn('[DND] onDragStart callback errored:', e); }
  }, [onDragStart, dragState.draggingId]);

  const ctxOnDragEnd = useCallback((destination: DropLocation | null) => {
    const result: DropResult = {
      draggableId: dragState.draggingId || '',
      source: { droppableId: dragState.sourceDroppableId || 'unknown-source', index: dragState.sourceIndex ?? 0 },
      destination,
      reason: destination ? 'DROP' : 'CANCEL',
      mode: 'FLUID',
      type: 'DEFAULT',
      combine: null,
    };

    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] ctxOnDragEnd building result', result);

    setOverState({ id: null, index: -1 });
    setDragState({ draggingId: null, sourceDroppableId: null, sourceIndex: null });

    if (destination) committedRef.current = true;
    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] ctxOnDragEnd → onDragEnd(result)', result);
    try { onDragEnd(result); } catch (e) { console.warn('[DND] onDragEnd callback errored:', e); }
  }, [onDragEnd, dragState]);

  const isDraggingOver = useCallback((droppableId: string) => overState.id === droppableId, [overState]);
  const setOver = useCallback((droppableId: string | null, index: number) => {
    setOverState({ id: droppableId, index });
  }, []);
  const getOverIndex = useCallback((droppableId: string) => (overState.id === droppableId ? overState.index : -1), [overState]);

  const finalizeDrag = useCallback((meta: { id: string; source: string; index: number }, destination: DropLocation | null) => {
    const result: DropResult = {
      draggableId: meta?.id || '',
      source: { droppableId: meta?.source || 'unknown-source', index: meta?.index ?? 0 },
      destination,
      reason: destination ? 'DROP' : 'CANCEL',
      mode: 'FLUID',
      type: 'DEFAULT',
      combine: null,
    };
    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] finalizeDrag → onDragEnd(result)', result);
    setOverState({ id: null, index: -1 });
    setDragState({ draggingId: null, sourceDroppableId: null, sourceIndex: null });
    setOverlay({ id: null, x: 0, y: 0, visible: false });
    if (destination) committedRef.current = true;
    try { onDragEnd(result); } catch (e) { console.warn('[DND] onDragEnd callback errored:', e); }
  }, [onDragEnd]);

  const showOverlay = useCallback((data: { id: string; x: number; y: number }) => {
    setOverlay({ id: data.id, x: data.x, y: data.y, visible: true });
  }, []);
  const updateOverlay = useCallback((coords: { x: number; y: number }) => {
    setOverlay((prev) => ({ ...prev, x: coords.x, y: coords.y }));
  }, []);
  const clearOverlay = useCallback(() => {
    setOverlay({ id: null, x: 0, y: 0, visible: false });
  }, []);

  const value = useMemo(() => ({
    registerDroppable,
    getDroppableState,
    onDragStart: ctxOnDragStart,
    onDragEnd: ctxOnDragEnd,
    finalizeDrag,
    isDraggingOver,
    currentDrag: dragState,
    setOver,
    getOverIndex,
    getOver: () => overState,
    wasDropCommitted: () => committedRef.current,
    clearDropCommitted: () => { committedRef.current = false; },
    showOverlay,
    updateOverlay,
    clearOverlay,
  }), [registerDroppable, getDroppableState, ctxOnDragStart, ctxOnDragEnd, finalizeDrag, isDraggingOver, dragState, overState, setOver, getOverIndex, showOverlay, updateOverlay, clearOverlay]);

  return (
    <DndContext.Provider value={value}>
      {children}
      {overlay.visible && overlay.id ? (
        <div
          style={{
            position: 'fixed',
            left: overlay.x + 12,
            top: overlay.y + 12,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {renderOverlay ? (
            renderOverlay({ id: overlay.id })
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #e5e7eb',
              padding: '6px 8px',
              borderRadius: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              color: '#374151',
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ opacity: 0.85 }}>{overlay.id}</span>
            </div>
          )}
        </div>
      ) : null}
    </DndContext.Provider>
  );
}

// Droppable component
export interface DroppableProvided {
  innerRef: (element: HTMLElement | null) => void;
  droppableProps: {
    'data-rfd-droppable-id': string;
  };
  placeholder: React.ReactNode;
}

export interface DroppableStateSnapshot {
  isDraggingOver: boolean;
  draggingOverWith: string | null;
  draggingFromThisWith: string | null;
  isUsingPlaceholder: boolean;
  /** Insertion index where the dragged block would land, or -1 when not over. */
  placeholderIndex: number;
}

export interface DroppableProps {
  droppableId: string;
  children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  isDropDisabled?: boolean;
  type?: string;
}

export function Droppable({ droppableId, children, direction = 'vertical', isDropDisabled = false }: DroppableProps) {
  const context = useContext(DndContext);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      context.registerDroppable(droppableId, elementRef.current, {
        direction,
        isDropDisabled,
      });
    }
    return () => {
      context.registerDroppable(droppableId, null);
    };
  }, [droppableId, direction, isDropDisabled, context]);

  const provided: DroppableProvided = {
    innerRef: (el: HTMLElement | null) => {
      elementRef.current = el;
      if (el) {
        context.registerDroppable(droppableId, el, {
          direction,
          isDropDisabled,
        });
      }
    },
    droppableProps: {
      'data-rfd-droppable-id': droppableId,
    },
    placeholder: null,
  };

  const isOver = context.isDraggingOver(droppableId);
  const snapshot: DroppableStateSnapshot = {
    isDraggingOver: isOver,
    draggingOverWith: isOver ? context.currentDrag.draggingId : null,
    draggingFromThisWith: context.currentDrag.sourceDroppableId === droppableId ? context.currentDrag.draggingId : null,
    isUsingPlaceholder: false,
    placeholderIndex: isOver ? context.getOverIndex(droppableId) : -1,
  };

  return <>{children(provided, snapshot)}</>;
}

// ---------------------------------------------------------------------------
// Auto-scroll while dragging near a scroll container's edges.
// ---------------------------------------------------------------------------
const AUTO_SCROLL_EDGE = 80; // px from edge that triggers scrolling
const AUTO_SCROLL_SPEED = 14; // px per animation frame

/** Nearest scrollable ancestor (vertical) of `el`, or null to fall back to window. */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Scrolls the container (or window) when the pointer sits near the top/bottom edge. */
function performAutoScroll(clientX: number, clientY: number) {
  const pointEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const scrollable = findScrollableAncestor(pointEl);
  if (scrollable) {
    const rect = scrollable.getBoundingClientRect();
    if (clientY < rect.top + AUTO_SCROLL_EDGE) {
      scrollable.scrollTop -= AUTO_SCROLL_SPEED;
    } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE) {
      scrollable.scrollTop += AUTO_SCROLL_SPEED;
    }
    return;
  }
  const vh = window.innerHeight;
  if (clientY < AUTO_SCROLL_EDGE) {
    window.scrollBy(0, -AUTO_SCROLL_SPEED);
  } else if (clientY > vh - AUTO_SCROLL_EDGE) {
    window.scrollBy(0, AUTO_SCROLL_SPEED);
  }
}

/**
 * Drop placeholder bar: a visual insertion indicator rendered by Droppable
 * consumers at `snapshot.placeholderIndex` while a block is dragged over them.
 */
export function DropPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="my-1 h-12 w-full rounded border-2 border-dashed border-npb-accent bg-npb-accent/10"
    />
  );
}

/**
 * Draggable elements that belong directly to `droppableEl`, excluding nested
 * droppable descendants (e.g. blocks inside a group on the root canvas).
 */
export function getDirectDraggablesInDroppable(droppableEl: HTMLElement): HTMLElement[] {
  const all = Array.from(
    droppableEl.querySelectorAll('[data-rfd-draggable-id]'),
  ) as HTMLElement[];
  return all.filter((el) => {
    let parent = el.parentElement;
    while (parent && parent !== droppableEl) {
      if (parent.hasAttribute('data-rfd-droppable-id')) {
        return false;
      }
      parent = parent.parentElement;
    }
    return parent === droppableEl;
  });
}

function getInsertionIndex({
  draggables,
  direction,
  clientX,
  clientY,
}: {
  draggables: HTMLElement[];
  direction: DroppableDirection;
  clientX: number;
  clientY: number;
}): number {
  const pointerPosition = direction === 'horizontal' ? clientX : clientY;

  for (let index = 0; index < draggables.length; index += 1) {
    const rect = draggables[index].getBoundingClientRect();
    const midpoint =
      direction === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
    if (pointerPosition < midpoint) return index;
  }

  return draggables.length;
}

// Draggable component
export interface DraggableProvided {
  innerRef: (element: HTMLElement | null) => void;
  draggableProps: {
    'data-rfd-draggable-id': string;
    style?: React.CSSProperties;
  };
  dragHandleProps: {
    'data-rfd-drag-handle-draggable-id': string;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  } | null;
}

export interface DraggableStateSnapshot {
  isDragging: boolean;
  isDropAnimating: boolean;
  draggingOver: string | null;
  combineWith: string | null;
  combineTargetFor: string | null;
  mode: 'FLUID' | 'SNAP' | null;
}

export interface DraggableProps {
  draggableId: string;
  index: number;
  children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactNode;
  isDragDisabled?: boolean;
}

export function Draggable({ draggableId, index, children, isDragDisabled = false }: DraggableProps) {
  const context = useContext(DndContext);
  const elementRef = useRef<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragMetaRef = useRef<{ id: string; source: string; index: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDragDisabled) return;

    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] Draggable.handleDragStart', {
      draggableId,
      index,
      type: (e as any)?.type,
      target: (e.target as HTMLElement)?.tagName,
    });

    e.stopPropagation();
    // Prevent browser text selection initiation (mouse and touch)
    e.preventDefault();
    setIsDragging(true);

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('npb-dragging');
    }

    const getPoint = (evt: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in evt && evt.touches.length > 0) {
        return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
      }
      const m = evt as React.MouseEvent;
      return { x: m.clientX, y: m.clientY };
    };

    const startPoint = getPoint(e);

    // Auto-scroll: run a frame loop that scrolls the active container when the
    // pointer hovers near its top/bottom edge (works even when the cursor is
    // held still at the edge, unlike a move-only handler).
    let latestPoint = startPoint;
    let autoScrollRaf: number | null = null;
    const autoScrollTick = () => {
      performAutoScroll(latestPoint.x, latestPoint.y);
      autoScrollRaf = requestAnimationFrame(autoScrollTick);
    };
    autoScrollRaf = requestAnimationFrame(autoScrollTick);

    // Resolve source droppable
    let parent = elementRef.current?.parentElement;
    while (parent && !parent.hasAttribute('data-rfd-droppable-id')) {
      parent = parent.parentElement;
    }
    const sourceDroppableId = parent?.getAttribute('data-rfd-droppable-id') || 'unknown';
    dragMetaRef.current = { id: draggableId, source: sourceDroppableId, index };

    // show overlay with starting position
    context.showOverlay({ id: draggableId, x: startPoint.x, y: startPoint.y });

    if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] Draggable.start → parent droppable', { sourceDroppableId });
    context.onDragStart(draggableId, sourceDroppableId, index);

    const computeDroppableAtPoint = (clientX: number, clientY: number) => {
      const elementUnder = document.elementFromPoint(clientX, clientY);
      let droppableUnder = elementUnder as HTMLElement | null;
      while (droppableUnder && !droppableUnder.hasAttribute('data-rfd-droppable-id')) {
        droppableUnder = droppableUnder.parentElement as HTMLElement | null;
      }
      const underId = droppableUnder?.getAttribute('data-rfd-droppable-id') || null;
      const droppableState = underId
        ? context.getDroppableState(underId)
        : null;
      if (droppableState?.isDropDisabled) {
        return {
          droppableUnder: null,
          underId: null,
          direction: droppableState.direction,
        };
      }
      return {
        droppableUnder,
        underId,
        direction: droppableState?.direction ?? 'vertical',
      };
    };

    // Handle drag move
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if ('touches' in moveEvent) {
        (moveEvent as TouchEvent).preventDefault();
      }
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      latestPoint = { x: clientX, y: clientY };
      context.updateOverlay({ x: clientX, y: clientY });
      const { droppableUnder, underId, direction } = computeDroppableAtPoint(clientX, clientY);
      if (import.meta.env?.DEBUG_BUILDER) {
        console.log('[DND] move', { clientX, clientY, underId });
      }

      if (underId && droppableUnder) {
        const draggables = getDirectDraggablesInDroppable(droppableUnder);
        const targetIndex = getInsertionIndex({
          draggables,
          direction,
          clientX,
          clientY,
        });
        if (import.meta.env?.DEBUG_BUILDER) {
          console.log('[DND] setOver', { underId, targetIndex, directCount: draggables.length });
        }
        context.setOver(underId, targetIndex);
      } else if (!underId) {
        if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] move.null-droppable');
        context.setOver(null, -1);
      }
    };

    // Handle drag end (recompute destination)
    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      setIsDragging(false);

      if (autoScrollRaf !== null) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }

      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('npb-dragging');
      }

      context.clearOverlay();

      let clientX: number;
      let clientY: number;
      if ('changedTouches' in endEvent && endEvent.changedTouches.length > 0) {
        clientX = endEvent.changedTouches[0].clientX;
        clientY = endEvent.changedTouches[0].clientY;
      } else if ('touches' in endEvent && endEvent.touches.length > 0) {
        clientX = endEvent.touches[0].clientX;
        clientY = endEvent.touches[0].clientY;
      } else {
        clientX = (endEvent as MouseEvent).clientX;
        clientY = (endEvent as MouseEvent).clientY;
      }

      const { droppableUnder, underId, direction } = computeDroppableAtPoint(clientX, clientY);
      const storedOver = context.getOver();
      if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] end.recompute', { clientX, clientY, underId, storedOver });

      let finalDestination: DropLocation | null = null;
      if (underId && droppableUnder) {
        const draggables = getDirectDraggablesInDroppable(droppableUnder);
        const targetIndex = getInsertionIndex({
          draggables,
          direction,
          clientX,
          clientY,
        });
        finalDestination = { droppableId: underId, index: targetIndex };
      } else if (
        storedOver.id &&
        storedOver.index !== -1 &&
        !context.getDroppableState(storedOver.id)?.isDropDisabled
      ) {
        finalDestination = { droppableId: storedOver.id, index: storedOver.index };
      }

      if (!finalDestination && storedOver.id) {
        if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] end.mismatch', { recomputed: underId, storedOver });
      }

      const meta = dragMetaRef.current;
      if (!meta) {
        console.warn('[DND] end.without-meta');
        context.finalizeDrag({ id: '', source: 'unknown-source', index: 0 }, null);
      } else if (finalDestination) {
        if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] end.finalDestination', finalDestination, 'meta', meta);
        context.finalizeDrag(meta, finalDestination);
      } else {
        if (import.meta.env?.DEBUG_BUILDER) console.log('[DND] end.cancel', 'meta', meta);
        context.finalizeDrag(meta, null);
      }

      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd as any);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd as any);
      document.removeEventListener('touchcancel', handleEnd as any);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd as any);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd as any);
    document.addEventListener('touchcancel', handleEnd as any);
  }, [draggableId, index, isDragDisabled, context]);

  const provided: DraggableProvided = {
    innerRef: (el: HTMLElement | null) => {
      elementRef.current = el;
    },
    draggableProps: {
      'data-rfd-draggable-id': draggableId,
      style: isDragging ? { opacity: 0.5 } : undefined,
      // NOTE: onMouseDown/onTouchStart intentionally omitted from draggableProps.
      // Drag is initiated only via dragHandleProps (the grip icon) so that
      // contentEditable elements and other interactive content inside blocks
      // can receive focus and handle clicks normally.
    },
    dragHandleProps: isDragDisabled ? null : {
      'data-rfd-drag-handle-draggable-id': draggableId,
      onMouseDown: handleDragStart,
      onTouchStart: handleDragStart,
    },
  };

  const snapshot: DraggableStateSnapshot = {
    isDragging,
    isDropAnimating: false,
    draggingOver: context.getOver().id,
    combineWith: null,
    combineTargetFor: null,
    mode: isDragging ? 'FLUID' : null,
  };

  return <>{children(provided, snapshot)}</>;
}

export default {
  DragDropContext,
  Droppable,
  Draggable,
};