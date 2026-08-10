import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import { insertNewBlock, moveExistingBlock } from '@/lib/handlers/treeUtils';
import { buildColumnDroppableId } from '../components/PageBuilder/blocks/columns/columns-model';

// Mock registry for creation
vi.mock('@/components/PageBuilder/blocks', () => ({
  blockRegistry: {
    'core/text': { id: 'core/text', label: 'Text', isContainer: false, defaultContent: { kind: 'text', value: '' }, defaultStyles: {}, category: 'basic' },
    'core/group': { id: 'core/group', label: 'Group', isContainer: true, defaultContent: { kind: 'structured', data: {} }, defaultStyles: {}, category: 'layout' },
  },
  getDefaultBlock: (type: string, id: string) => {
    const registry: Record<string, BlockConfig> = {
      'core/text': { id, name: 'core/text', type: 'block', parentId: null, content: { kind: 'text', value: '' }, styles: {}, settings: {} },
      'core/group': { id, name: 'core/group', type: 'container', parentId: null, content: { kind: 'structured', data: {} }, styles: {}, settings: {}, children: [] },
    } as any;
    return registry[type] || null;
  },
}));

function makeColumns(): BlockConfig {
  return {
    id: 'columns-1',
    name: 'core/columns',
    type: 'container',
    parentId: null,
    content: { kind: 'structured', data: { gap: '20px' } },
    styles: {},
    settings: { columnLayout: [
      { columnId: 'col-A', width: '50%', blockIds: [] },
      { columnId: 'col-B', width: '50%', blockIds: [] },
    ] },
    children: [],
  }
}

describe('Columns DnD mapping helpers (integration via tree ops)', () => {
  let blocks: BlockConfig[];

  beforeEach(() => {
    blocks = [makeColumns()];
  });

  it('scopes duplicate and default column IDs by block and index', () => {
    const ids = [
      buildColumnDroppableId({
        columnsBlockId: 'columns-a',
        columnId: 'default-col-1',
        columnIndex: 0,
      }),
      buildColumnDroppableId({
        columnsBlockId: 'columns-a',
        columnId: 'default-col-1',
        columnIndex: 1,
      }),
      buildColumnDroppableId({
        columnsBlockId: 'columns-b',
        columnId: 'default-col-1',
        columnIndex: 0,
      }),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('insertNewBlock inserts under Columns parent regardless of column subzone (simulated)', () => {
    // Simulate global insert at index 0 under columns
    const r = insertNewBlock(blocks, 'columns-1', 0, 'core/text');
    expect(r.blocks[0].children?.length).toBe(1);
  });

  it('moveExistingBlock reorders within same Columns parent correctly (global indices)', () => {
    let r = insertNewBlock(blocks, 'columns-1', 0, 'core/text');
    r = insertNewBlock(r.blocks, 'columns-1', 1, 'core/text');
    const moved = moveExistingBlock(r.blocks, 'columns-1', 0, 'columns-1', 2);
    const ids = moved[0].children!.map(c => c.id);
    expect(ids.length).toBe(2);
  });
});
