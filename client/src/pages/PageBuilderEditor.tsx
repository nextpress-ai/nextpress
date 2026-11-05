import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, Save, FileText, Settings2 } from 'lucide-react';
import { AppLoadingShell } from '@/components/app-loading-shell';
import AdminTopBar from '@/components/AdminTopBar';
import AdminSidebar from '@/components/AdminSidebar';
import PageBuilder from '@/components/PageBuilder/PageBuilder';
import PublishDialog from '@/components/PageBuilder/PublishDialog';
import { SiteMenu } from '@/components/PageBuilder/EditorBar';
import { useToast } from '@/hooks/use-toast';
import { useOptionalActiveSite } from '@/hooks/useActiveSite';
import { isTemplatePart } from '@shared/template-usage';
import type { BlockConfig, Page, PageOther, Post, Template } from '@shared/schema-types';
import { storeSlugToIdMapping } from '@/lib/editorStorage';
import { setParentIds } from '@/lib/handlers/treeUtils';
import { generateId } from '@/lib/utils';
import { convertLegacyProse } from '@shared/docs/legacy-prose';
import { ensureRootPageShell, readPageDesign } from '@shared/page-shell-model';
import { parsePageOther } from '@shared/page-other';
import { composeBlogPost, findPostBody, isWrittenPost, writtenPostBlocks } from '@shared/blog/compose-blog-post';
import type { BlogPostLook } from '@shared/blog/blog-post-look';
import { lookOfBlog, useBlog } from '@/components/PageBuilder/blog-mode/use-blog';
import { mergeSearchText } from '@/components/PageBuilder/blog-mode/post-search-text';
import type { PostDocumentFields, PostSearchText } from '@/components/PageBuilder/PageContext';
import { apiRequest } from '@/lib/queryClient';
import { addMissingIconDrawings } from '@/lib/icon-drawing-capture';
import {
  clearPageDraft,
  loadPageDraft,
  savePageDraft,
  savePageDraftWithHistory,
} from '@/lib/pageDraftStorage';
import {
  type DraftSaveCause,
  draftSaveDelayMs,
  shouldFlushDraftOnLeave,
} from '@/lib/draft-save-delay';
import {
  clearPostDraft,
  loadPostDraft,
  savePostDraft,
} from '@/lib/postDraftStorage';
import { VERSION_STALE } from '@shared/content-version';
import { saveEditorBlocks } from '@/lib/save-editor-blocks';
import { collectPostFieldsFromBlocks } from '@shared/collect-post-fields-from-blocks';
import { parsePostOther } from '@shared/posts/post-other';
import { runParentOwnedSave } from '@/lib/run-parent-save';
import {
  shouldRestoreLocalDraft,
  stampDraftTimestamp,
} from '@/lib/editor-persistence';
import {
  listEditorEntityQueryKeys,
  readEditorSaveVersion,
  writeEditorEntityCache,
} from '@/lib/editor-entity-cache';
import { livePreviewHref, writePreviewSession } from '@shared/preview-session';
import { isDocsPageBlocks } from '@shared/docs/docs-page-frame';
import { DocsPageSwitcher } from '@/components/PageBuilder/docs-mode/DocsPageSwitcher';
import { useDocsEditorState } from '@/components/PageBuilder/docs-mode/docs-editor-state';
import { mergeDocsPageOther } from '@/components/PageBuilder/docs-mode/docs-page-draft';
import { findNavItemById } from '@/components/PageBuilder/docs-mode/docs-nav-model';
import { useDocsTree } from '@/components/PageBuilder/docs-mode/use-docs-tree';

type PageState = {
  blocks: BlockConfig[];
  title: string;
  slug: string;
  status: string;
  version: number;
  isInitialized: boolean;
};

type PageAction =
  | { type: 'RESET' }
  | {
      type: 'LOAD';
      payload: {
        blocks: BlockConfig[];
        title: string;
        slug: string;
        status: string;
        version?: number;
      };
    }
  | {
      type: 'UPDATE_METADATA';
      payload: { title: string; slug: string; status: string; version: number };
    };

function blocksWithRootShell({
  blocks,
  leftoverDesign,
  postLook = null,
}: {
  blocks: unknown;
  leftoverDesign?: PageOther['design'];
  /** A written post's blog look: its body is shown inside it (a saved draft may hold an older look). */
  postLook?: BlogPostLook | null;
}): BlockConfig[] {
  const parented = setParentIds(convertLegacyProse(Array.isArray(blocks) ? (blocks as BlockConfig[]) : []), null);
  const body = postLook ? findPostBody(parented) : null;
  if (postLook && body) return composeBlogPost({ body: { ...body, parentId: null }, look: postLook });
  return ensureRootPageShell({
    blocks: parented,
    leftoverDesign,
    shellId: generateId(),
  }).blocks;
}

const initialPageState: PageState = {
  blocks: [],
  title: '',
  slug: '',
  status: 'draft',
  version: 0,
  isInitialized: false,
};

function pageStateReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'RESET':
      return { ...initialPageState, isInitialized: false };
    case 'LOAD':
      return {
        ...state,
        blocks: action.payload.blocks,
        title: action.payload.title,
        slug: action.payload.slug,
        status: action.payload.status,
        version: action.payload.version ?? state.version,
        isInitialized: true,
      };
    case 'UPDATE_METADATA':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
}

