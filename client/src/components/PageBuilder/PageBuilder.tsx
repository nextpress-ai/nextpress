import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { BlockConfig, Page, Post, Template } from '@shared/schema-types';
import { DragDropContext } from '@/lib/dnd';
import type { DropResult as DndDropResult } from '@/lib/dnd';
import { generateBlockId } from './utils';
import { useDragAndDropHandler } from '../../hooks/useDragAndDropHandler';
import { usePageSave } from '../../hooks/usePageSave';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { BuilderResponsiveSidebar, useBuilderWideLayout } from './BuilderResponsiveSidebar';
import { BuilderInspectorSidebar } from './BuilderInspectorSidebar';
import { BuilderTopBar } from './BuilderTopBar';
import { BuilderCanvas } from './BuilderCanvas';
import PageSettingsModal from './PageSettings';
import { blockRegistry } from './blocks';
import { BlockActionsProvider } from './BlockActionsContext';
import { PageProvider, type PostDocumentFields, type PostDocumentValue } from './PageContext';
import { parsePostOther } from '@shared/posts/post-other';
import type { AuthorDisplay } from '@shared/author-display';
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
import { persistResponsiveDefaultsToBlocks } from '@shared/persist-responsive-defaults';
import { writePreviewSession } from '@shared/preview-session';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { CreatePageModal } from '@/components/Pages/CreatePageModal';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { runParentOwnedSave } from '@/lib/run-parent-save';
import { SkipLink } from '@/components/a11y/skip-link';
import { MotionSidebarPanel } from '@/components/motion/motion-primitives';

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
  onSettingsUpdate?: (updatedData: Page | Post | Template) => void;
  onSaveRequest?: (blocks: BlockConfig[]) => void | Promise<boolean | Page | Post | Template>;
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
  onPostDocumentChange?: (patch: {
    excerpt?: string;
    featuredImage?: string;
    categories?: string[];
    tags?: string[];
  }) => void;
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
  onSettingsUpdate,
  onSaveRequest,
  onPreview,
  pageMeta,
  onPageMetaChange,
  onPostDocumentChange,
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
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const postRecord = data as {
    id?: string;
    authorId?: string | null;
    excerpt?: string | null;
    featuredImage?: string | null;
    categories?: string[];
    tags?: string[];
    publishedAt?: string | Date | null;
    createdAt?: string | Date | null;
    author?: AuthorDisplay | null;
    other?: unknown;
  } | undefined;
  const parsedPostOther = parsePostOther(postRecord?.other);
  const [postDoc, setPostDoc] = useState({
    excerpt: String(postRecord?.excerpt ?? ''),
    featuredImage: String(postRecord?.featuredImage ?? ''),
    categories: postRecord?.categories ?? parsedPostOther.categories ?? [],
    tags: postRecord?.tags ?? parsedPostOther.tags ?? [],
  });
  const [prevPostDocId, setPrevPostDocId] = useState(postRecord?.id);
  if (postRecord?.id !== prevPostDocId) {
    setPrevPostDocId(postRecord?.id);
    const nextOther = parsePostOther(postRecord?.other);
    setPostDoc({
      excerpt: String(postRecord?.excerpt ?? ''),
      featuredImage: String(postRecord?.featuredImage ?? ''),
      categories: postRecord?.categories ?? nextOther.categories ?? [],
      tags: postRecord?.tags ?? nextOther.tags ?? [],
    });
  }
  const historyMutationRef = useRef(0);
  const pendingDeleteUndoRef = useRef<number | null>(null);
  const parentSaveInFlightRef = useRef(false);

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

      if (resolved !== current) {
        historyMutationRef.current += 1;
        pendingDeleteUndoRef.current = null;
      }

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
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'blocks' | 'settings'>('settings');
  const [hoverHighlight, setHoverHighlight] = useState<
    'padding' | 'margin' | null
  >(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const isWideLayout = useBuilderWideLayout();
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const { toast } = useToast();

  const previewContentType = isTemplate ? 'template' : resolvedContentType;
  const previewUrl = useMemo(() => {
    if (!data?.id) return '';
    if (isTemplate) return `/preview/template/${data.id}?live=1`;
    if (resolvedContentType === 'post') return `/preview/post/${data.id}?live=1`;
    return `/preview/page/${data.id}?live=1`;
  }, [data?.id, isTemplate, resolvedContentType]);

  useEffect(() => {
    if (!isPreviewMode || !data?.id) return undefined;
    const timer = setTimeout(() => {
      writePreviewSession({
        contentType: previewContentType,
        contentId: data.id,
        payload: {
          blocks,
          title: isTemplate ? (data as { name?: string }).name : (data as Page).title,
          design: (data as Page)?.other?.design,
          savedAt: Date.now(),
        },
      });
      setPreviewRefreshKey((key) => key + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [isPreviewMode, blocks, data, isTemplate, previewContentType]);

  const handleApplyResponsiveDefaults = useCallback(() => {
    const confirmed = window.confirm(
      'Apply mobile-friendly defaults to blocks that are missing them? Existing styles you set will not be changed.',
    );
    if (!confirmed) return;

    const { blocks: nextBlocks, changedCount } = persistResponsiveDefaultsToBlocks({ blocks });
    if (changedCount === 0) {
      toast({
        title: 'Nothing to update',
        description: 'All blocks already use responsive defaults.',
      });
      return;
    }

    commitBlocks(nextBlocks);
    toast({
      title: 'Defaults applied',
      description: `Updated ${changedCount} block${changedCount === 1 ? '' : 's'} for better mobile layout.`,
    });
  }, [blocks, commitBlocks, toast]);

  const handleTogglePreviewMode = useCallback(() => {
    setIsPreviewMode((prev) => !prev);
  }, []);

  // Parent notification is now done procedurally in commitBlocks

  const selectedBlock = selectedBlockId
    ? (findBlock(blocks, selectedBlockId) ?? null)
    : null;

  const saveMutation = usePageSave({
    isTemplate,
    data,
    onSave,
    pageMeta,
    contentType: resolvedContentType,
  });

  const handleSave = useCallback(() => {
    if (onSaveRequest) {
      runParentOwnedSave({
        inFlight: parentSaveInFlightRef,
        request: async () => {
          const result = await onSaveRequest(blocks);
          if (result && typeof result === 'object' && 'id' in result) {
            onSave?.(result);
          }
          return Boolean(result);
        },
      });
      return;
    }

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
  }, [
    blocks,
    saveMutation,
    onSave,
    onSaveRequest,
    data,
    isTemplate,
    resolvedContentType,
  ]);

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
      commitBlocks(() => setParentIds(next, null));
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
      const deletedBlock = findBlock(blocks, id);
      const blockLabel =
        blockRegistry[deletedBlock?.name ?? '']?.label ?? deletedBlock?.name ?? 'Block';
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

      const undoGeneration = historyMutationRef.current;
      pendingDeleteUndoRef.current = undoGeneration;

      toast({
        title: 'Block deleted',
        description: `${blockLabel} removed from the page.`,
        action: (
          <ToastAction
            altText="Undo delete"
            onClick={() => {
              if (pendingDeleteUndoRef.current !== undoGeneration) return;
              undo();
              pendingDeleteUndoRef.current = null;
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    [blocks, commitBlocks, selectedBlockId, setActiveTab, toast, undo],
  );

  // Keep keyboard-shortcut refs current (handlers defined above the listener)
  handleDeleteRef.current = handleDelete;
  handleDuplicateRef.current = handleDuplicate;
  handleCopyRef.current = handleCopy;
  handlePasteRef.current = handlePaste;

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const toggleInspector = () => {
    setInspectorVisible(!inspectorVisible);
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
      if (!isWideLayout) {
        setActiveTab('blocks');
      }
    },
    [isWideLayout, resetState, onBlocksChange],
  );

  const updatePostDocument = (patch: PostDocumentFields) => {
    setPostDoc((current) => ({
      excerpt: patch.excerpt ?? current.excerpt,
      featuredImage: patch.featuredImage ?? current.featuredImage,
      categories: patch.categories ?? current.categories,
      tags: patch.tags ?? current.tags,
    }));
    if (patch.title !== undefined) {
      onPageMetaChange?.({ title: patch.title });
    }
    onPostDocumentChange?.(patch);
  };

  const postDocument: PostDocumentValue | null =
    resolvedContentType === 'post' && (currentPostId || postRecord?.id)
      ? {
          contentType: 'post',
          postId: currentPostId || postRecord?.id,
          authorId: postRecord?.authorId ?? undefined,
          title: pageMeta?.title ?? '',
          excerpt: postDoc.excerpt,
          featuredImage: postDoc.featuredImage,
          categories: postDoc.categories,
          tags: postDoc.tags,
          publishedAt:
            postRecord?.publishedAt instanceof Date
              ? postRecord.publishedAt.toISOString()
              : postRecord?.publishedAt ?? null,
          createdAt:
            postRecord?.createdAt instanceof Date
              ? postRecord.createdAt.toISOString()
              : postRecord?.createdAt ?? null,
          author: postRecord?.author ?? null,
          updateDocument: updatePostDocument,
        }
      : null;

  return (
    <div className="npb-editor-shell flex h-full min-h-0 flex-col bg-npb-canvas-bg">
      <SkipLink href="#builder-canvas">Skip to canvas</SkipLink>
      <PageProvider pageOther={data?.other as any} postDocument={postDocument}>
        <DeviceViewProvider device={deviceView}>
        <BlockActionsProvider
        value={{
          selectedBlockId,
          onSelect: (id) => {
            setSelectedBlockId(id);
            if (id && !isWideLayout) {
              setActiveTab('settings');
            }
          },
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
          hoverHighlight,
        }}>
        <div className="flex min-h-0 flex-1 flex-col">
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
          <div className="flex min-h-0 flex-1">
            {sidebarVisible ? (
              <MotionSidebarPanel visible={sidebarVisible} className="h-full shrink-0">
                <BuilderResponsiveSidebar
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  selectedBlock={selectedBlock}
                  updateBlock={updateBlockPartial}
                  setHoverHighlight={setHoverHighlight}
                  sidebarVisible={sidebarVisible}
                  onToggleSidebar={toggleSidebar}
                  onInsertTemplate={handleInsertTemplate}
                  blocks={blocks}
                  onApplyResponsiveDefaults={handleApplyResponsiveDefaults}
                />
              </MotionSidebarPanel>
            ) : null}
            <div className="npb-editor-main flex min-h-0 min-w-0 flex-1 flex-col">
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
                inspectorVisible={isWideLayout ? inspectorVisible : undefined}
                onToggleInspector={isWideLayout ? toggleInspector : undefined}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onPageSettingsClick={() => setPageSettingsOpen(true)}
                isPreviewMode={isPreviewMode}
                onTogglePreviewMode={previewUrl ? handleTogglePreviewMode : undefined}
                onApplyResponsiveDefaults={handleApplyResponsiveDefaults}
                onCreateNewPage={() => setShowCreatePageModal(true)}
                onCreateNewPost={() => setShowCreatePostModal(true)}
              />
              <div className="flex min-h-0 flex-1">
                <BuilderCanvas
                  blocks={blocks}
                  deviceView={deviceView}
                  selectedBlockId={selectedBlockId}
                  isPreviewMode={isPreviewMode}
                  previewUrl={previewUrl}
                  previewRefreshKey={previewRefreshKey}
                  duplicateBlock={handleDuplicate}
                  deleteBlock={handleDelete}
                  hoverHighlight={hoverHighlight}
                  onBlockChange={handleBlockChange}
                />
                {isWideLayout && inspectorVisible ? (
                  <MotionSidebarPanel visible={inspectorVisible} className="h-full shrink-0">
                    <BuilderInspectorSidebar
                      selectedBlock={selectedBlock}
                      updateBlock={updateBlockPartial}
                      setHoverHighlight={setHoverHighlight}
                      onToggleInspector={toggleInspector}
                    />
                  </MotionSidebarPanel>
                ) : null}
              </div>
            </div>
          </div>
        </DragDropContext>
        <PageSettingsModal
          key={`${data?.id ?? ''}:${pageSettingsOpen}`}
          open={pageSettingsOpen}
          onOpenChange={setPageSettingsOpen}
          page={data}
          isTemplate={isTemplate}
          onUpdate={onSettingsUpdate}
          onMetaChange={onPageMetaChange}
          contentType={resolvedContentType}
        />
        <CreatePageModal
          open={showCreatePageModal}
          onOpenChange={setShowCreatePageModal}
        />
        <CreatePostDialog
          open={showCreatePostModal}
          onOpenChange={setShowCreatePostModal}
        />
        </div>
      </BlockActionsProvider>
        </DeviceViewProvider>
      </PageProvider>
    </div>
  );
}
