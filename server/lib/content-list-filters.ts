import type { Filter } from '@shared/create-models';

type BuildSearchFiltersParams = {
  search?: string;
};

/**
 * Adds title search filters for admin list endpoints.
 * Uses ilike so editors can find content across the full result set.
 */
export const buildTitleSearchFilters = ({
  search,
}: BuildSearchFiltersParams): Filter[] => {
  if (!search) return [];
  const pattern = `%${search.replace(/[%_]/g, '')}%`;
  return [{ where: 'title', ilike: pattern }];
};
