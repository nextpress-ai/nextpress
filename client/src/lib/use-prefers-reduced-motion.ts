import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(listener: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const media = window.matchMedia(QUERY);
  const handleChange = () => listener();
  media.addEventListener('change', handleChange);
  return () => media.removeEventListener('change', handleChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

const getServerSnapshot = (): boolean => false;

/**
 * Tracks OS reduced-motion preference without effect hooks.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns false when the user prefers reduced motion or tests run without animation.
 */
export function useMotionEnabled(): boolean {
  if (import.meta.env.MODE === 'test') {
    return false;
  }
  return !usePrefersReducedMotion();
}
