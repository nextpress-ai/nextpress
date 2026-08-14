import { useEffect, useRef, useState } from 'react';

/** Idle before the canvas block toolbar fades so the block itself stays readable. */
export const CANVAS_BLOCK_TOOLBAR_IDLE_MS = 3000;

/**
 * Unmount delay after hide. Must match `--npb-duration-normal` so the fade can finish.
 */
export const CANVAS_BLOCK_TOOLBAR_FADE_MS = 200;

type UseCanvasBlockToolbarArgs = {
  /** False in preview / publish: no editor chrome. */
  enabled: boolean;
  isSelected: boolean;
};

type CanvasBlockToolbarApi = {
  /** Opacity / interactivity. False after idle or pointer leave. */
  toolbarOpen: boolean;
  /** Stay mounted through the fade, and while selected so idle hide can fade. */
  paintToolbar: boolean;
  blockHoverHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onPointerMove: (event: { movementX: number; movementY: number }) => void;
  };
  toolbarEngageHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** Click / select on the block: show chrome and restart the idle clock. */
  onBlockInteract: () => void;
};

/**
 * Shows the floating block toolbar on hover/select, then hides it after idle
 * unless the pointer is on the toolbar (engaged). The clock is an external
 * timer, so the timeout lives in this hook rather than a component effect.
 */
export function useCanvasBlockToolbar({
  enabled,
  isSelected,
}: UseCanvasBlockToolbarArgs): CanvasBlockToolbarApi {
  const [open, setOpen] = useState(enabled && isSelected);
  const [engaged, setEngaged] = useState(false);
  const [idleToken, setIdleToken] = useState(0);
  const [prevSelected, setPrevSelected] = useState(isSelected);
  const keepMounted = enabled && (open || isSelected);
  const [painted, setPainted] = useState(keepMounted);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  if (isSelected !== prevSelected) {
    setPrevSelected(isSelected);
    if (enabled && isSelected) {
      setOpen(true);
      setIdleToken((n) => n + 1);
    }
    if (!isSelected) {
      setOpen(false);
      setEngaged(false);
    }
  }

  if (keepMounted && !painted) {
    setPainted(true);
  }

  const bumpIdle = () => {
    setIdleToken((n) => n + 1);
  };

  const reveal = () => {
    if (!enabledRef.current) return;
    setOpen(true);
    bumpIdle();
  };

  useEffect(() => {
    if (!enabled || !open || engaged) return undefined;
    const timeoutId = setTimeout(() => {
      setOpen(false);
    }, CANVAS_BLOCK_TOOLBAR_IDLE_MS);
    return () => clearTimeout(timeoutId);
  }, [enabled, open, engaged, idleToken]);

  useEffect(() => {
    if (keepMounted || !painted) return undefined;
    const timeoutId = setTimeout(() => {
      setPainted(false);
    }, CANVAS_BLOCK_TOOLBAR_FADE_MS);
    return () => clearTimeout(timeoutId);
  }, [keepMounted, painted]);

  return {
    toolbarOpen: enabled && open,
    paintToolbar: enabled && painted,
    blockHoverHandlers: {
      onMouseEnter: reveal,
      onMouseLeave: () => {
        if (!engaged) setOpen(false);
      },
      onPointerMove: (event) => {
        if (event.movementX === 0 && event.movementY === 0) return;
        reveal();
      },
    },
    toolbarEngageHandlers: {
      onMouseEnter: () => {
        if (!enabledRef.current) return;
        setEngaged(true);
        setOpen(true);
      },
      onMouseLeave: () => {
        setEngaged(false);
        bumpIdle();
      },
    },
    onBlockInteract: reveal,
  };
}
