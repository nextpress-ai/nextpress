import { describe, it, expect } from 'vitest';
import { findBlock, findBlockPath, insertNewBlock, moveExistingBlock } from '@/lib/handlers/treeUtils';
import type { BlockConfig } from '@shared/schema-types';

// Helpers
const makeBlock = (id: string, blockType: string = 'core/paragraph', children?: BlockConfig[]): BlockConfig => ({
  id,
  name: blockType,
  type: children !== undefined ? 'container' : 'block',
  parentId: null,
  content: blockType === 'core/paragraph' ? { kind: 'text', value: id } : { kind: 'empty' },
  styles: {},
  settings: {},
  ...(children !== undefined && { children })
});

describe('treeUtils', () => {
  describe('findBlock', () => {
    it('finds a root block', () => {
      const blocks = [makeBlock('a'), makeBlock('b')];
      const result = findBlock(blocks, 'b');
      expect(result?.id).toBe('b');
    });

    it('finds a nested block', () => {
      const blocks = [makeBlock('group', 'core/group', [makeBlock('child')])];
      const result = findBlock(blocks, 'child');
      expect(result?.id).toBe('child');
    });

    it('returns null when absent', () => {
      const blocks = [makeBlock('x')];
      expect(findBlock(blocks, 'missing')).toBeNull();
    });
  });

  describe('findBlockPath', () => {
    it('returns indices path for nested block', () => {
      const blocks = [
        makeBlock('outer', 'core/group', [
          makeBlock('inner', 'core/group', [
            makeBlock('leaf')
          ])
        ])
      ];
      const path = findBlockPath(blocks, 'leaf');
      expect(path).not.toBeNull();
      // Path includes -1 markers; ensure final index chain ends with leaf index
      expect(path?.filter(i => i !== -1)).toEqual([0,0,0]);
    });

    it('returns null when not found', () => {
      const blocks = [makeBlock('only')];
      expect(findBlockPath(blocks, 'nope')).toBeNull();
    });
  });

  describe('insertNewBlock', () => {
    it('inserts at root', () => {
      const blocks: BlockConfig[] = [];
      const { blocks: next, newId } = insertNewBlock(blocks, null, 0, 'core/paragraph');
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe(newId);
    });

    it('inserts into container at index', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [])];
      const { blocks: next, newId } = insertNewBlock(blocks, 'grp', 0, 'core/paragraph');
      const grp = next[0];
      expect(grp.children).toHaveLength(1);
      expect(grp.children?.[0].id).toBe(newId);
    });

    it('no-ops for invalid parent id', () => {
      const initial: BlockConfig[] = [makeBlock('root')];
      const { blocks: next } = insertNewBlock(initial, 'missing', 0, 'core/paragraph');
      expect(next).toBe(initial); // unchanged reference
    });

    it('refuses a second page shell', () => {
      const shell = makeBlock('shell', 'core/page-shell', []);
      const initial = [shell];
      const result = insertNewBlock(initial, null, 1, 'core/page-shell');
      expect(result.refused).toBe('page-shell-exists');
      expect(result.blocks).toBe(initial);
    });

    it('puts a root header inside the existing shell', () => {
      const shell = makeBlock('shell', 'core/page-shell', [makeBlock('h1')]);
      const { blocks: next, newId } = insertNewBlock([shell], null, 0, 'core/header');
      expect(next).toHaveLength(1);
      expect(next[0]?.name).toBe('core/page-shell');
      expect(next[0]?.children?.[0]?.name).toBe('core/header');
      expect(next[0]?.children?.[0]?.id).toBe(newId);
    });
  });

  describe('moveExistingBlock', () => {
    it('reorders upward within same container', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b'), makeBlock('c')])];
      const next = moveExistingBlock(blocks, 'grp', 2, 'grp', 0); // move c to front
      const grp = next[0];
      expect(grp.children?.map(c => c.id)).toEqual(['c','a','b']);
    });

    it('reorders downward within same container (regression)', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b'), makeBlock('c')])];
      const next = moveExistingBlock(blocks, 'grp', 0, 'grp', 3); // move a to end using dest beyond length
      const grp = next[0];
      expect(grp.children?.map(c => c.id)).toEqual(['b','c','a']);
    });

    it('moves from root to container', () => {
      const blocks: BlockConfig[] = [makeBlock('orphan'), makeBlock('grp', 'core/group', [])];
      const next = moveExistingBlock(blocks, null, 0, 'grp', 0);
      const grp = next.find(b => b.id === 'grp');
      expect(grp?.children?.[0].id).toBe('orphan');
      expect(next.find(b => b.id === 'orphan')).toBeUndefined();
    });

    it('moves from container to root at index', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b')])];
      const next = moveExistingBlock(blocks, 'grp', 0, null, 1); // move a to root index 1
      expect(next.map(b => b.id)).toEqual(['grp','a']);
      const grp = next[0];
      expect(grp.children?.map(c => c.id)).toEqual(['b']);
    });

    it('moves between containers', () => {
      const blocks: BlockConfig[] = [
        makeBlock('g1', 'core/group', [makeBlock('x')]),
        makeBlock('g2', 'core/group', [])
      ];
      const next = moveExistingBlock(blocks, 'g1', 0, 'g2', 0);
      const g1 = next.find(b => b.id === 'g1');
      const g2 = next.find(b => b.id === 'g2');
      expect(g1?.children).toHaveLength(0);
      expect(g2?.children?.[0].id).toBe('x');
    });

    it('no-op when dropping in same position', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b')])];
      const next = moveExistingBlock(blocks, 'grp', 0, 'grp', 0);
      // Should return original reference indicating no change
      expect(next).toBe(blocks);
    });

    it('no-op when dropping immediately after itself (same container)', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b'), makeBlock('c')])];
      const next = moveExistingBlock(blocks, 'grp', 0, 'grp', 1);
      expect(next).toBe(blocks);
    });

    it('clamps negative destination index to 0', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b')])];
      const next = moveExistingBlock(blocks, 'grp', 1, 'grp', -5);
      const grp = next[0];
      expect(grp.children?.map(c => c.id)).toEqual(['b','a']);
    });

    it('clamps destination index beyond length to append', () => {
      const blocks: BlockConfig[] = [makeBlock('grp', 'core/group', [makeBlock('a'), makeBlock('b')])];
      const next = moveExistingBlock(blocks, 'grp', 0, 'grp', 999);
      const grp = next[0];
      expect(grp.children?.map(c => c.id)).toEqual(['b','a']);
    });

    it('reorders root-level blocks (canvas to canvas) downward to end', () => {
      const blocks: BlockConfig[] = [makeBlock('a'), makeBlock('b'), makeBlock('c')];
      const next = moveExistingBlock(blocks, null, 0, null, 3); // move 'a' to end
      expect(next.map(b => b.id)).toEqual(['b','c','a']);
    });

    it('reorders a columns container at root and preserves structure', () => {
      const columnsBlock: BlockConfig = {
        id: 'cols',
        name: 'core/columns', type: 'container',
        content: {
          columns: [
            { id: 'col-1', width: 50, children: [makeBlock('c1')] },
            { id: 'col-2', width: 50, children: [] }
          ]
        } as any,
        styles: {},
        settings: {},
        children: []
      } as any;

      const blocks: BlockConfig[] = [makeBlock('p1'), columnsBlock, makeBlock('p2')];

      // Move columns block to the front
      const next1 = moveExistingBlock(blocks, null, 1, null, 0);
      expect(next1.map(b => b.id)).toEqual(['cols','p1','p2']);
      const cols1 = next1[0] as any;
      expect(cols1.content.columns[0].id).toBe('col-1');
      expect(cols1.content.columns[0].children.map((c: any) => c.id)).toEqual(['c1']);

      // Then move columns block to the end using an index beyond length
      const next2 = moveExistingBlock(next1, null, 0, null, 999);
      expect(next2.map(b => b.id)).toEqual(['p1','p2','cols']);
      const cols2 = next2[2] as any;
      expect(cols2.content.columns[0].id).toBe('col-1');
      expect(cols2.content.columns[0].children.map((c: any) => c.id)).toEqual(['c1']);
    });
  });
});
