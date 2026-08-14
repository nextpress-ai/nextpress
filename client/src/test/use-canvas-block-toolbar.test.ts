import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  CANVAS_BLOCK_TOOLBAR_FADE_MS,
  CANVAS_BLOCK_TOOLBAR_IDLE_MS,
  useCanvasBlockToolbar,
} from '../components/PageBuilder/use-canvas-block-toolbar';

describe('useCanvasBlockToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts open when the block is already selected', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    expect(result.current.toolbarOpen).toBe(true);
    expect(result.current.paintToolbar).toBe(true);
  });

  it('hides after idle while selected, but keeps the bar mounted so it can fade', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS);
    });

    expect(result.current.toolbarOpen).toBe(false);
    expect(result.current.paintToolbar).toBe(true);
  });

  it('stays open past idle while the pointer is on the toolbar', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    act(() => {
      result.current.toolbarEngageHandlers.onMouseEnter();
    });
    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS * 2);
    });

    expect(result.current.toolbarOpen).toBe(true);
  });

  it('restarts idle after the pointer leaves the toolbar', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    act(() => {
      result.current.toolbarEngageHandlers.onMouseEnter();
    });
    act(() => {
      result.current.toolbarEngageHandlers.onMouseLeave();
    });
    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS - 1);
    });
    expect(result.current.toolbarOpen).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toolbarOpen).toBe(false);
  });

  it('closes immediately on deselect', () => {
    const { result, rerender } = renderHook(
      ({ isSelected }) =>
        useCanvasBlockToolbar({ enabled: true, isSelected }),
      { initialProps: { isSelected: true } },
    );

    rerender({ isSelected: false });

    expect(result.current.toolbarOpen).toBe(false);
  });

  it('opens on hover and unmounts after idle plus fade when not selected', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: false }),
    );

    act(() => {
      result.current.blockHoverHandlers.onMouseEnter();
    });
    expect(result.current.toolbarOpen).toBe(true);
    expect(result.current.paintToolbar).toBe(true);

    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS);
    });
    expect(result.current.toolbarOpen).toBe(false);
    expect(result.current.paintToolbar).toBe(true);

    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_FADE_MS);
    });
    expect(result.current.paintToolbar).toBe(false);
  });

  it('does not reset idle on zero-movement pointermove', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS - 1);
    });
    act(() => {
      result.current.blockHoverHandlers.onPointerMove({
        movementX: 0,
        movementY: 0,
      });
    });
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.toolbarOpen).toBe(false);
  });

  it('reveals again on real pointer movement', () => {
    const { result } = renderHook(() =>
      useCanvasBlockToolbar({ enabled: true, isSelected: true }),
    );

    act(() => {
      vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS);
    });
    expect(result.current.toolbarOpen).toBe(false);

    act(() => {
      result.current.blockHoverHandlers.onPointerMove({
        movementX: 2,
        movementY: 0,
      });
    });
    expect(result.current.toolbarOpen).toBe(true);
  });
});
