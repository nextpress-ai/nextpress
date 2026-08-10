import { useCallback, useSyncExternalStore } from 'react';

type MediaQueryListener = () => void;

function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return null;
  }
  return window.matchMedia(query);
}

function getMediaQuerySnapshot(query: string): boolean {
  return getMediaQueryList(query)?.matches ?? false;
}

function subscribeToMediaQuery(
  query: string,
  listener: MediaQueryListener,
): () => void {
  const mediaQueryList = getMediaQueryList(query);
  if (!mediaQueryList) {
    return () => {};
  }

  const handleChange = () => listener();
  if (mediaQueryList.addEventListener) {
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }

  mediaQueryList.addListener(handleChange);
  return () => mediaQueryList.removeListener(handleChange);
}

const getServerSnapshot = () => false;

/**
 * Reads viewport media queries through React's external-store contract so
 * responsive layout selection stays hydration-safe without component effects.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: MediaQueryListener) => subscribeToMediaQuery(query, listener),
    [query],
  );
  const getSnapshot = useCallback(() => getMediaQuerySnapshot(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
