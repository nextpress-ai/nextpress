
import { generateId } from '@/lib/utils';
import type { BlockConfig } from '@shared/schema-types';
import { blockRegistry, getDefaultBlock as getDefaultBlockExport } from '@/components/PageBuilder/blocks';

export function findBlock(rootBlocks: BlockConfig[], targetId: string): BlockConfig | null {
  function search(list: BlockConfig[]): BlockConfig | null {
    for (const block of list) {
      if (block.id === targetId) {
        return block;
      }
      
      // Only search children array (no special cases)
      if (Array.isArray(block.children)) {
        const found = search(block.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(rootBlocks);
}

export function findBlockPath(rootBlocks: BlockConfig[], targetId: string): number[] | null {
  const path: number[] = [];
  function dfs(list: BlockConfig[], currentPath: number[]): boolean {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const next = currentPath.concat(i);
      if (b.id === targetId) {
        path.push(...next);
        return true;
      }
      if (Array.isArray(b.children) && dfs(b.children, next.concat(-1))) return true; // -1 marker separating levels
    }
    return false;
  }
  if (!dfs(rootBlocks, [])) return null;
  return path;
}

export function insertNewBlock(rootBlocks: BlockConfig[], parentId: string | null, index: number, type: string): { blocks: BlockConfig[]; newId?: string } {
  const clone = structuredClone(rootBlocks) as BlockConfig[];
  const id = generateId();
  
  // Use getDefaultBlock to create block with new structure
  const newBlock = getDefaultBlockExport(type, id);
  if (!newBlock) return { blocks: rootBlocks };
  
  // Set parentId
  newBlock.parentId = parentId;
  
  if (!parentId) {
    clone.splice(index, 0, newBlock);
    return { blocks: clone, newId: newBlock.id };
  }
  
  function insert(list: BlockConfig[]): boolean {
    for (const b of list) {
      if (b.id === parentId) {
        if (!Array.isArray(b.children)) b.children = [];
        b.children.splice(index, 0, newBlock!);
        return true;
      }
      
      if (b.children && insert(b.children)) return true;
    }
    return false;
  }
  if (!insert(clone)) return { blocks: rootBlocks };
  return { blocks: clone, newId: newBlock.id };
}

// Helper to find the parent list and index of a block
function findParent(list: BlockConfig[], parentId: string | null): { container: BlockConfig[], parentBlock: BlockConfig | null } {
    if (parentId === null) {
        return { container: list, parentBlock: null };
    }

    const queue: BlockConfig[] = [...list];
    while(queue.length > 0) {
        const block = queue.shift();
        if (block && block.id === parentId) {
            if (!Array.isArray(block.children)) {
                block.children = [];
            }
            return { container: block.children, parentBlock: block };
        }
        
        if (block && Array.isArray(block.children)) {
            queue.push(...block.children);
        }
    }

    // Do not fallback to root when not found; signal unknown parent
    return { container: [] as BlockConfig[], parentBlock: null };
}


export function moveExistingBlock(rootBlocks: BlockConfig[], sourceParentId: string | null, sourceIndex: number, destParentId: string | null, destIndex: number): BlockConfig[] {
  const clone = structuredClone(rootBlocks) as BlockConfig[];

  const { container: sourceContainer, parentBlock: sourceParent } = findParent(clone, sourceParentId);
  if ((sourceParentId !== null && !sourceParent) || !sourceContainer || sourceIndex < 0 || sourceIndex >= sourceContainer.length) {
    console.error("Source not found", { sourceParentId, sourceIndex });
    return rootBlocks;
  }

  const movedBlock = sourceContainer[sourceIndex];
  if (!movedBlock) {
    return rootBlocks;
  }

  // Prevent moving a block into itself or its descendants
  function containsIdInSubtree(node: BlockConfig, targetId: string): boolean {
    if (node.id === targetId) return true;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (containsIdInSubtree(child, targetId)) return true;
      }
    }
    return false;
  }

  /*if (destParentId !== null && containsIdInSubtree(movedBlock, destParentId)) {
    console.error("Cannot move a block into itself or its own descendants.");
    return rootBlocks;
  }*/

  const sameParent = sourceParentId === destParentId;
  // No-op scenarios (dropping in the same place)
  if (sameParent && destIndex === sourceIndex) {
    return rootBlocks;
  }
  
  // Additional no-op case: when moving to immediately after itself in same container
  // (e.g., moving from index 0 to index 1 in same container)
  if (sameParent && destIndex === sourceIndex + 1) {
    return rootBlocks;
  }

  // Now, perform the move by first removing from source
  sourceContainer.splice(sourceIndex, 1);

  // Find destination container after mutation, because the source removal can affect indices
  const { container: destContainer, parentBlock: destParent } = findParent(clone, destParentId);
  if ((destParentId !== null && !destParent) || !destContainer) {
    console.error("Destination not found", { destParentId, destIndex });
    return rootBlocks;
  }

  let targetIndex = destIndex;
  if (sameParent && destIndex > sourceIndex) {
    targetIndex = destIndex - 1;
  }
  if (targetIndex < 0 || Number.isNaN(targetIndex)) targetIndex = 0;
  if (targetIndex > destContainer.length) targetIndex = destContainer.length;

  // Update parentId when moving to a different parent
  if (!sameParent) {
    movedBlock.parentId = destParentId;
  }

  destContainer.splice(targetIndex, 0, movedBlock);

  return clone;
}

// Legacy deep utilities expected by legacy tests
export function findBlockDeep(rootBlocks: BlockConfig[], targetId: string): { found: boolean; block: BlockConfig; path: number[] } | null {
  function dfs(list: BlockConfig[], path: number[]): { block: BlockConfig; path: number[] } | null {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const nextPath = path.concat(i);
      if (b.id === targetId) return { block: b, path: nextPath };

      // Search within children
      if (Array.isArray(b.children)) {
        const res = dfs(b.children, nextPath);
        if (res) return res;
      }
    }
    return null;
  }
  const found = dfs(rootBlocks, []);
  if (!found) return null;
  return { found: true, block: found.block, path: found.path };
}

