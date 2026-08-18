export type PaginationItem = number | 'ellipsis';

/**
 * Builds a compact page index for admin list footers (current window + ellipsis).
 */
export function buildPaginationItems({
  page,
  totalPages,
  maxVisible = 7,
}: {
  page: number;
  totalPages: number;
  maxVisible?: number;
}): PaginationItem[] {
  if (totalPages <= 1) {
    return [1];
  }

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const windowLeft = Math.max(2, page - 1);
  const windowRight = Math.min(totalPages - 1, page + 1);

  if (windowLeft > 2) {
    items.push('ellipsis');
  }

  for (let pageNumber = windowLeft; pageNumber <= windowRight; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (windowRight < totalPages - 1) {
    items.push('ellipsis');
  }

  items.push(totalPages);
  return items;
}
