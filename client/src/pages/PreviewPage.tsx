import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useMemo } from "react";
import { AppLoadingShell } from "@/components/app-loading-shell";
import { AlertCircle } from "lucide-react";
import type { Post, Template } from "@shared/schema-types";
import type { BlockConfig, PageOther } from "@shared/schema-types";
import { PublicBlockStack } from "@/components/PageBuilder/public-block-stack";
import { getGoogleFontUrl } from "@shared/google-fonts";

interface PreviewPageProps {
  postId?: string;
  templateId?: string;
  type?: 'post' | 'page' | 'template';
}

export default function PreviewPage({ postId, templateId, type }: PreviewPageProps) {
  const params = useParams();
  
  // Get ID from props or URL params
  const contentId = postId || templateId || params.id;
  const contentType = type || params.type || (templateId ? 'template' : 'post');

  const shareToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return new URLSearchParams(window.location.search).get('token');
  }, []);

  const previewPath =
    shareToken && contentId
      ? `/api/preview/shared/${contentType}/${contentId}?token=${encodeURIComponent(shareToken)}`
      : contentType === 'template'
        ? `/api/preview/template/${contentId}`
        : `/api/preview/${contentType}/${contentId}`;

  const { data, isLoading, error } = useQuery({
    queryKey: [previewPath],
    enabled: !!contentId,
  });

  // Loading state
  if (isLoading) {
    return <AppLoadingShell label="Loading preview…" />;
  }

  // Error state
  if (error || !data) {
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

  // Extract blocks from data
  let blocks: BlockConfig[] = [];
  let title = '';
  
  if (contentType === 'template') {
    const template = data as Template;
    blocks = (template.blocks as BlockConfig[]) || [];
    title = template.name;
  } else {
    const item = data as Post & { blocks?: BlockConfig[] };
    // Pages return `blocks`; posts may use `builderData` or `blocks`
    blocks = (item.blocks ?? (item as any).builderData) as BlockConfig[] ?? [];
    title = item.title ?? '';
    
    // If post doesn't use page builder, show traditional content
    if (!(item as any).usePageBuilder && (item as any).content) {
      return (
        <div className="min-h-screen bg-white">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <article className="prose prose-lg max-w-none">
              <h1>{item.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: (item as any).content }} />
            </article>
          </div>
        </div>
      );
    }
  }

  // Extract page design settings (fontFamily, padding, containerWidth, colors)
  const pageOther = (data as { other?: PageOther })?.other;
  const design = pageOther?.design;
  const googleFontUrl = getGoogleFontUrl(design?.fontFamily);

  // Render page builder content
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: design?.backgroundColor?.style || '#ffffff',
        color: design?.textColor?.style || undefined,
        fontFamily: design?.fontFamily || undefined,
      }}
    >
      <title>{title}</title>
      {/* Load Google Font if needed */}
      {googleFontUrl && (
        <link rel="stylesheet" href={googleFontUrl} />
      )}
      
      {/* Page content — same stack as published pages */}
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
            animationContentKey={`${contentType}-${contentId}-${blocks.length}`}
            testId="preview-page-builder-content"
          />
        )}
      </div>
    </div>
  );
}