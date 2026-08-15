export const CONTENT_LIST_SORT_ORDERS = ['asc', 'desc'] as const;

export type ContentListSortOrder = (typeof CONTENT_LIST_SORT_ORDERS)[number];

export const PAGE_LIST_SORT_FIELDS = [
  'title',
  'createdAt',
  'updatedAt',
  'menuOrder',
  'status',
] as const;

export const POST_LIST_SORT_FIELDS = [
  'title',
  'createdAt',
  'updatedAt',
  'menuOrder',
  'status',
] as const;

export type PageListSortField = (typeof PAGE_LIST_SORT_FIELDS)[number];
export type PostListSortField = (typeof POST_LIST_SORT_FIELDS)[number];

export const MEDIA_LIST_SORT_FIELDS = [
  'originalName',
  'mimeType',
  'size',
  'createdAt',
  'updatedAt',
] as const;

export type MediaListSortField = (typeof MEDIA_LIST_SORT_FIELDS)[number];

export type ContentListSortParams = {
  sort: string;
  order: ContentListSortOrder;
};

export const DEFAULT_PAGE_LIST_SORT: ContentListSortParams & {
  sort: PageListSortField;
} = {
  sort: 'menuOrder',
  order: 'asc',
};

export const DEFAULT_POST_LIST_SORT: ContentListSortParams & {
  sort: PostListSortField;
} = {
  sort: 'updatedAt',
  order: 'desc',
};

export const DEFAULT_MEDIA_LIST_SORT: ContentListSortParams & {
  sort: MediaListSortField;
} = {
  sort: 'createdAt',
  order: 'desc',
};

/** Maps API sort params to model layer ordering. */
export const toModelOrderBy = ({
  sort,
  order,
}: ContentListSortParams): {
  property: string;
  order: 'ascending' | 'descending';
} => ({
  property: sort,
  order: order === 'asc' ? 'ascending' : 'descending',
});

const isSortOrder = (value: unknown): value is ContentListSortOrder =>
  value === 'asc' || value === 'desc';

/** Parses list sort params with safe fallbacks for unknown values. */
export const parseContentListSort = ({
  sort,
  order,
  allowedFields,
  defaults,
}: {
  sort: unknown;
  order: unknown;
  allowedFields: readonly string[];
  defaults: ContentListSortParams;
}): ContentListSortParams => {
  const resolvedSort =
    typeof sort === 'string' && allowedFields.includes(sort) ? sort : defaults.sort;
  const resolvedOrder = isSortOrder(order) ? order : defaults.order;
  return { sort: resolvedSort, order: resolvedOrder };
};

/** Trims search text for server-backed list filtering. */
export const parseContentListSearch = (search: unknown): string | undefined => {
  if (typeof search !== 'string') return undefined;
  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
