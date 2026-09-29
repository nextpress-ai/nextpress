import { useCallback, useSyncExternalStore } from 'react';

/**
 * "Pause motion on the canvas": orbiting or floating blocks are hard to click while they move.
 * The choice is per browser (it is an editing comfort, not part of the page) and only touches the
 * editor canvas — preview and published pages always move.
 */
const STORAGE_KEY = 'npb:pause-canvas-motion';
const PAUSED_CLASS = 'npb-motion-paused';

const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (error) {
    console.warn('[canvas-motion-pause] Could not read the saved choice', { error });
    return false;
  }
}

let paused = typeof window !== 'undefined' ? readStored() : false;

function applyClass(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(PAUSED_CLASS, paused);
}

applyClass();

export function setCanvasMotionPaused(next: boolean): void {
  paused = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch (error) {
    console.warn('[canvas-motion-pause] Could not save the choice', { error });
  }
  applyClass();
  listeners.forEach((listener) => listener());
}

/** Current choice plus a setter; every component using it stays in step. */
export function useCanvasMotionPaused(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    useCallback((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []),
    () => paused,
    () => false,
  );
  return [value, setCanvasMotionPaused];
}