/**
 * Deep merge helper for nested objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const val = source[key];
    // Explicit null = clear/replace this key entirely
    if (val === null) {
      result[key] = null as any;
      continue;
    }
    if (val !== undefined) {
      if (
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], val) as any;
      } else {
        result[key] = val as any;
      }
    }
  }
  
  return result;
}

export function updateBlockDeep(rootBlocks: BlockConfig[], targetId: string, updates: Partial<BlockConfig>): { found: boolean; next: BlockConfig[] } {
  let found = false;
  function walk(list: BlockConfig[]): BlockConfig[] {
    let mutated = false;
    const next = list.map((b) => {
      if (b.id === targetId) {
        found = true;
        mutated = true;
        // Use deep merge to properly handle nested objects like styles, content, settings
        return deepMerge(b, updates);
      }

      let updatedChild = b.children;
      if (Array.isArray(b.children)) {
        const childNext = walk(b.children);
        if (childNext !== b.children) {
          mutated = true;
          updatedChild = childNext;
        }
      }

      if (updatedChild !== b.children) {
        mutated = true;
        return { ...b, children: updatedChild };
      }
      return b;
    });
    return mutated ? next : list;
  }
  const next = walk(rootBlocks);
  return { found, next };
}

export function deleteBlockDeep(rootBlocks: BlockConfig[], targetId: string): { found: boolean; next: BlockConfig[] } {
  let found = false;
  function walk(list: BlockConfig[]): BlockConfig[] {
    let mutated = false;
    const filtered: BlockConfig[] = [];
    for (const b of list) {
      if (b.id === targetId) {
        found = true;
        mutated = true;
        continue; // drop it
      }

      let nextBlock: BlockConfig = b;

      if (Array.isArray(b.children)) {
        const childNext = walk(b.children);
        if (childNext !== b.children) {
          mutated = true;
          nextBlock = { ...nextBlock, children: childNext };
        }
      }

      filtered.push(nextBlock);
    }
    return mutated ? filtered : list;
  }
  const next = walk(rootBlocks);
  return { found, next };
}

export function duplicateBlockDeep(rootBlocks: BlockConfig[], targetId: string, generateBlockId: () => string): { found: boolean; next: BlockConfig[]; duplicatedId: string } {
  let duplicatedId: string = '';
  function remapIds(blk: BlockConfig): void {
    blk.id = generateBlockId();
    if (Array.isArray(blk.children)) blk.children.forEach(remapIds);
  }

  function walk(list: BlockConfig[]): { next: BlockConfig[]; found: boolean } {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === targetId) {
        const clone = structuredClone(b) as BlockConfig;
        remapIds(clone);
        duplicatedId = clone.id;
        const next = [...list];
        next.splice(i + 1, 0, clone);
        return { next, found: true };
      }

      if (Array.isArray(b.children)) {
        const childRes = walk(b.children);
        if (childRes.found) {
          const next = [...list];
          next[i] = { ...b, children: childRes.next };
          return { next, found: true };
        }
      }
    }
    return { next: list, found: false };
  }

  const { next, found } = walk(rootBlocks);
  return { found, next, duplicatedId };
}

/** Inserts a cloned block immediately after `targetId` at the same tree level. */
export function insertBlockAfterDeep(
  rootBlocks: BlockConfig[],
  targetId: string,
  block: BlockConfig,
  generateBlockId: () => string = generateId,
): { found: boolean; next: BlockConfig[]; insertedId: string } {
  let insertedId = block.id;

  function remapIds(blk: BlockConfig): void {
    blk.id = generateBlockId();
    insertedId = blk.id;
    if (Array.isArray(blk.children)) blk.children.forEach(remapIds);
  }

  const clone = structuredClone(block) as BlockConfig;
  remapIds(clone);

  function walk(list: BlockConfig[]): { next: BlockConfig[]; found: boolean } {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === targetId) {
        const next = [...list];
        next.splice(i + 1, 0, clone);
        return { next, found: true };
      }
      if (Array.isArray(b.children)) {
        const childRes = walk(b.children);
        if (childRes.found) {
          const next = [...list];
          next[i] = { ...b, children: childRes.next };
          return { next, found: true };
        }
      }
    }
    return { next: list, found: false };
  }

  const { next, found } = walk(rootBlocks);
  return { found, next, insertedId };
}

/**
 * Recursively set parentId for all blocks in the tree
 * @param blocks Array of blocks to process
 * @param parentId ID of the parent block, or null for root level
 * @returns New array with parentIds set
 */
export function setParentIds(blocks: BlockConfig[], parentId: string | null): BlockConfig[] {
  return blocks.map(block => ({
    ...block,
    parentId,
    ...(block.children && {
      children: setParentIds(block.children, block.id)
    })
  }));
}

/**
 * Find the parent block of a given child block ID
 * @param blocks Array of blocks to search
 * @param childId ID of the child block to find parent for
 * @returns The parent block, or null if not found
 */
export function findParentBlock(blocks: BlockConfig[], childId: string): BlockConfig | null {
  for (const block of blocks) {
    if (block.children?.some(child => child.id === childId)) {
      return block;
    }
    if (block.children) {
      const parent = findParentBlock(block.children, childId);
      if (parent) return parent;
    }
  }
  return null;
}
