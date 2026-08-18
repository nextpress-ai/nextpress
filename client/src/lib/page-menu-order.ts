import type { Page } from '@shared/schema-types';

/** 1-based menu slot shown in admin UI (stored menuOrder is zero-based). */
export function formatMenuPosition(menuOrder: number | null | undefined): number {
  return (menuOrder ?? 0) + 1;
}

/** Moves one page to a 1-based menu slot in a local ordered list. */
export function movePageToMenuPosition({
  pages,
  pageId,
  targetPosition,
}: {
  pages: Page[];
  pageId: string;
  targetPosition: number;
}): Page[] {
  const fromIndex = pages.findIndex((page) => page.id === pageId);
  if (fromIndex < 0) {
    return pages;
  }

  const toIndex = Math.min(Math.max(targetPosition - 1, 0), pages.length - 1);
  if (fromIndex === toIndex) {
    return pages;
  }

  const next = [...pages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
