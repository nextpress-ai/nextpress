import { useState, useEffect, useCallback, useRef } from 'react';
import type { BlockConfig, Page, Post, Template } from '@shared/schema-types';
import { DragDropContext } from '@/lib/dnd';
import type { DropResult as DndDropResult } from '@/lib/dnd';
import { generateBlockId } from './utils';
import { useDragAndDropHandler } from '../../hooks/useDragAndDropHandler';
import { usePageSave } from '../../hooks/usePageSave';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderTopBar } from './BuilderTopBar';
import { BuilderCanvas } from './BuilderCanvas';
import PageSettingsModal from './PageSettings';
import { blockRegistry } from './blocks';
import { BlockActionsProvider } from './BlockActionsContext';
import { PageProvider } from './PageContext';
import { savePageDraftWithHistory } from '@/lib/pageDraftStorage';
import {
  findBlock,
  updateBlockDeep,
  deleteBlockDeep,
  duplicateBlockDeep,
  insertBlockAfterDeep,
  setParentIds,
} from '@/lib/handlers/treeUtils';
import { DeviceViewProvider } from './device-view-context';
import {
  copyBlockToClipboard,
  readBlockFromClipboard,
} from './block-clipboard';
import { reIdTemplateBlocks } from '@/lib/re-id-template-blocks';

function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}

function isDescendant(
  blocks: BlockConfig[],
  ancestorId: string,
  candidateId: string,
): boolean {
  const queue = [...blocks];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === ancestorId) {
      return containsChild(current, candidateId);
    }
    if (Array.isArray(current.children)) {
      queue.push(...current.children);
    }
  }
  return false;
}

function containsChild(block: BlockConfig, targetId: string): boolean {
  if (!Array.isArray(block.children)) return false;
  for (const child of block.children) {
    if (child.id === targetId) return true;
    if (containsChild(child, targetId)) return true;
  }
  return false;
}

interface PageBuilderProps {
  post?: Page;
  template?: never;
  blocks?: BlockConfig[];
  onBlocksChange?: (blocks: BlockConfig[]) => void;
  onSave?: (updatedData: Page | Post | Template) => void;
  onPreview?: () => void;
  pageMeta?: {
    title?: string;
    slug?: string;
    status?: string;
    version?: number;
  };
  onPageMetaChange?: (
    meta: Partial<{ title: string; slug: string; status: string }>,
  ) => void;
  currentPostId?: string;
  contentType?: 'post' | 'page' | 'template';
  isTemplateEditor?: boolean;
}