function useMountEffect(effect: () => void | (() => void)) {
  useEffect(effect, []);
}

/** Unified editor type — supports pages, posts, and templates */
type EditorContentType = 'page' | 'post' | 'template';

/**
 * Common shape used internally so PageBuilder receives a consistent interface.
 * Posts are adapted to this shape (missing page-only fields get safe defaults).
 */
type EditorData = Page;

interface PageBuilderEditorProps {
  postId?: string;
  isSlug?: boolean;
  /** Whether we are editing a page or a post. Defaults to 'page'. */
  type?: EditorContentType;
}

/**
 * Adapts a Post object to the Page shape expected by PageBuilder.
 * Adds safe defaults for page-only fields (siteId, version, history, menuOrder).
 */
const readExpectedVersion = (entity: Page | Post | EditorData): number =>
  entity.version ?? 0;

const adaptPostToEditorData = (post: Post): EditorData =>
  ({
    ...post,
    siteId: '',
    version: readExpectedVersion(post),
    history: [],
    menuOrder: 0,
    // Post doesn't have these page-only fields but the type requires them
  }) as EditorData;

/**
 * Adapts a Template object to the Page shape expected by PageBuilder.
 * Templates use `name` instead of `title`, have no slug/status/version.
 */
const adaptTemplateToEditorData = (template: Template): EditorData =>
  ({
    ...template,
    title: template.name,
    slug: '',
    status: 'publish',
    siteId: '',
    version: 0,
    history: [],
    menuOrder: 0,
    blogId: null,
    parentId: null,
    password: null,
    other: (template.other as Record<string, unknown>) ?? {},
  }) as unknown as EditorData;

const readRemoteEntityMeta = (
  updated: Page | Post | Template,
  isTemplate: boolean,
): { title: string; slug: string; status: string; version: number } => {
  if (isTemplate) {
    return {
      title: (updated as Template).name,
      slug: '',
      status: 'publish',
      version: 0,
    };
  }

  const entity = updated as Page | Post;
  return {
    title: entity.title ?? '',
    slug: entity.slug ?? '',
    status: entity.status ?? 'draft',
    version: readExpectedVersion(entity),
  };
};

