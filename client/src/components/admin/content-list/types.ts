/**
 * Pagination values returned by an admin content list.
 */
export type ContentListPagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

/**
 * Props for a pagination footer that keeps list scope visible.
 */
export type ContentListPaginationFooterProps = ContentListPagination & {
  itemLabel: string;
  onPageChange: (page: number) => void;
};

/**
 * Props for a controlled list search toolbar.
 */
export type ContentListToolbarProps = {
  value: string;
  placeholder: string;
  onSearchChange: (value: string) => void;
  className?: string;
};
