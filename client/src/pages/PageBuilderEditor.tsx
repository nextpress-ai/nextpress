import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
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
import type { BlockConfig, Page, Post, Template } from '@shared/schema-types';
import { storeSlugToIdMapping, getPageIdFromSlug } from '@/lib/editorStorage';
import { setParentIds } from '@/lib/handlers/treeUtils';
import {
  clearPageDraft,
  loadPageDraft,
  savePageDraft,
  savePageDraftWithHistory,
} from '@/lib/pageDraftStorage';
import {
  clearPostDraft,
  loadPostDraft,
  savePostDraft,
} from '@/lib/postDraftStorage';
import { VERSION_STALE } from '@shared/content-version';
import { stripVisualContentFromBlocks } from '@shared/strip-visual-content-from-blocks';

type PageState = {
  blocks: BlockConfig[];
  title: string;
  slug: string;
  status: string;
  isInitialized: boolean;
};

type PageAction =
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: { blocks: BlockConfig[]; title: string; slug: string; status: string } };

const initialPageState: PageState = {
  blocks: [],
  title: '',
  slug: '',
  status: 'draft',
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
        isInitialized: true,
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
  const draftSaveRef = useRef<NodeJS.Timeout | null>(null);
  const latestPageStateRef = useRef<PageState>(initialPageState);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  /** Derive resolvedPageId synchronously — getPageIdFromSlug is a sync localStorage call */
  const resolvedPageId = (() => {
    if (isSlug && postId && !isPost) {
      const mappingResult = getPageIdFromSlug(postId);
      return mappingResult.status && mappingResult.data ? mappingResult.data : postId;
    }
    return postId;
  })();

  const {
    data: rawData,
    isLoading,
    error,
  } = useQuery<Page | Post | Template>({
    queryKey: [`${apiBase}/${resolvedPageId || postId}`],
    enabled: !!(resolvedPageId || postId),
  });

  /** Normalise raw API data into the EditorData shape */
  const data: EditorData | undefined = rawData
    ? isTemplate
      ? adaptTemplateToEditorData(rawData as Template)
      : isPost
        ? adaptPostToEditorData(rawData as Post)
        : (rawData as Page)
    : undefined;

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
    }
    dispatchPageState({ type: 'RESET' });
    latestPageStateRef.current = initialPageState;
  }

  /**
   * Adjusting state during render: initialize page state when data arrives or changes.
   * Tracks prevDataId to detect when we have new data to load.
   */
  const [prevDataId, setPrevDataId] = useState<string | null>(null);
  const dataId = data?.id ?? null;
  const dataMatchesCurrent = dataId && dataId === currentId;

  if (dataMatchesCurrent && dataId !== prevDataId && data) {
    setPrevDataId(dataId);

    // Load local draft — skip for templates (they save directly)
    let localDraft: { updatedAt?: unknown; [key: string]: unknown } | null = null;
    if (!isTemplate) {
      const localResult = isPost
        ? loadPostDraft(dataId)
        : loadPageDraft(dataId);
      localDraft = localResult.status ? localResult.data : null;
    }

    const toTs = (value: unknown) => {
      if (!value) return 0;
      if (value instanceof Date) return value.getTime();
      return Date.parse(String(value));
    };

    const remoteTs = toTs(data.updatedAt);
    const localTs = toTs(localDraft?.updatedAt);
    const useLocal = localDraft && localTs > remoteTs;
    const source = useLocal ? localDraft : data;

    const initialBlocks = setParentIds(
      Array.isArray(source?.blocks) ? source.blocks : [],
      null,
    );
    const initialTitle = String(source?.title || 'Untitled');
    const initialSlug = String(source?.slug || '');
    const initialStatus = String(source?.status || 'draft');

    dispatchPageState({
      type: 'LOAD',
      payload: {
        blocks: initialBlocks,
        title: initialTitle,
        slug: initialSlug,
        status: initialStatus,
      },
    });
    latestPageStateRef.current = {
      blocks: initialBlocks,
      title: initialTitle,
      slug: initialSlug,
      status: initialStatus,
      isInitialized: true,
    };

    // Store slug mapping for pages only
    if (!isPost && data.id && data.slug) {
      storeSlugToIdMapping(data.slug, data.id);
    }

    // Persist initial draft (skip for templates)
    if (!isTemplate) {
      if (isPost) {
        savePostDraft(data.id, data);
      } else {
        savePageDraft(data.id, data);
      }
    }
  }

  // Also reset prevDataId when currentId changes (so we re-load on navigation)
  if (dataId && dataId !== currentId && prevDataId !== null) {
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

  const queueDraftSave = (
    override?: Partial<typeof latestPageStateRef.current>,
  ) => {
    if (!data?.id) return;
    const next = {
      ...latestPageStateRef.current,
      ...override,
    };
    latestPageStateRef.current = next;

    // Skip draft saves for templates — they save directly
    if (isTemplate) return;

    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      // When inline-editing a post, save draft to post storage
      if (inlinePostId && inlinePostData) {
        savePostDraft(inlinePostId, {
          ...inlinePostData,
          title: next.title,
          slug: next.slug,
          status: next.status,
          blocks: next.blocks,
        });
        return;
      }

      if (isPost) {
        savePostDraft(data.id, {
          ...data,
          title: next.title,
          slug: next.slug,
          status: next.status,
          blocks: next.blocks,
        });
      } else {
        savePageDraftWithHistory(
          data.id,
          {
            ...data,
            title: next.title,
            slug: next.slug,
            status: next.status,
            blocks: next.blocks,
            version: data.version ?? 0,
          },
          3,
        );
      }
    }, 300);
  };

  // Clear timeout on unmount
  useMountEffect(() => {
    return () => {
      if (draftSaveRef.current) {
        clearTimeout(draftSaveRef.current);
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

        const postBlocks = setParentIds(Array.isArray(post.blocks) ? post.blocks : [], null);
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
      isInitialized: true,
    };
    storedBlogPageStateRef.current = null;

    // Re-fetch the blog page to pick up any server-side changes
    if (data?.id) {
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/${data.id}`] });
    }
  }, [data, apiBase, queryClient]);

  const handleBlocksChange = (nextBlocks: BlockConfig[]) => {
    dispatchPageState({ type: 'LOAD', payload: { ...pageState, blocks: nextBlocks } });
    queueDraftSave({ blocks: nextBlocks });
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

  if (isLoading || (data && !pageState.isInitialized)) {
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
    const backPath = isTemplate ? '/admin/templates' : isPost ? '/admin/posts' : '/admin/pages';
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
      clearPostDraft(inlinePostId);
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

    if (isTemplate) {
      // Templates don't use drafts — just invalidate the query
      queryClient.invalidateQueries({ queryKey: [`${apiBase}/${postId}`] });
      queryClient.invalidateQueries({ queryKey: [apiBase] });
    } else if (isPost) {
      clearPostDraft(data.id);
    } else {
      clearPageDraft(data.id);
    }
    queryClient.invalidateQueries({ queryKey: [`${apiBase}/${postId}`] });
    queryClient.invalidateQueries({ queryKey: [apiBase] });
  };

  const handlePageBuilderSave = async (): Promise<boolean> => {
    if (!data) return false;

    setIsSaving(true);
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const blocks = stripVisualContentFromBlocks(pageState.blocks);

      // When inline-editing a post, save to the post API
      if (inlinePostId) {
        const expectedVersion = readExpectedVersion(inlinePostData ?? data);
        const postPayload = {
          title: pageState.title,
          slug: pageState.slug,
          status: pageState.status,
          blocks,
          expectedVersion,
        };
        const response = await apiRequest(
          'PUT',
          `/api/posts/${inlinePostId}`,
          postPayload,
        );
        const updated = await response.json();
        savePostDraft(updated.id, updated);
        clearPostDraft(updated.id);
        setInlinePostData(updated);
        queryClient.setQueryData([`/api/posts/${inlinePostId}`], updated);
        handleSave();
        return true;
      }

      const payload = isTemplate
        ? { name: pageState.title, blocks }
        : {
            title: pageState.title,
            slug: pageState.slug,
            status: pageState.status,
            blocks,
            expectedVersion: readExpectedVersion(data),
          };

      const response = await apiRequest(
        'PUT',
        `${apiBase}/${data.id}`,
        payload,
      );
      const updated = await response.json();

      // Persist and clear draft (skip for templates)
      if (isTemplate) {
        // Templates don't use drafts
      } else if (isPost) {
        savePostDraft(updated.id, updated);
        clearPostDraft(updated.id);
      } else {
        savePageDraft(updated.id, updated);
        clearPageDraft(updated.id);
      }
      queryClient.setQueryData([`${apiBase}/${data.id}`], updated);
      handleSave();
      return true;
    } catch (err) {
      console.error(`Error saving ${type}:`, err);
      const error = err as Error & { code?: string };
      if (error.code === VERSION_STALE) {
        toast({
          title: `${isPost || inlinePostId ? 'Post' : 'Page'} changed elsewhere`,
          description: 'Reload and try again before saving.',
          variant: 'destructive',
        });
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
      const { writePreviewSession } = await import('@shared/preview-session');
      writePreviewSession({
        contentType: 'template',
        contentId: data.id,
        payload: {
          blocks: pageState.blocks,
          title: pageState.title,
          savedAt: Date.now(),
        },
      });
      window.open(`/preview/template/${data.id}?live=1`, '_blank');
      return;
    }

    const saved = await handlePageBuilderSave();
    if (!saved) return;

    const previewContentType = inlinePostId ? 'post' : isPost ? 'post' : 'page';
    const previewContentId = inlinePostId ?? data?.id;
    if (!previewContentId) return;

    const { writePreviewSession } = await import('@shared/preview-session');
    writePreviewSession({
      contentType: previewContentType,
      contentId: previewContentId,
      payload: {
        blocks: pageState.blocks,
        title: pageState.title,
        design: (data as { other?: { design?: unknown } })?.other?.design as
          | import('@shared/schema-types').PageOther['design']
          | undefined,
        savedAt: Date.now(),
      },
    });

    const previewPath =
      previewContentType === 'post'
        ? `/preview/post/${previewContentId}?live=1`
        : `/preview/page/${previewContentId}?live=1`;
    window.open(previewPath, '_blank');
  };

  const handleBackToList = () => {
    setLocation(isTemplate ? '/admin/templates' : isPost ? '/admin/posts' : '/admin/pages');
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
            <div className="flex items-center gap-2 flex-1 max-w-md">
              {isInlineEditing && (
                <FileText className="w-4 h-4 npb-chrome-accent flex-shrink-0" />
              )}
              <span className="text-sm npb-chrome-muted flex-shrink-0">
                {isInlineEditing
                  ? 'Editing Post:'
                  : `Editing ${isTemplate ? 'Template' : isPost ? 'Post' : 'Page'}:`}
              </span>
              <Input
                value={pageState.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="npb-chrome-input text-sm h-8"
                placeholder="Enter title..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={handlePageBuilderSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-npb-accent hover:bg-npb-accent-hover text-white"
              data-testid="button-save">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {!isTemplate && (
              <PublishDialog
                post={data}
                blocks={pageState.blocks}
                onPublished={handleSave}
                disabled={isSaving}
                contentType={isPost ? 'post' : 'page'}
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
            onPreview={handlePreview}
            pageMeta={{
              title: pageState.title,
              slug: pageState.slug,
              status: pageState.status,
              version: isInlineEditing ? 0 : data.version,
            }}
            onPageMetaChange={handlePageMetaChange}
            currentPostId={inlinePostId || data?.id}
            contentType={isTemplate ? 'template' : type}
            isTemplateEditor={isTemplate}
          />
        </div>
      </div>
    </div>
  );
}
