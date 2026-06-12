import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import type { Post, Template } from "@shared/schema-types";
import type { BlockConfig, PageOther } from "@shared/schema-types";
import BlockRenderer from "@/components/PageBuilder/BlockRenderer";
import { BlockAnimationRuntime } from "@/components/PageBuilder/BlockAnimationRuntime";
import { getGoogleFontUrl } from "@shared/google-fonts";
import { getBlockSiblingFlexItemStyles } from "@shared/block-container-placement";

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
  
  // Fetch post or template data using preview endpoints
  const { data, isLoading, error } = useQuery({
    queryKey: contentType === 'template' 
      ? [`/api/preview/template/${contentId}`] 
      : [`/api/preview/${contentType}/${contentId}`],
    enabled: !!contentId,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-npb-text-muted" />
          <p className="text-npb-text-secondary">Loading preview…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const isUnauthorized =
      error instanceof Error && error.message.startsWith('401:');
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
          <h1 className="mb-2 text-xl font-semibold text-npb-text-primary">
            {isUnauthorized ? 'Sign in required' : 'Preview Not Available'}
          </h1>
          <p className="text-npb-text-secondary">
            {isUnauthorized
              ? 'Preview is only available to signed-in users.'
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
      
      {/* Page content */}
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: design?.containerWidth || undefined,
          padding: design?.padding || undefined,
        }}
      >
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
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
          <div className="flex flex-col items-stretch w-full">
            <BlockAnimationRuntime contentKey={`${contentType}-${contentId}-${blocks.length}`} />
            {blocks.map((block) => (
              <div
                key={block.id}
                className="block-container"
                style={{
                  width: '100%',
                  minWidth: 0,
                  ...getBlockSiblingFlexItemStyles(block.styles, 'column'),
                }}
              >
                <BlockRenderer
                  block={block}
                  isSelected={false}
                  isPreview={true}
                  onDuplicate={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}