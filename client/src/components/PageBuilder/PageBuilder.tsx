import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { BlockConfig, Page, PageOther, Post, Template } from '@shared/schema-types';
import { DragDropContext } from '@/lib/dnd';
import type { DropResult as DndDropResult } from '@/lib/dnd';
import { generateBlockId } from './utils';
import { usePageTransfer } from './use-page-transfer';
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
  DELETE_DRAFT_SAVE_MS,
  type DraftSaveCause,
} from '@/lib/draft-save-delay';
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
import { applyResponsiveHealthFixes, validateBlockResponsiveHealth } from '@shared/validate-block-responsive-health';
import { writePreviewSession } from '@shared/preview-session';
import { readPageDesign } from '@shared/page-shell-model';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { CreatePageModal } from '@/components/Pages/CreatePageModal';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { runParentOwnedSave } from '@/lib/run-parent-save';
import { SkipLink } from '@/components/a11y/skip-link';
import { MotionSidebarPanel } from '@/components/motion/motion-primitives';
import { EditorColorMemoryProvider } from './color-memory';
import { EditorPopupsProvider } from './popup-links';

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
  onBlocksChange?: (blocks: BlockConfig[], change?: { cause?: DraftSaveCause }) => void;
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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
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
  const editingBlockIdRef = useRef<string | null>(editingBlockId);
  editingBlockIdRef.current = editingBlockId;

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
        setEditingBlockId(null);
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
    (
      next: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[]),
      change?: { cause?: DraftSaveCause },
    ) => {
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

      lastEmittedRef.current = resolved;
      onBlocksChangeRef.current?.(resolved, { cause: change?.cause ?? 'edit' });

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
          design: readPageDesign({ blocks }),
          savedAt: Date.now(),
        },
      });
      setPreviewRefreshKey((key) => key + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [isPreviewMode, blocks, data, isTemplate, previewContentType]);

  const responsiveHealthIssueKey = useMemo(
    () =>
      validateBlockResponsiveHealth(blocks)
        .issues.map((issue) => `${issue.blockId}:${issue.code}`)
        .sort()
        .join('|'),
    [blocks],
  );
  const [dismissedResponsiveHealthKey, setDismissedResponsiveHealthKey] = useState<string | null>(
    null,
  );
  const responsiveHealthBannerDismissed =
    dismissedResponsiveHealthKey === responsiveHealthIssueKey;

  const handleApplyResponsiveDefaults = useCallback((): boolean => {
    const confirmed = window.confirm(
      'Apply mobile-friendly defaults to blocks that are missing them, and fix the blocks listed in the mobile layout check?',
    );
    if (!confirmed) return false;

    const withDefaults = persistResponsiveDefaultsToBlocks({ blocks });
    const { blocks: nextBlocks, fixedCount } = applyResponsiveHealthFixes(withDefaults.blocks);
    const changedCount = withDefaults.changedCount + fixedCount;
    if (changedCount === 0) {
      toast({
        title: 'Nothing to update',
        description: 'All blocks already use responsive defaults.',
      });
      setDismissedResponsiveHealthKey(responsiveHealthIssueKey);
      return true;
    }

    commitBlocks(nextBlocks);
    setDismissedResponsiveHealthKey(responsiveHealthIssueKey);
    toast({
      title: 'Defaults applied',
      description: `Updated ${changedCount} block${changedCount === 1 ? '' : 's'} for better mobile layout.`,
    });
    return true;
  }, [blocks, commitBlocks, responsiveHealthIssueKey, toast]);

  const handleTogglePreviewMode = useCallback(() => {
    if (!isPreviewMode && data?.id) {
      writePreviewSession({
        contentType: previewContentType,
        contentId: data.id,
        payload: {
          blocks: currentStateRef.current,
          title: isTemplate
            ? (data as { name?: string }).name
            : (data as Page).title,
          design: readPageDesign({ blocks: currentStateRef.current }),
          savedAt: Date.now(),
        },
      });
    }
    setIsPreviewMode((prev) => !prev);
  }, [data, isPreviewMode, isTemplate, previewContentType]);

  // Parent notification is now done procedurally in commitBlocks

  const selectedBlock = selectedBlockId
    ? (findBlock(blocks, selectedBlockId) ?? null)
    : null;
  const parentBlock = selectedBlock?.parentId
    ? findBlock(blocks, selectedBlock.parentId)
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

  /**
   * Undo/redo only move the canvas history. Save and Preview read the parent copy,
   * so the restored tree has to be emitted in the same click or those stay on the deleted tree.
   */
  const undoAndSync = useCallback(() => {
    isCoalescingRef.current = false;
    if (coalesceTimerRef.current !== null) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    const next = undo();
    if (!next) return;
    lastEmittedRef.current = next;
    onBlocksChangeRef.current?.(next, { cause: 'edit' });
  }, [undo]);

  const redoAndSync = useCallback(() => {
    isCoalescingRef.current = false;
    if (coalesceTimerRef.current !== null) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    const next = redo();
    if (!next) return;
    lastEmittedRef.current = next;
    onBlocksChangeRef.current?.(next, { cause: 'edit' });
  }, [redo]);

  const undoRef = useRef(undoAndSync);
  undoRef.current = undoAndSync;

  const redoRef = useRef(redoAndSync);
  redoRef.current = redoAndSync;

  // Refs for block-level shortcut handlers (defined later in the component).
  // Assigned below their definitions so the mount-only listener stays stable.
  const handleDeleteRef = useRef<(id: string) => void>(() => {});
  const handleDuplicateRef = useRef<(id: string) => void>(() => {});
  const handleCopyRef = useRef<(id: string) => void>(() => {});

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

      const selectedId = selectedBlockIdRef.current;
      const currentEditingId = editingBlockIdRef.current;

      // Escape must exit editing even while focus is inside an inline editor
      // (input/textarea), so it is handled before the editable-target guard.
      if (key === 'escape') {
        e.preventDefault();
        if (currentEditingId) {
          setEditingBlockId(null);
        } else {
          setSelectedBlockId(null);
        }
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

      if (key === 'enter' && !isMod && !e.shiftKey) {
        if (selectedId && !currentEditingId) {
          e.preventDefault();
          setEditingBlockId(selectedId);
          return;
        }
      }

      if (!selectedId) return;

      // If currently in active edit mode, do not trigger destructive or layout shortcuts
      if (currentEditingId) return;

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        handleDeleteRef.current(selectedId);
      } else if (isMod && key === 'd') {
        e.preventDefault();
        handleDuplicateRef.current(selectedId);
      } else if (isMod && key === 'c') {
        e.preventDefault();
        handleCopyRef.current(selectedId);
      }
      // Ctrl+V is handled by the paste event in usePageTransfer, which needs no clipboard permission.
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

  /** Puts one block after the selected block (or at the end) with fresh ids, then selects it. */
  const insertBlockAtSelection = useCallback((clip: BlockConfig) => {
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

  const pasteFromBuilderCopy = useCallback(() => {
    const clip = readBlockFromClipboard();
    if (clip) insertBlockAtSelection(clip);
  }, [insertBlockAtSelection]);

  const pageTransfer = usePageTransfer({
    blocks,
    commitBlocks,
    insertBlockAtSelection,
    pasteFromBuilderCopy,
    canPasteHere: () => selectedBlockIdRef.current != null && editingBlockIdRef.current == null,
    generateId: generateBlockId,
    page:
      !isTemplate && resolvedContentType === 'page' && data?.id
        ? { id: String(data.id), title: String((data as Page).title ?? '') }
        : null,
  });

  const handleCopy = useCallback(
    (id: string) => {
      const block = findBlock(blocks, id);
      if (!block) return;
      copyBlockToClipboard({ block });
      void pageTransfer.copyBlock(block);
    },
    [blocks, pageTransfer],
  );

  const handlePaste = useCallback(() => {
    void pageTransfer.paste();
  }, [pageTransfer]);

  const handleDelete = useCallback(
    (id: string) => {
      const shouldClearSelection =
        selectedBlockId === id ||
        (selectedBlockId != null && isDescendant(blocks, id, selectedBlockId));

      commitBlocks((prev) => {
        const { next } = deleteBlockDeep(prev, id);
        return next;
      }, { cause: 'delete' });

      if (shouldClearSelection) {
        setSelectedBlockId(null);
        setEditingBlockId(null);
        setActiveTab('blocks');
      } else if (editingBlockId === id || (editingBlockId != null && isDescendant(blocks, id, editingBlockId))) {
        setEditingBlockId(null);
      }

      const undoGeneration = historyMutationRef.current;
      pendingDeleteUndoRef.current = undoGeneration;

      toast({
        title: 'Block removed',
        description: 'Not saved yet. Undo, or Save to keep it off the page.',
        duration: DELETE_DRAFT_SAVE_MS,
        action: (
          <ToastAction
            altText="Undo remove"
            onClick={() => {
              if (pendingDeleteUndoRef.current !== undoGeneration) return;
              undoAndSync();
              pendingDeleteUndoRef.current = null;
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    [blocks, commitBlocks, selectedBlockId, setActiveTab, toast, undoAndSync],
  );

  // Keep keyboard-shortcut refs current (handlers defined above the listener)
  handleDeleteRef.current = handleDelete;
  handleDuplicateRef.current = handleDuplicate;
  handleCopyRef.current = handleCopy;

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
      onBlocksChange?.(blocks, { cause: 'edit' });
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
        <EditorColorMemoryProvider blocks={blocks}>
        <EditorPopupsProvider blocks={blocks}>
        <DeviceViewProvider device={deviceView}>
        <BlockActionsProvider
        value={{
          selectedBlockId,
          editingBlockId,
          hoveredBlockId,
          onSelect: (id) => {
            setSelectedBlockId(id);
            if (id !== editingBlockIdRef.current) {
              setEditingBlockId(null);
            }
            if (id && !isWideLayout) {
              setActiveTab('settings');
            }
          },
          onStartEditing: (id) => {
            setSelectedBlockId(id);
            setEditingBlockId(id);
          },
          onStopEditing: () => {
            setEditingBlockId(null);
          },
          onHoverBlock: setHoveredBlockId,
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
                  parentBlock={parentBlock}
                  updateBlock={updateBlockPartial}
                  setHoverHighlight={setHoverHighlight}
                  sidebarVisible={sidebarVisible}
                  onToggleSidebar={toggleSidebar}
                  onInsertTemplate={handleInsertTemplate}
                  blocks={blocks}
                  onApplyResponsiveDefaults={handleApplyResponsiveDefaults}
                  responsiveHealthBannerDismissed={responsiveHealthBannerDismissed}
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
                selectedBlockId={selectedBlockId}
                onSelectBlock={(id) => {
                  setSelectedBlockId(id);
                  if (id !== editingBlockIdRef.current) {
                    setEditingBlockId(null);
                  }
                  if (!isWideLayout) {
                    setActiveTab('settings');
                  }
                }}
                sidebarVisible={sidebarVisible}
                onToggleSidebar={toggleSidebar}
                inspectorVisible={isWideLayout ? inspectorVisible : undefined}
                onToggleInspector={isWideLayout ? toggleInspector : undefined}
                onUndo={undoAndSync}
                onRedo={redoAndSync}
                canUndo={canUndo}
                canRedo={canRedo}
                onPageSettingsClick={() => setPageSettingsOpen(true)}
                isPreviewMode={isPreviewMode}
                onTogglePreviewMode={previewUrl ? handleTogglePreviewMode : undefined}
                onApplyResponsiveDefaults={handleApplyResponsiveDefaults}
                onCreateNewPage={() => setShowCreatePageModal(true)}
                onCreateNewPost={() => setShowCreatePostModal(true)}
                pageTransfer={{
                  onCopyAllBlocks: () => void pageTransfer.copyAllBlocks(),
                  onPasteBlocks: handlePaste,
                  onExportPage: pageTransfer.openExport,
                }}
              />
              {pageTransfer.dialogs}
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
                      parentBlock={parentBlock}
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
        </EditorPopupsProvider>
        </EditorColorMemoryProvider>
      </PageProvider>
    </div>
  );
}
