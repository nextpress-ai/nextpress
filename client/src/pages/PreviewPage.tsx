import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useMemo } from "react";
import { AppLoadingShell } from "@/components/app-loading-shell";
import { AlertCircle } from "lucide-react";
import type { Post, Template } from "@shared/schema-types";
import type { BlockConfig, PageOther } from "@shared/schema-types";
import type { AuthorDisplay } from "@shared/author-display";
import type { BindablePostDocument } from "@shared/bind-post-blocks";
import { PublicBlockStack } from "@/components/PageBuilder/public-block-stack";
import { readPreviewSession } from "@shared/preview-session";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useSiteThemeSettings } from "@/hooks/use-site-theme-settings";
import { buildVisitorDocumentStyle } from "@/lib/visitor-theme-style";
import { resolveVisitorDesign } from "@shared/theme-to-page-design";

interface PreviewPageProps {
  postId?: string;
  templateId?: string;
  type?: 'post' | 'page' | 'template';
}

type PreviewPost = Post & {
  blocks?: BlockConfig[];
  builderData?: BlockConfig[];
  content?: string;
  usePageBuilder?: boolean;
  author?: AuthorDisplay | null;
  categories?: string[];
  tags?: string[];
};

export default function PreviewPage({ postId, templateId, type }: PreviewPageProps) {
  const params = useParams();
  
  const contentId = postId || templateId || params.id;
  const contentType = type || params.type || (templateId ? 'template' : 'post');
  const { activeSiteId } = useActiveSite();
  const { cssVars: themeCssVars, settings: themeSettings } = useSiteThemeSettings(activeSiteId);

  const shareToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return new URLSearchParams(window.location.search).get('token');
  }, []);

  const useLiveEditorBlocks = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('live') === '1';
  }, []);

  const isEmbedPreview = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  }, []);

  const previewPath =
    shareToken && contentId
      ? `/api/preview/shared/${contentType}/${contentId}?token=${encodeURIComponent(shareToken)}`
      : contentType === 'template'
        ? `/api/preview/template/${contentId}`
        : `/api/preview/${contentType}/${contentId}`;

  const postFallbackPath =
    !shareToken && contentType === 'post' && contentId
      ? `/api/posts/${contentId}`
      : '';

  const previewQuery = useQuery({
    queryKey: [previewPath],
    enabled: !!contentId,
  });
  const postFallbackQuery = useQuery({
    queryKey: [postFallbackPath],
    enabled: Boolean(postFallbackPath && previewQuery.isError),
  });

  const data = previewQuery.data ?? postFallbackQuery.data;
  const isLoading =
    previewQuery.isLoading ||
    Boolean(previewQuery.isError && postFallbackPath && postFallbackQuery.isLoading);
  const error = postFallbackPath && previewQuery.isError
    ? postFallbackQuery.error
    : previewQuery.error;

  const liveSession =
    useLiveEditorBlocks && contentId
      ? readPreviewSession({ contentType, contentId })
      : null;

  if (isLoading && !liveSession) {
    return <AppLoadingShell label="Loading preview…" />;
  }

  if ((error || !data) && !liveSession) {
    const isUnauthorized =
      error instanceof Error && error.message.startsWith('401:');
    return (
      <div className="min-h-screen flex items-center justify-center bg-npb-canvas-bg">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
          <h1 className="mb-2 text-xl font-semibold text-npb-text-primary">
            {isUnauthorized ? 'Sign in required' : shareToken ? 'Preview link expired' : 'Preview Not Available'}
          </h1>
          <p className="text-npb-text-secondary">
            {isUnauthorized
              ? 'Preview is only available to signed-in users, or use a share link from the SDK.'
              : shareToken
                ? 'This preview link is invalid or has expired. Generate a new one from the SDK.'
              : error
                ? 'Failed to load content for preview.'
                : 'The requested content could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  let blocks: BlockConfig[] = liveSession?.blocks ?? [];
  let title = liveSession?.title ?? '';
  let bindablePost: BindablePostDocument | undefined;

  if (contentType === 'template') {
    const template = data as Template | undefined;
    if (blocks.length === 0) {
      blocks = (template?.blocks as BlockConfig[]) || [];
    }
    if (!title) title = template?.name ?? '';
  } else {
    const item = data as PreviewPost | undefined;
    if (blocks.length === 0) {
      blocks = (item?.blocks ?? item?.builderData ?? []) as BlockConfig[];
    }
    if (!title) title = item?.title ?? '';
    if (contentType === 'post' && (item || contentId)) {
      bindablePost = {
        id: item?.id ?? contentId,
        authorId: item?.authorId,
        title: item?.title ?? title,
        excerpt: item?.excerpt,
        featuredImage: item?.featuredImage,
        publishedAt: item?.publishedAt,
        createdAt: item?.createdAt,
        categories: item?.categories,
        tags: item?.tags,
        author: item?.author,
        other: item?.other,
      };
    }

    if (item && !item.usePageBuilder && item.content) {
      return (
        <div className="min-h-screen bg-white">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <article className="prose prose-lg max-w-none">
              <h1>{item.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: item.content }} />
            </article>
          </div>
        </div>
      );
    }
  }

  const pageOther = (data as { other?: PageOther } | undefined)?.other;
  const design = resolveVisitorDesign({
    design: liveSession?.design ?? pageOther?.design,
    themeSettings,
  });
  const visitorStyle = buildVisitorDocumentStyle({ themeCssVars, design });

  return (
    <div
      className={`np-visitor-document ${isEmbedPreview ? 'min-h-full' : 'min-h-screen'}`}
      style={visitorStyle}
    >
      {!isEmbedPreview ? <title>{title}</title> : null}
      
      <div className="w-full">
        {blocks.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-npb-text-muted">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-medium text-npb-text-primary">Empty Page</h2>
              <p className="text-npb-text-secondary">This {contentType} doesn&apos;t have any content yet.</p>
            </div>
          </div>
        ) : (
          <PublicBlockStack
            blocks={blocks}
            design={design}
            themeCssVars={themeCssVars}
            animationContentKey={`${contentType}-${contentId}-${blocks.length}`}
            testId="preview-page-builder-content"
            post={bindablePost}
          />
        )}
      </div>
    </div>
  );
}