export default function PageBuilder({
  post,
  template,
  blocks: propBlocks,
  onBlocksChange,
  onSave,
  onPreview,
  pageMeta,
  onPageMetaChange,
  currentPostId,
  contentType,
  isTemplateEditor = false,
}: PageBuilderProps) {
  const data = post;
  const isTemplate = isTemplateEditor;
  const resolvedContentType =
    contentType === 'template' ? 'page' : (contentType ?? 'page');

  const initialBlocks = setParentIds(
    propBlocks || (data ? (data.blocks as BlockConfig[]) || [] : []),
    null,
  );

  // Use undo/redo for blocks state - derive blocks directly from currentState
  const { currentState, pushState, replaceCurrentState, undo, redo, canUndo, canRedo, resetState } =
    useUndoRedo<BlockConfig[]>(initialBlocks);
  const blocks = currentState; // Direct derivation - no separate state
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  /**
   * Detect when the parent swaps propBlocks externally (e.g. inline post editing).
   * We track the last propBlocks ref we emitted via onBlocksChange to distinguish
   * "our own update bouncing back" from "a genuinely new external array".
   *
   * Uses the "adjusting state during render" pattern (no useEffect) —
   * track previous propBlocks and reset if genuinely new.
   */
  const lastEmittedRef = useRef<BlockConfig[] | null>(null);
  const selectedBlockIdRef = useRef<string | null>(selectedBlockId);
  selectedBlockIdRef.current = selectedBlockId;

  const [prevPropBlocks, setPrevPropBlocks] = useState<BlockConfig[] | undefined>(propBlocks);
  if (propBlocks !== prevPropBlocks) {
    setPrevPropBlocks(propBlocks);
    if (propBlocks && propBlocks !== lastEmittedRef.current) {
      // External reset — new blocks from outside, reset undo/redo history
      resetState(setParentIds(propBlocks, null));
      // Only deselect if the currently selected block no longer exists in the new blocks
      const currentSelectedId = selectedBlockIdRef.current;
      if (currentSelectedId && !findBlock(propBlocks, currentSelectedId)) {
        setSelectedBlockId(null);
      }
    }
  }

  // Refs for stable callback identity in commitBlocks and handlers
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  const onBlocksChangeRef = useRef(onBlocksChange);
  onBlocksChangeRef.current = onBlocksChange;

  /**
   * Coalescing undo history: rapid edits (keystrokes) replace the current
   * history entry instead of creating new ones. After 300ms of silence,
   * the next edit creates a new entry. This gives word-level undo granularity.
   */
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCoalescingRef = useRef(false);

  // Cleanup coalesce timer on unmount
  useMountEffect(() => {
    return () => {
      if (coalesceTimerRef.current !== null) {
        clearTimeout(coalesceTimerRef.current);
      }
    };
  });

  /**
   * Commit a blocks update to undo/redo history and notify parent.
   * Uses coalescing: rapid calls within 300ms replace the current history
   * entry; after a pause, the next call creates a new entry.
   * Canvas always receives fresh state immediately via pushState/replaceCurrentState.
   */
  const commitBlocks = useCallback(
    (next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => {
      const current = currentStateRef.current;
      const resolved =
        typeof next === 'function'
          ? (next as (p: BlockConfig[]) => BlockConfig[])(current)
          : next;
      if (resolved === current) return;

      // Coalesce rapid edits: replace current entry if within 300ms window
      if (isCoalescingRef.current) {
        replaceCurrentState(resolved);
      } else {
        pushState(resolved);
      }

      // Notify parent immediately
      lastEmittedRef.current = resolved;
      onBlocksChangeRef.current?.(resolved);

      // Enter/extend coalesce window: subsequent edits within 300ms
      // replace the current entry instead of creating new undo steps
      isCoalescingRef.current = true;
      if (coalesceTimerRef.current !== null) {
        clearTimeout(coalesceTimerRef.current);
      }
      coalesceTimerRef.current = setTimeout(() => {
        isCoalescingRef.current = false;
        coalesceTimerRef.current = null;
      }, 300);
    },
    [pushState, replaceCurrentState],
  );

  const updateBlockPartial = useCallback(
    (blockId: string, updates: Partial<BlockConfig>) => {
      commitBlocks((prev) => {
        const { found, next } = updateBlockDeep(prev, blockId, updates);
        return found ? next : prev;
      });
    },
    [commitBlocks],
  );

  const handleBlockChange = useCallback(
    (updated: BlockConfig) => {
      commitBlocks((prev) => {
        const { found, next } = updateBlockDeep(prev, updated.id, updated);
        return found ? next : prev;
      });
    },
    [commitBlocks],
  );
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'settings'>('settings');
  const [hoverHighlight, setHoverHighlight] = useState<
    'padding' | 'margin' | null
  >(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);

  // Parent notification is now done procedurally in commitBlocks

  const selectedBlock = selectedBlockId
    ? findBlock(blocks, selectedBlockId)
    : null;

  const saveMutation = usePageSave({
    isTemplate,
    data,
    onSave,
    pageMeta,
    contentType: resolvedContentType,
  });

  const handleSave = useCallback(() => {
    if (!isTemplate && resolvedContentType === 'page' && data?.id) {
      savePageDraftWithHistory(data.id as string, {
        ...data,
        blocks,
        updatedAt: new Date(),
      });
    }
    saveMutation.mutate(blocks);
    if (data) {
      onSave?.(data);
    }
  }, [blocks, saveMutation, onSave, data, isTemplate, resolvedContentType]);

  // Refs for keyboard shortcut handlers so useMountEffect captures stable references
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const undoRef = useRef(undo);
  undoRef.current = undo;

  const redoRef = useRef(redo);
  redoRef.current = redo;

  // Refs for block-level shortcut handlers (defined later in the component).
  // Assigned below their definitions so the mount-only listener stays stable.
  const handleDeleteRef = useRef<(id: string) => void>(() => {});
  const handleDuplicateRef = useRef<(id: string) => void>(() => {});
  const handleCopyRef = useRef<(id: string) => void>(() => {});
  const handlePasteRef = useRef<() => void>(() => {});

  useMountEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // End coalesce window so next edit after undo creates a new entry
        isCoalescingRef.current = false;
        undoRef.current();
        return;
      }
      if (isMod && ((e.shiftKey && key === 'z') || key === 'y')) {
        e.preventDefault();
        // End coalesce window so next edit after redo creates a new entry
        isCoalescingRef.current = false;
        redoRef.current();
        return;
      }
      if (isMod && key === 's') {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }

      // Block-level shortcuts must never hijack keys while the user is typing
      // in a field or editing inline block text (contentEditable).
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditable) return;

      const selectedId = selectedBlockIdRef.current;
      if (!selectedId) return;

      if (key === 'escape') {
        e.preventDefault();
        setSelectedBlockId(null);
      } else if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        handleDeleteRef.current(selectedId);
      } else if (isMod && key === 'd') {
        e.preventDefault();
        handleDuplicateRef.current(selectedId);
      } else if (isMod && key === 'c') {
        e.preventDefault();
        handleCopyRef.current(selectedId);
      } else if (isMod && key === 'v') {
        e.preventDefault();
        handlePasteRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const setBlocksFromDnD = useCallback(
    (next: BlockConfig[]) => {
      commitBlocks(() => next);
    },
    [commitBlocks],
  );

  const { handleDragEnd } = useDragAndDropHandler(
    blocks,
    setBlocksFromDnD,
    setSelectedBlockId,
    setActiveTab,
    currentPostId,
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      let newId: string | undefined;
      commitBlocks((prev) => {
        const { found, next, duplicatedId } = duplicateBlockDeep(
          prev,
          id,
          generateBlockId,
        );
        if (!found) {
          return prev;
        }
        newId = duplicatedId || undefined;
        return next;
      });
      if (newId) {
        setSelectedBlockId(newId);
        setActiveTab('settings');
      }
    },
    [commitBlocks, setActiveTab],
  );

  const handleCopy = useCallback(
    (id: string) => {
      const block = findBlock(blocks, id);
      if (block) copyBlockToClipboard({ block });
    },
    [blocks],
  );

  const handlePaste = useCallback(() => {
    const clip = readBlockFromClipboard();
    if (!clip) return;

    const selectedId = selectedBlockIdRef.current;
    let insertedId: string | undefined;

    commitBlocks((prev) => {
      if (prev.length === 0) {
        const rootClone = structuredClone(clip) as BlockConfig;
        const assignIds = (blk: BlockConfig): void => {
          blk.id = generateBlockId();
          insertedId = blk.id;
          if (Array.isArray(blk.children)) blk.children.forEach(assignIds);
        };
        assignIds(rootClone);
        return [rootClone];
      }

      const anchorId = selectedId ?? prev[prev.length - 1]?.id;
      if (!anchorId) return prev;

      const { found, next, insertedId: id } = insertBlockAfterDeep(
        prev,
        anchorId,
        clip,
        generateBlockId,
      );
      if (!found) return prev;
      insertedId = id;
      return next;
    });

    if (insertedId) {
      setSelectedBlockId(insertedId);
      setActiveTab('settings');
    }
  }, [commitBlocks, setActiveTab]);

  const handleDelete = useCallback(
    (id: string) => {
      const shouldClearSelection =
        selectedBlockId === id ||
        (selectedBlockId != null && isDescendant(blocks, id, selectedBlockId));

      commitBlocks((prev) => {
        const { next } = deleteBlockDeep(prev, id);
        return next;
      });

      if (shouldClearSelection) {
        setSelectedBlockId(null);
        setActiveTab('blocks');
      }
    },
    [blocks, commitBlocks, selectedBlockId, setActiveTab],
  );

  // Keep keyboard-shortcut refs current (handlers defined above the listener)
  handleDeleteRef.current = handleDelete;
  handleDuplicateRef.current = handleDuplicate;
  handleCopyRef.current = handleCopy;
  handlePasteRef.current = handlePaste;

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  /**
   * Insert template blocks at the end of the current canvas.
   * Generates new IDs for all blocks to avoid conflicts.
   */
  const handleInsertTemplate = useCallback(
    (templateBlocks: BlockConfig[]) => {
      const newBlocks = reIdTemplateBlocks(templateBlocks);
      commitBlocks((prev) => [...prev, ...newBlocks]);
    },
    [commitBlocks],
  );

  const handleApplyTemplateFromDesign = useCallback(
    ({ blocks }: { templateId: string; blocks: BlockConfig[] }) => {
      resetState(blocks);
      onBlocksChange?.(blocks);
      setSelectedBlockId(null);
      setActiveTab('blocks');
    },
    [resetState, onBlocksChange],
  );

  return (
    <div className="npb-editor-shell flex h-full bg-npb-canvas-bg">
      <PageProvider pageOther={data?.other as any}>
        <DeviceViewProvider device={deviceView}>
        <BlockActionsProvider
        value={{
          selectedBlockId,
          onSelect: (id) => {
            setSelectedBlockId(id);
            setActiveTab('settings');
          },
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
          hoverHighlight,
        }}>
        <DragDropContext
          onDragEnd={(result: DndDropResult) => handleDragEnd(result)}
          onDragStart={() => {/* DnD started */}}
          renderOverlay={({ id }) => {
            // id may refer directly to block definition id (library drag) or block instance id (canvas drag)
            // Attempt to resolve instance id by checking current blocks mapping name
            let def = blockRegistry[id];
            if (!def) {
              const instance = blocks.find((b) => b.id === id);
              if (instance) def = blockRegistry[instance.name];
            }
            return (
              <div
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  borderRadius: 0,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  color: '#374151',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                {def?.icon ? (
                  <def.icon className="w-4 h-4 text-npb-text-secondary" />
                ) : null}
                <span style={{ opacity: 0.85 }}>{def?.label || id}</span>
              </div>
            );
          }}>
          {sidebarVisible && (
            <BuilderSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedBlock={selectedBlock}
              updateBlock={updateBlockPartial}
              setHoverHighlight={setHoverHighlight}
              sidebarVisible={sidebarVisible}
              onToggleSidebar={toggleSidebar}
              onInsertTemplate={handleInsertTemplate}
            />
          )}
          <div className="flex-1 flex flex-col">
            <BuilderTopBar
              data={data}
              isTemplate={isTemplate}
              contentType={contentType ?? 'page'}
              onApplyTemplate={handleApplyTemplateFromDesign}
              deviceView={deviceView}
              setDeviceView={setDeviceView}
              blocks={blocks}
              sidebarVisible={sidebarVisible}
              onToggleSidebar={toggleSidebar}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onPageSettingsClick={() => setPageSettingsOpen(true)}
            />
            <BuilderCanvas
              blocks={blocks}
              deviceView={deviceView}
              selectedBlockId={selectedBlockId}
              isPreviewMode={isPreviewMode}
              duplicateBlock={handleDuplicate}
              deleteBlock={handleDelete}
              hoverHighlight={hoverHighlight}
              onBlockChange={handleBlockChange}
            />
          </div>
        </DragDropContext>
        <PageSettingsModal
          key={data?.id}
          open={pageSettingsOpen}
          onOpenChange={setPageSettingsOpen}
          page={data}
          isTemplate={isTemplate}
          onUpdate={onSave}
          onMetaChange={onPageMetaChange}
          contentType={resolvedContentType}
        />
      </BlockActionsProvider>
        </DeviceViewProvider>
      </PageProvider>
    </div>
  );
}
