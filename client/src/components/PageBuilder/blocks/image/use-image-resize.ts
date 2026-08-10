import { useRef, useCallback } from "react";

/**
 * Drag state tracked via refs to avoid re-renders during resize.
 * Only commits the final size via the callback when mouse is released.
 */
interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  handle: ResizeHandle;
}

type ResizeHandle = "bottom-right" | "bottom-left";

interface UseImageResizeOptions {
  /** Called with final pixel width when resize completes */
  onResizeEnd: (width: number) => void;
}

interface UseImageResizeResult {
  /** Ref to attach to the <img> element for reading natural dimensions */
  imgRef: React.RefObject<HTMLImageElement | null>;
  /** Current resize width (only non-null during active drag) */
  resizeWidth: number | null;
  /** Create onMouseDown handler for a specific resize handle */
  createHandleMouseDown: (handle: ResizeHandle) => (e: React.MouseEvent) => void;
  /** Nudge width from the keyboard in pixel steps */
  resizeByKeyboard: (handle: ResizeHandle, delta: number) => void;
}

/**
 * Hook for drag-to-resize on images in the editor.
 * Uses refs for drag state to avoid re-renders during drag.
 * Applies a temporary inline width during drag via direct DOM mutation,
 * then commits the final value through the callback.
 *
 * No useEffect needed — all listeners are attached/removed procedurally
 * in mousedown/mouseup handlers.
 */
export function useImageResize({ onResizeEnd }: UseImageResizeOptions): UseImageResizeResult {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<DragState>({
    active: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1,
    handle: "bottom-right",
  });
  const widthIndicatorRef = useRef<HTMLDivElement | null>(null);
  const resizeWidthRef = useRef<number | null>(null);

  /**
   * Computes new width from mouse delta, respecting minimum size
   * and clamping to parent container width.
   */
  const computeNewWidth = useCallback((clientX: number): number => {
    const state = dragStateRef.current;
    const deltaX = state.handle === "bottom-right"
      ? clientX - state.startX
      : state.startX - clientX;

    let newWidth = Math.max(50, state.startWidth + deltaX);

    // Clamp to the builder canvas width — not the immediate block wrapper, which uses
    // the same width as the image (BlockRenderer) and would cap growth at the current size.
    const canvas = imgRef.current?.closest('[aria-label="Canvas"]');
    if (canvas) {
      const canvasWidth = canvas.getBoundingClientRect().width;
      newWidth = Math.min(newWidth, Math.max(50, canvasWidth));
    }

    return Math.round(newWidth);
  }, []);

  /** Direct DOM update during drag — no React re-render */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current.active) return;
    e.preventDefault();

    const newWidth = computeNewWidth(e.clientX);
    resizeWidthRef.current = newWidth;

    // Update image width directly on the DOM for smooth feel
    if (imgRef.current) {
      imgRef.current.style.width = `${newWidth}px`;
      imgRef.current.style.height = "auto";
    }

    // Update width indicator tooltip
    if (widthIndicatorRef.current) {
      widthIndicatorRef.current.textContent = `${newWidth}px`;
    }
  }, [computeNewWidth]);

  /** Commits final width and cleans up listeners */
  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current.active) return;

    dragStateRef.current.active = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const finalWidth = resizeWidthRef.current;
    resizeWidthRef.current = null;

    // Remove indicator
    if (widthIndicatorRef.current) {
      widthIndicatorRef.current.remove();
      widthIndicatorRef.current = null;
    }

    // Clean up document listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    // Commit the final width
    if (finalWidth !== null) {
      onResizeEnd(finalWidth);
    }
  }, [handleMouseMove, onResizeEnd]);

  /**
   * Creates a mousedown handler for a specific resize handle.
   * Attaches document-level mousemove/mouseup listeners procedurally.
   */
  const createHandleMouseDown = useCallback(
    (handle: ResizeHandle) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();

      dragStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        aspectRatio: rect.width / rect.height,
        handle,
      };

      // Set cursor for the whole page during drag
      document.body.style.cursor = handle === "bottom-right" ? "nwse-resize" : "nesw-resize";
      document.body.style.userSelect = "none";

      // Create width indicator tooltip near the image
      const indicator = document.createElement("div");
      indicator.style.cssText =
        "position:fixed;z-index:9999;padding:2px 8px;background:#1e293b;color:#fff;" +
        "border-radius:4px;font-size:12px;font-family:monospace;pointer-events:none;" +
        "transform:translate(-50%,-100%);white-space:nowrap;";
      indicator.textContent = `${Math.round(rect.width)}px`;
      // Position above the bottom edge of the image
      indicator.style.left = `${rect.left + rect.width / 2}px`;
      indicator.style.top = `${rect.bottom - 8}px`;
      document.body.appendChild(indicator);
      widthIndicatorRef.current = indicator;

      // Attach listeners procedurally — removed in handleMouseUp
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  const resizeByKeyboard = useCallback(
    (handle: ResizeHandle, delta: number) => {
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const signedDelta = handle === "bottom-right" ? delta : -delta;
      let newWidth = Math.max(50, Math.round(rect.width + signedDelta));

      const canvas = img.closest('[aria-label="Canvas"]');
      if (canvas) {
        const canvasWidth = canvas.getBoundingClientRect().width;
        newWidth = Math.min(newWidth, Math.max(50, canvasWidth));
      }

      onResizeEnd(newWidth);
    },
    [onResizeEnd],
  );

  return {
    imgRef,
    resizeWidth: resizeWidthRef.current,
    createHandleMouseDown,
    resizeByKeyboard,
  };
}
