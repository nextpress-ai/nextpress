import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_LIST_SORT,
  DEFAULT_POST_LIST_SORT,
  parseContentListSearch,
  parseContentListSort,
  toModelOrderBy,
} from '@shared/content-list-query';

describe('content-list-query', () => {
  it('falls back to defaults for unknown sort fields', () => {
    expect(
      parseContentListSort({
        sort: 'unknown',
        order: 'sideways',
        allowedFields: ['title', 'menuOrder'],
        defaults: DEFAULT_PAGE_LIST_SORT,
      }),
    ).toEqual(DEFAULT_PAGE_LIST_SORT);
  });

  it('accepts valid sort params', () => {
    expect(
      parseContentListSort({
        sort: 'title',
        order: 'desc',
        allowedFields: ['title', 'menuOrder'],
        defaults: DEFAULT_POST_LIST_SORT,
      }),
    ).toEqual({ sort: 'title', order: 'desc' });
  });

  it('trims empty search values', () => {
    expect(parseContentListSearch('  hello  ')).toBe('hello');
    expect(parseContentListSearch('   ')).toBeUndefined();
  });

  it('maps API order to model order', () => {
    expect(toModelOrderBy({ sort: 'updatedAt', order: 'desc' })).toEqual({
      property: 'updatedAt',
      order: 'descending',
    });
  });
});
