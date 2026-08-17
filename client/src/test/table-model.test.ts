import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA, resolveTableData } from '@/components/PageBuilder/blocks/table/table-model';

describe('resolveTableData', () => {
  it('reads structured table content', () => {
    const data = resolveTableData({
      kind: 'structured',
      data: {
        head: [{ cells: [{ content: 'H1', tag: 'th' }] }],
        body: [{ cells: [{ content: 'A1', tag: 'td' }] }],
      },
    });

    expect(data.head?.[0]?.cells[0]?.content).toBe('H1');
    expect(data.body?.[0]?.cells[0]?.content).toBe('A1');
  });

  it('reads unwrapped table data from defaultParseContent', () => {
    const data = resolveTableData({
      head: [{ cells: [{ content: 'Product', tag: 'th' }] }],
      body: [{ cells: [{ content: 'Coffee', tag: 'td' }] }],
    });

    expect(data.head?.[0]?.cells[0]?.content).toBe('Product');
    expect(data.body?.[0]?.cells[0]?.content).toBe('Coffee');
  });

  it('falls back to empty defaults when content is missing', () => {
    expect(resolveTableData(undefined)).toEqual(DEFAULT_DATA);
  });
});