export default function PageBuilderEditor({
  postId,
  isSlug = false,
  type = 'page',
}: PageBuilderEditorProps) {
  const isPost = type === 'post';
  const isTemplate = type === 'template';
  const [, setLocation] = useLocation();
  const [pageState, dispatchPageState] = useReducer(pageStateReducer, initialPageState);
  const [isSaving, setIsSaving] = useState(false);
  const [postDoc, setPostDoc] = useState({
    excerpt: '',
    featuredImage: '',
    categories: [] as string[],
    tags: [] as string[],
    allowComments: true,
    publishedAt: null as string | null,
    seo: { metaTitle: '', metaDescription: '' } as PostSearchText,
  });
  const draftSaveRef = useRef<NodeJS.Timeout | null>(null);
  const previewHandoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteDraftRef = useRef(false);
  const parentSaveInFlightRef = useRef(false);
  const latestPageStateRef = useRef<PageState>(initialPageState);
  const hasUnsavedServerChangesRef = useRef(false);
  const writeDraftRef = useRef<((next: PageState) => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  /** The docs editor's page settings; unused (and untouched) on any other page. */
  const docsState = useDocsEditorState();

  /**
   * Inline post editing state.
   * When a user clicks a post in the PostListBlock, we swap the canvas
   * to show that post's blocks without navigating away from the blog page URL.
   */
  const [inlinePostId, setInlinePostId] = useState<string | null>(null);
  const [inlinePostData, setInlinePostData] = useState<Post | null>(null);
  const storedBlogPageStateRef = useRef<PageState & { data: EditorData } | null>(null);

  /** Refs for stable event handler identity in useMountEffect */
  const dataRef = useRef<EditorData | undefined>(undefined);
  const pageStateRef = useRef<PageState>(initialPageState);
  const toastRef = useRef(toast);

  /** API base path driven by content type */
  const apiBase = isPost ? '/api/posts' : isTemplate ? '/api/templates' : '/api/pages';

  /**
   * Keep the address as the query id. Swapping a page name for its id after the
   * first load changed the query and cleared the page, which left the editor on Loading.
   */
  const resolvedPageId = postId;

  // A page name ("contact") only means something inside one site, and most sites have one. Look it
  // up in the admin's current site; without that the server could hand back another site's page.
  const activeSites = useOptionalActiveSite();
  const slugSiteId = isSlug ? activeSites?.activeSiteId ?? '' : undefined;
  const waitingForSite = isSlug && !slugSiteId;

  const {
    data: rawData,
    isLoading,
    error,
  } = useQuery<Page | Post | Template>({
    queryKey: slugSiteId
      ? [`${apiBase}/${resolvedPageId || postId}`, { siteId: slugSiteId }]
      : [`${apiBase}/${resolvedPageId || postId}`],
    enabled: !!(resolvedPageId || postId) && !waitingForSite,
  });

  // A written post opens inside its blog's look, so the editor waits for the blog before drawing it.
  const writtenBlogId = isPost && rawData && isWrittenPost((rawData as Post).blocks as BlockConfig[]) ? String((rawData as Post).blogId ?? '') : '';
  const writtenBlog = useBlog({ blogId: writtenBlogId });
  const waitingForBlog = writtenBlogId !== '' && writtenBlog.isLoading;

  /** Normalise raw API data into the EditorData shape */
  const data: EditorData | undefined = rawData
    ? isTemplate
      ? adaptTemplateToEditorData(rawData as Template)
      : isPost
        ? adaptPostToEditorData(rawData as Post)
        : (rawData as Page)
    : undefined;

  // Linked parts live under Templates; everything else a template editor opens is a pre-designed block.
  const templateListPath =
    isTemplate && rawData && isTemplatePart((rawData as Template).other)
      ? '/admin/templates'
      : '/admin/pre-designed-blocks';

  // A post that is only a body (made in the writing editor) opens in the writing editor, inside its blog's look.
  const isWritten = isPost && !inlinePostId && pageState.isInitialized && findPostBody(pageState.blocks) !== null;
  // A page whose page shell holds a docs shell is a docs page: it opens in the docs editor.
  const isDocs = !isPost && !isTemplate && pageState.isInitialized && isDocsPageBlocks(pageState.blocks);
  // A docs page sits under its docs home and groups; the publish dialog shows its whole address.
  const docsTreeOfPage = useDocsTree({ pageId: isDocs && data?.id ? String(data.id) : '' }).tree;
  const docsPagePath = docsTreeOfPage && data?.id ? findNavItemById({ home: docsTreeOfPage.home, id: String(data.id) })?.path.replace(/^\/+/, '') : undefined;

  // Keep refs fresh every render for stable useMountEffect handlers
  dataRef.current = data;
  pageStateRef.current = pageState;
  toastRef.current = toast;

  /** Adjusting state during render: reset when page/post ID changes */
  const currentId = resolvedPageId || postId;
  const [prevId, setPrevId] = useState<string | undefined>(currentId);
  if (currentId !== prevId) {
    setPrevId(currentId);
    if (draftSaveRef.current) {
      clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    if (previewHandoffTimerRef.current) {
      clearTimeout(previewHandoffTimerRef.current);
      previewHandoffTimerRef.current = null;
    }
    pendingDeleteDraftRef.current = false;
    hasUnsavedServerChangesRef.current = false;
    dispatchPageState({ type: 'RESET' });
    latestPageStateRef.current = initialPageState;
  }

  /**
   * Puts a fetched or local copy on the canvas. Used on first load and when
   * the server copy is newer than the version this editor last saved with.
   */
  function applyEditorSource({
    source,
    remoteVersion,
  }: {
    source: {
      blocks?: unknown;
      title?: unknown;
      slug?: unknown;
      status?: unknown;
      excerpt?: string | null;
      featuredImage?: string | null;
      categories?: string[];
      tags?: string[];
      allowComments?: boolean | null;
      publishedAt?: string | Date | null;
      other?: PageOther | unknown;
    };
    remoteVersion: number;
  }): PageState {
    // Older react-icons icons get their saved drawing here, so the next save shows them when published.
    const initialBlocks = addMissingIconDrawings(
      blocksWithRootShell({
        blocks: source.blocks,
        leftoverDesign: (source as { other?: PageOther }).other?.design,
        postLook: writtenBlogId ? lookOfBlog(writtenBlog.data) : null,
      }),
    );
    const next: PageState = {
      blocks: initialBlocks,
      title: String(source.title || 'Untitled'),
      slug: String(source.slug || ''),
      status: String(source.status || 'draft'),
      version: remoteVersion,
      isInitialized: true,
    };
    dispatchPageState({
      type: 'LOAD',
      payload: {
        blocks: next.blocks,
        title: next.title,
        slug: next.slug,
        status: next.status,
        version: next.version,
      },
    });
    const loadedOther = parsePostOther(source.other);
    const loadedSeo = parsePageOther(source.other).seo;
    setPostDoc({
      excerpt: String(source.excerpt ?? ''),
      featuredImage: String(source.featuredImage ?? ''),
      categories: source.categories ?? loadedOther.categories ?? [],
      tags: source.tags ?? loadedOther.tags ?? [],
      allowComments: source.allowComments !== false,
      publishedAt: source.publishedAt instanceof Date ? source.publishedAt.toISOString() : source.publishedAt ?? null,
      seo: { metaTitle: loadedSeo?.metaTitle ?? '', metaDescription: loadedSeo?.metaDescription ?? '' },
    });
    latestPageStateRef.current = next;
    hasUnsavedServerChangesRef.current = false;
    docsState.loadPage((source as { other?: PageOther }).other);
    return next;
  }

  /**
   * Adjusting state during render: initialize page state when data arrives or changes.
   * Tracks prevDataId to detect when we have new data to load.
   */
  const [prevDataId, setPrevDataId] = useState<string | null>(null);
  const dataId = data?.id ?? null;
  const dataSlug = data?.slug ?? null;
  // The address can be the page id or its name. The fetched page always has the id,
  // so a name in the address used to sit on Loading forever.
  const dataMatchesCurrent =
    dataId != null && (dataId === currentId || (dataSlug != null && dataSlug !== '' && dataSlug === currentId));

  if (dataMatchesCurrent && dataId !== prevDataId && data && !waitingForBlog) {
    setPrevDataId(dataId);

    // Load local draft — skip for templates (they save directly)
    const localResult = isTemplate
      ? null
      : isPost
        ? loadPostDraft(dataId)
        : loadPageDraft(dataId);
    const localDraft = localResult?.status ? localResult.data : null;

    const useLocal =
      localDraft &&
      shouldRestoreLocalDraft({
        localUpdatedAt: localDraft.updatedAt as Date | string | null | undefined,
        remoteUpdatedAt: data.updatedAt,
      });
    const source = useLocal && localDraft ? localDraft : data;

    const loaded = applyEditorSource({
      source,
      remoteVersion: readExpectedVersion(data),
    });

    // Store slug mapping for pages only
    if (!isPost && data.id && data.slug) {
      storeSlugToIdMapping(data.slug, data.id);
    }

    // Persist initial draft (skip for templates)
    if (!isTemplate) {
      if (useLocal) {
        const stampedDraft = stampDraftTimestamp({
          ...data,
          title: loaded.title,
          slug: loaded.slug,
          status: loaded.status,
          blocks: loaded.blocks,
        });
        if (isPost) {
          savePostDraft(data.id, stampedDraft);
        } else {
          savePageDraftWithHistory(
            data.id,
            { ...stampedDraft, version: loaded.version },
            3,
          );
        }
      } else if (isPost) {
        savePostDraft(data.id, data);
      } else {
        savePageDraft(data.id, data);
      }
    }
  }

  // Re-load when the address changes to a different page. A name in the address
  // is the same page as its id, so that match must not clear the load.
  if (dataId && dataId !== currentId && dataSlug !== currentId && prevDataId !== null) {
    setPrevDataId(null);
  }

  // Replace URL with slug for pages (not applicable for posts) - mount-only
  useMountEffect(() => {
    if (!isPost && data && postId && !isSlug && data.slug) {
      const currentPath = window.location.pathname;
      const slugPath = `/admin/page-builder/page/${data.slug}`;
      const isUUIDPath =
        /^\/admin\/page-builder\/page\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          currentPath,
        );
      if (isUUIDPath && currentPath !== slugPath) {
        window.history.replaceState({}, '', slugPath);
      }
    }
  });

  const writeDraft = useCallback(
    (next: PageState) => {
      if (!data?.id || isTemplate) return;

      // When inline-editing a post, save draft to post storage
      if (inlinePostId && inlinePostData) {
        savePostDraft(
          inlinePostId,
          stampDraftTimestamp({
            ...inlinePostData,
            title: next.title,
            slug: next.slug,
            status: next.status,
            blocks: next.blocks,
          }),
        );
        return;
      }

      if (isPost) {
        savePostDraft(
          data.id,
          stampDraftTimestamp({
            ...data,
            title: next.title,
            slug: next.slug,
            status: next.status,
            blocks: next.blocks,
          }),
        );
      } else {
        savePageDraftWithHistory(
          data.id,
          stampDraftTimestamp({
            ...data,
            title: next.title,
            slug: next.slug,
            status: next.status,
            blocks: next.blocks,
            version: data.version ?? 0,
            // The docs editor's description and sidebar flag are part of the page, so they wait in the draft with it.
            ...(isDocs ? { other: mergeDocsPageOther({ existing: data.other as PageOther | undefined, draft: docsState.draft }) } : {}),
          }),
          3,
        );
      }
    },
    [data, inlinePostId, inlinePostData, isPost, isTemplate, isDocs, docsState.draft],
  );

  writeDraftRef.current = writeDraft;

  const queueDraftSave = (
    override?: Partial<typeof latestPageStateRef.current>,
    cause: DraftSaveCause = 'edit',
  ) => {
    if (!data?.id) return;
    const next = {
      ...latestPageStateRef.current,
      ...override,
    };
    latestPageStateRef.current = next;
    hasUnsavedServerChangesRef.current = true;

    // Skip draft saves for templates — they save directly
    if (isTemplate) return;

    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    pendingDeleteDraftRef.current = cause === 'delete';
    draftSaveRef.current = setTimeout(() => {
      draftSaveRef.current = null;
      pendingDeleteDraftRef.current = false;
      writeDraftRef.current?.(latestPageStateRef.current);
    }, draftSaveDelayMs(cause));
  };

  const writeLivePreviewHandoff = (blocks: BlockConfig[]) => {
    const previewContentId = inlinePostId ?? data?.id;
    if (!previewContentId) return;
    const previewContentType = inlinePostId
      ? 'post'
      : isTemplate
        ? 'template'
        : isPost
          ? 'post'
          : 'page';
    writePreviewSession({
      contentType: previewContentType,
      contentId: previewContentId,
      payload: {
        blocks,
        title: latestPageStateRef.current.title,
        design: readPageDesign({ blocks }),
        savedAt: Date.now(),
      },
    });
  };

  const queuePreviewHandoff = (blocks: BlockConfig[], cause: DraftSaveCause) => {
    if (previewHandoffTimerRef.current) {
      clearTimeout(previewHandoffTimerRef.current);
      previewHandoffTimerRef.current = null;
    }
    if (cause === 'delete') {
      writeLivePreviewHandoff(blocks);
      return;
    }
    previewHandoffTimerRef.current = setTimeout(() => {
      previewHandoffTimerRef.current = null;
      writeLivePreviewHandoff(latestPageStateRef.current.blocks);
    }, 400);
  };

  // Flush pending draft on unmount and warn before leaving with unsaved changes
  useMountEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedServerChangesRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (draftSaveRef.current) {
        clearTimeout(draftSaveRef.current);
        draftSaveRef.current = null;
        if (
          shouldFlushDraftOnLeave({
            pendingDelete: pendingDeleteDraftRef.current,
          })
        ) {
          writeDraftRef.current?.(latestPageStateRef.current);
        }
        pendingDeleteDraftRef.current = false;
      }
    };
  });

  /**
   * Listen for `np:edit-post` custom events dispatched by PostListBlock.
   * When received, store the current blog page state and swap the canvas
   * to the clicked post's blocks for inline editing.
   * Uses refs for stable handler identity — mount-only subscription.
   */
  useMountEffect(() => {
    const handleEditPostEvent = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.postId || !dataRef.current) return;

      // Store current blog page state so we can restore it later
      storedBlogPageStateRef.current = {
        ...pageStateRef.current,
        data: dataRef.current,
      };

      try {
        const { apiRequest } = await import('@/lib/queryClient');
        const response = await apiRequest('GET', `/api/posts/${detail.postId}`);
        const post: Post = await response.json();

        const postBlocks = blocksWithRootShell({
          blocks: post.blocks,
          leftoverDesign: (post as { other?: PageOther }).other?.design,
        });
        setInlinePostId(post.id);
        setInlinePostData(post);
        dispatchPageState({
          type: 'LOAD',
          payload: {
            blocks: postBlocks,
            title: post.title || 'Untitled Post',
            slug: post.slug || '',
            status: post.status || 'draft',
          },
        });
        latestPageStateRef.current = {
          blocks: postBlocks,
          title: post.title || 'Untitled Post',
          slug: post.slug || '',
          status: post.status || 'draft',
          version: post.version ?? 0,
          isInitialized: true,
        };
      } catch (err) {
        console.error('Failed to load post for inline editing:', err);
        toastRef.current({
          title: 'Error',
          description: 'Failed to load post for editing',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('np:edit-post', handleEditPostEvent);
    return () =>
      window.removeEventListener('np:edit-post', handleEditPostEvent);
  });

  /** Restore the blog page state after inline post editing */
  const handleBackToBlogPage = useCallback(() => {
    const stored = storedBlogPageStateRef.current;
    if (!stored) return;

    setInlinePostId(null);
    setInlinePostData(null);
    dispatchPageState({
      type: 'LOAD',
      payload: {
        blocks: stored.blocks,
        title: stored.title,
        slug: stored.slug,
        status: stored.status,
      },
    });
latestPageStateRef.current = {
        blocks: stored.blocks,
        title: stored.title,
        slug: stored.slug,
        status: stored.status,
        version: stored.version,
        isInitialized: true,
      };
    storedBlogPageStateRef.current = null;

    // Re-fetch the blog page to pick up any server-side changes
    if (data?.id) {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/${data.id}`] });
    }
  }, [data, apiBase, queryClient]);

  const handleBlocksChange = (
    nextBlocks: BlockConfig[],
    change?: { cause?: DraftSaveCause },
  ) => {
    dispatchPageState({ type: 'LOAD', payload: { ...pageState, blocks: nextBlocks } });
    queueDraftSave({ blocks: nextBlocks }, change?.cause ?? 'edit');
    queuePreviewHandoff(nextBlocks, change?.cause ?? 'edit');
  };

  const handleTitleChange = (value: string) => {
    dispatchPageState({ type: 'LOAD', payload: { ...pageState, title: value } });
    queueDraftSave({ title: value });
  };

  const handlePageMetaChange = (
    meta: Partial<{ title: string; slug: string; status: string }>,
  ) => {
    const updated = { ...pageState };
    if (meta.title !== undefined) updated.title = meta.title;
    if (meta.slug !== undefined) updated.slug = meta.slug;
    if (meta.status !== undefined) updated.status = meta.status;
    dispatchPageState({ type: 'LOAD', payload: updated });
    queueDraftSave(meta);
  };

  const handlePostDocumentChange = (patch: PostDocumentFields) => {
    setPostDoc((current) => ({
      excerpt: patch.excerpt ?? current.excerpt,
      featuredImage: patch.featuredImage ?? current.featuredImage,
      categories: patch.categories ?? current.categories,
      tags: patch.tags ?? current.tags,
      allowComments: patch.allowComments ?? current.allowComments,
      publishedAt: patch.publishedAt !== undefined ? patch.publishedAt : current.publishedAt,
      seo: patch.seo ? { ...current.seo, ...patch.seo } : current.seo,
    }));
  };

  const handleRemoteEntityUpdate = useCallback(
    (updated: Page | Post | Template) => {
      if (!data?.id) return;

      const isInlineTarget =
        inlinePostId != null && updated.id === inlinePostId;

      if (isInlineTarget) {
        setInlinePostData(updated as Post);
        writeEditorEntityCache({
          queryClient,
          keys: listEditorEntityQueryKeys({
            apiBase: '/api/posts',
            id: inlinePostId,
            slug: 'slug' in updated ? updated.slug : undefined,
          }),
          entity: updated,
        });
      } else {
        writeEditorEntityCache({
          queryClient,
          keys: listEditorEntityQueryKeys({
            apiBase,
            id: data.id,
            slug: 'slug' in updated ? updated.slug : data.slug,
            address: currentId,
          }),
          entity: updated,
        });
      }

      const meta = readRemoteEntityMeta(updated, isTemplate);
      dispatchPageState({ type: 'UPDATE_METADATA', payload: meta });
      latestPageStateRef.current = {
        ...latestPageStateRef.current,
        ...meta,
      };
      hasUnsavedServerChangesRef.current = false;

      if (
        !isTemplate &&
        !isInlineTarget &&
        !isPost &&
        'slug' in updated &&
        updated.slug
      ) {
        storeSlugToIdMapping(updated.slug, updated.id);
      }

      queryClient.invalidateQueries({ queryKey: [apiBase] });
    },
    [apiBase, currentId, data?.id, data?.slug, inlinePostId, isPost, isTemplate, queryClient],
  );

  const clearPersistedDraft = useCallback(() => {
    if (!data?.id) return;

    if (inlinePostId) {
      clearPostDraft(inlinePostId);
      return;
    }

    if (isTemplate) return;

    if (isPost) {
      clearPostDraft(data.id);
    } else {
      clearPageDraft(data.id);
    }
  }, [data?.id, inlinePostId, isPost, isTemplate]);

  const handlePublished = useCallback(
    (updated: Page | Post) => {
      handleRemoteEntityUpdate(updated);
      clearPersistedDraft();
    },
    [clearPersistedDraft, handleRemoteEntityUpdate],
  );

  /**
   * The docs navigation can change this page's own row on the server (a rename, a move, hiding it),
   * which gives the page a new version. Taking that version keeps the next Save from being refused
   * as out of date. WHY only the version: the title, address and status in the editor may hold
   * edits that aren't saved yet, and those must stay.
   */
  const handleDocsServerChange = useCallback(async () => {
    const pageId = data?.id;
    if (!pageId) return;
    try {
      const response = await apiRequest('GET', `/api/pages/${pageId}`);
      const fresh = (await response.json()) as Page;
      writeEditorEntityCache({
        queryClient,
        keys: listEditorEntityQueryKeys({ apiBase, id: pageId, slug: fresh.slug, address: currentId }),
        entity: fresh,
      });
      const version = readExpectedVersion(fresh);
      const { title, slug, status } = latestPageStateRef.current;
      dispatchPageState({ type: 'UPDATE_METADATA', payload: { title, slug, status, version } });
      latestPageStateRef.current = { ...latestPageStateRef.current, version };
    } catch (error) {
      console.error({
        atFunction: 'PageBuilderEditor.handleDocsServerChange',
        data: { pageId, error },
        message: 'The docs page could not be read again after the docs changed it',
      });
    }
  }, [apiBase, currentId, data?.id, queryClient]);

  if (isLoading || waitingForSite || (data && !pageState.isInitialized)) {
    return (
      <div className="flex h-screen bg-npb-canvas-bg">
        <AdminSidebar />
        <div className="flex-1 ml-40">
          <AdminTopBar />
          <AppLoadingShell fullScreen={false} label="Loading…" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const backPath = isTemplate ? templateListPath : isPost ? '/admin/posts' : '/admin/pages';
    const label = isTemplate ? 'Template' : isPost ? 'Post' : 'Page';
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 ml-40">
          <AdminTopBar />
          <div className="flex items-center justify-center h-full">
            <Card className="w-96">
              <CardHeader>
                <CardTitle className="text-npb-status-error">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-npb-text-secondary mb-4">
                  {label} not found or failed to load.
                </p>
                <Button
                  onClick={() => setLocation(backPath)}
                  className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to {label}s
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // When inline-editing a post, show post-specific success message
    if (inlinePostId) {
      toast({
        title: 'Success',
        description: 'Post saved successfully',
      });
      hasUnsavedServerChangesRef.current = false;
      clearPersistedDraft();
      queryClient.invalidateQueries({
        queryKey: [`/api/posts/${inlinePostId}`],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      return;
    }

    const label = isTemplate ? 'Template' : isPost ? 'Post' : 'Page';
    toast({
      title: 'Success',
      description: `${label} saved successfully`,
    });

    hasUnsavedServerChangesRef.current = false;

    if (!isTemplate) {
      clearPersistedDraft();
    } else {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/${postId}`] });
      queryClient.invalidateQueries({ queryKey: [apiBase] });
    }
    queryClient.invalidateQueries({ queryKey: [`${apiBase}/${postId}`] });
    queryClient.invalidateQueries({ queryKey: [apiBase] });
  };

  const handlePageBuilderSave = async (
    blocksOverride?: BlockConfig[],
  ): Promise<Page | Post | Template | false> => {
    if (!data) return false;

    if (draftSaveRef.current) {
      clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    if (previewHandoffTimerRef.current) {
      clearTimeout(previewHandoffTimerRef.current);
      previewHandoffTimerRef.current = null;
    }
    pendingDeleteDraftRef.current = false;

    setIsSaving(true);
    try {
      const editorContentType = inlinePostId
        ? 'post'
        : isTemplate
          ? 'template'
          : isPost
            ? 'post'
            : 'page';

      const saveBlocks = Array.isArray(blocksOverride)
        ? blocksOverride
        : latestPageStateRef.current.blocks;
      if (Array.isArray(blocksOverride)) {
        latestPageStateRef.current = {
          ...latestPageStateRef.current,
          blocks: blocksOverride,
        };
      }
      const fromBlocks = collectPostFieldsFromBlocks(saveBlocks);
      const existingOther =
        ((inlinePostData ?? data) as { other?: Record<string, unknown> } | undefined)?.other ?? {};

      const updated = await saveEditorBlocks({
        contentType: editorContentType,
        id: inlinePostId ?? data.id,
        expectedVersion: readEditorSaveVersion({
          inlinePost: inlinePostId ? inlinePostData : null,
          pageVersion: latestPageStateRef.current.version,
          fallback: data,
        }),
        title: fromBlocks.title || pageState.title,
        slug: pageState.slug,
        status: pageState.status,
        // A written post saves its body alone; the blog's look is put around it when it is shown.
        blocks: isWritten ? writtenPostBlocks(saveBlocks) : saveBlocks,
        excerpt: fromBlocks.excerpt ?? postDoc.excerpt ?? null,
        featuredImage: fromBlocks.featuredImage ?? postDoc.featuredImage ?? null,
        // The writing editor's Post tab owns these; a page-builder post keeps its own settings window for them.
        ...(editorContentType === 'post' && isWritten ? { allowComments: postDoc.allowComments, publishedAt: postDoc.publishedAt } : {}),
        other:
          editorContentType === 'post'
            ? {
                ...existingOther,
                categories: postDoc.categories,
                tags: postDoc.tags,
                ...(isWritten ? { seo: mergeSearchText({ saved: parsePageOther(existingOther).seo, edited: postDoc.seo }) } : {}),
              }
            : isDocs
              ? mergeDocsPageOther({ existing: data.other as PageOther | undefined, draft: docsState.draft })
              : undefined,
      });

      handleRemoteEntityUpdate(updated);
      clearPersistedDraft();

      const previewContentType = editorContentType;
      const previewContentId = inlinePostId ?? data.id;
      writePreviewSession({
        contentType: previewContentType,
        contentId: previewContentId,
        payload: {
          blocks: saveBlocks,
          title: fromBlocks.title || pageState.title,
          design: readPageDesign({ blocks: saveBlocks }),
          savedAt: Date.now(),
        },
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/preview/${previewContentType}/${previewContentId}`],
      });

      const label = isTemplate ? 'Template' : isPost || inlinePostId ? 'Post' : 'Page';
      toast({
        title: 'Success',
        description: `${label} saved successfully`,
      });
      return updated;
    } catch (err) {
      console.error(`Error saving ${type}:`, err);
      const error = err as Error & { code?: string };
      if (error.code === VERSION_STALE) {
        const label = isPost || inlinePostId ? 'Post' : 'Page';
        try {
          const response = await apiRequest('GET', `${apiBase}/${inlinePostId ?? data.id}`);
          const raw = (await response.json()) as Page | Post | Template;
          const fresh = isTemplate
            ? adaptTemplateToEditorData(raw as Template)
            : isPost || inlinePostId
              ? adaptPostToEditorData(raw as Post)
              : (raw as Page);
          if (inlinePostId) {
            setInlinePostData(raw as Post);
            writeEditorEntityCache({
              queryClient,
              keys: listEditorEntityQueryKeys({
                apiBase: '/api/posts',
                id: inlinePostId,
                slug: 'slug' in raw ? raw.slug : undefined,
              }),
              entity: raw,
            });
          } else {
            writeEditorEntityCache({
              queryClient,
              keys: listEditorEntityQueryKeys({
                apiBase,
                id: data.id,
                slug: 'slug' in raw ? raw.slug : data.slug,
                address: currentId,
              }),
              entity: raw,
            });
          }
          clearPersistedDraft();
          applyEditorSource({
            source: fresh,
            remoteVersion: readExpectedVersion(fresh),
          });
          setPrevDataId(fresh.id);
          toast({
            title: `${label} changed elsewhere`,
            description: 'Loaded the latest copy.',
          });
        } catch (reloadError) {
          console.error('Error reloading after a stale save:', reloadError);
          toast({
            title: `${label} changed elsewhere`,
            description: 'Reload the page and try again before saving.',
            variant: 'destructive',
          });
        }
        return false;
      }
      toast({
        title: 'Error',
        description: `Failed to save ${type}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (isTemplate) {
      if (!data?.id) return;
      writePreviewSession({
        contentType: 'template',
        contentId: data.id,
        payload: {
          blocks: latestPageStateRef.current.blocks,
          title: pageState.title,
          savedAt: Date.now(),
        },
      });
      window.open(
        livePreviewHref({ contentType: 'template', contentId: data.id }),
        '_blank',
      );
      return;
    }

    const saved = await handlePageBuilderSave();
    if (!saved) return;

    const previewContentType = inlinePostId ? 'post' : isPost ? 'post' : 'page';
    const previewContentId = inlinePostId ?? data?.id;
    if (!previewContentId) return;

    const previewBlocks = latestPageStateRef.current.blocks;
    writePreviewSession({
      contentType: previewContentType,
      contentId: previewContentId,
      payload: {
        blocks: previewBlocks,
        title: pageState.title,
        design: readPageDesign({ blocks: previewBlocks }),
        savedAt: Date.now(),
      },
    });

    window.open(
      livePreviewHref({
        contentType: previewContentType,
        contentId: previewContentId,
      }),
      '_blank',
    );
  };

  const handleBackToList = () => {
    setLocation(isTemplate ? templateListPath : isPost ? '/admin/posts' : '/admin/pages');
  };

  /** Determine the label and back behavior based on inline editing state */
  const isInlineEditing = !!inlinePostId;

  return (
    <div className="flex h-screen bg-npb-surface-base">
      {/* Full-screen page builder */}
      <div className="w-full h-full flex flex-col">
        {/* Top navigation for page builder */}
        <div className="npb-editor-chrome-header flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={
                isInlineEditing ? handleBackToBlogPage : handleBackToList
              }
              className="npb-chrome-ghost flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {isInlineEditing ? 'Back to Blog Page' : 'Back'}
            </Button>
            {isDocs ? (
              <DocsPageSwitcher pageId={data.id} pageTitle={pageState.title} />
            ) : (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              {isInlineEditing && (
                <FileText className="w-4 h-4 npb-chrome-accent flex-shrink-0" aria-hidden />
              )}
              <label
                htmlFor="page-builder-title"
                className="text-sm npb-chrome-muted flex-shrink-0">
                {isInlineEditing
                  ? 'Editing Post:'
                  : `Editing ${isTemplate ? 'Template' : isPost ? 'Post' : 'Page'}:`}
              </label>
              <Input
                id="page-builder-title"
                value={pageState.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="npb-chrome-input text-sm h-8"
                placeholder="Enter title..."
                aria-label={
                  isInlineEditing
                    ? 'Post title'
                    : `${isTemplate ? 'Template' : isPost ? 'Post' : 'Page'} title`
                }
              />
            </div>
            )}
          </div>

          <div className={isDocs ? 'flex flex-1 items-center justify-end gap-2' : 'flex items-center gap-2'}>
            {isDocs ? null : (
            <SiteMenu>
              <Button
                variant="outline"
                size="sm"
                className="npb-chrome-outline flex items-center gap-2"
                data-testid="button-site-settings">
                <Settings2 className="w-4 h-4" />
                Site settings
              </Button>
            </SiteMenu>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handlePreview()}
              disabled={isSaving}
              className="npb-chrome-outline flex items-center gap-2"
              data-testid="button-preview">
              <Eye className="w-4 h-4" />
              Preview
            </Button>

            <Button
              size="sm"
              onClick={() => {
                runParentOwnedSave({
                  inFlight: parentSaveInFlightRef,
                  request: async () => {
                  await handlePageBuilderSave();
                  return true;
                },
                });
              }}
              disabled={isSaving}
              className="flex items-center gap-2 npb-btn-accent"
              data-testid="button-save">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {!isTemplate && (
              <PublishDialog
                post={isInlineEditing ? inlinePostData ?? undefined : data}
                blocks={isWritten ? writtenPostBlocks(pageState.blocks) : pageState.blocks}
                onPublished={handlePublished}
                disabled={isSaving}
                extraPayload={
                  isDocs
                    ? { title: pageState.title, other: mergeDocsPageOther({ existing: data.other as PageOther | undefined, draft: docsState.draft }) }
                    : undefined
                }
                contentType={isInlineEditing || isPost ? 'post' : 'page'}
                pagePath={isDocs ? docsPagePath : undefined}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <PageBuilder
            post={
              isInlineEditing && inlinePostData
                ? adaptPostToEditorData(inlinePostData)
                : data
            }
            blocks={pageState.blocks}
            onBlocksChange={handleBlocksChange}
            onSave={handleSave}
            onSettingsUpdate={handleRemoteEntityUpdate}
            onSaveRequest={handlePageBuilderSave}
            onPreview={handlePreview}
            pageMeta={{
              title: pageState.title,
              slug: pageState.slug,
              status: pageState.status,
              version: inlinePostId
                ? readExpectedVersion(inlinePostData ?? data)
                : pageState.version,
            }}
            onPageMetaChange={handlePageMetaChange}
            onPostDocumentChange={handlePostDocumentChange}
            currentPostId={inlinePostId || data?.id}
            contentType={isTemplate ? 'template' : type}
            isTemplateEditor={isTemplate}
            mode={isDocs ? 'docs' : 'page'}
            docs={isDocs ? { state: docsState, onServerChange: handleDocsServerChange } : undefined}
            blog={isWritten && writtenBlogId ? { blogId: writtenBlogId } : null}
          />
        </div>
      </div>
    </div>
  );
}
