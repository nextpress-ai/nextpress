import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Helmet } from "react-helmet";
import PublicBlockRenderer from "@/components/PageBuilder/PublicBlockRenderer";
import { BlockAnimationRuntime } from "@/components/PageBuilder/BlockAnimationRuntime";
import Landing from "@/pages/Landing";
import { getGoogleFontUrl } from "@shared/google-fonts";
import type { Post } from "@shared/schema-types";
import type { BlockConfig } from "@shared/schema-types";
import type { PageOther } from "@shared/schema-types";

/**
 * Extended post data type for public page rendering.
 * The API returns Post objects which may include additional fields
 * depending on the content type (page vs post) and builder state.
 */
interface PublicPageData extends Post {
  /** HTML content for non-page-builder pages */
  content?: string;
  /** Whether this page uses the page builder */
  usePageBuilder?: boolean;
  /** Content type discriminator: 'page' | 'post' */
  type?: string;
  /** Page builder block data (legacy alias for blocks) */
  builderData?: BlockConfig[];
}

interface PublicPageViewProps {
  slug?: string;
  type?: 'page' | 'post' | 'homepage';
}

export default function PublicPageView({ slug: propSlug, type = 'page' }: PublicPageViewProps) {
  const { slug: routeSlug } = useParams();
  const slug = propSlug || routeSlug;
  
  // Determine the API endpoint based on type
  const getApiEndpoint = () => {
    if (type === 'homepage') {
      return '/api/public/homepage';
    }
    return `/api/public/${type}/${slug}`;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [getApiEndpoint()],
    queryFn: async () => {
      const response = await fetch(getApiEndpoint());
      if (!response.ok) {
        throw new Error('Content not found');
      }
      return response.json() as Promise<PublicPageData>;
    },
    enabled: !!(slug || type === 'homepage'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-npb-canvas-bg">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-12">
          <div className="w-full animate-pulse space-y-5">
            <div className="h-10 rounded bg-npb-border-subtle sm:h-14" />
            <div className="h-4 rounded bg-npb-border-subtle" />
            <div className="h-4 w-4/5 rounded bg-npb-border-subtle" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    if (type === 'homepage') {
      return <Landing />;
    }

    return (
      <div className="min-h-screen bg-npb-surface-base">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-npb-text-primary">404</h1>
            <h2 className="mb-8 text-xl text-npb-text-secondary">
              {`${type.charAt(0).toUpperCase() + type.slice(1)} not found`}
            </h2>
            <p className="mb-8 text-npb-text-muted">
              {`The ${type} you're looking for doesn't exist or hasn't been published yet.`}
            </p>
            <a
              href="/"
              className="inline-flex items-center rounded-lg bg-npb-interactive-bg-active px-4 py-2 text-npb-interactive-text-active transition-colors hover:opacity-90"
              data-testid="link-home"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  const blocks: BlockConfig[] = (data.builderData || data.blocks as BlockConfig[]) || [];
  const publishDate = data.publishedAt ? new Date(data.publishedAt) : new Date();

  // Extract page other settings
  const pageOther = (data as { other?: PageOther })?.other;
  const seo = pageOther?.seo;
  const design = pageOther?.design;

  // SEO meta information
  const metaTitle = seo?.metaTitle || `${data.title} | Your Site`;
  const metaDescription = seo?.metaDescription || data.excerpt || `Read ${data.title} on our website.`;
  const canonicalUrl =
    seo?.canonicalUrl ||
    (type === 'homepage'
      ? `${window.location.origin}/`
      : `${window.location.origin}/${type}/${data.slug}`);
  const googleFontUrl = getGoogleFontUrl(design?.fontFamily);

  return (
    <div 
      className="min-h-screen" 
      data-testid={`public-${type}-view`}
      style={{
        backgroundColor: design?.backgroundColor?.style || '#ffffff',
        color: design?.textColor?.style || undefined,
        fontFamily: design?.fontFamily || undefined,
      }}
    >
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={data.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content={type === 'post' ? 'article' : 'website'} />
        <meta property="og:url" content={canonicalUrl} />
        {data.featuredImage && (
          <meta property="og:image" content={data.featuredImage} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={data.title} />
        <meta name="twitter:description" content={metaDescription} />
        {data.featuredImage && (
          <meta name="twitter:image" content={data.featuredImage} />
        )}
        <link rel="canonical" href={canonicalUrl} />
        {googleFontUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontUrl} />
          </>
        )}
        {seo?.noIndex && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        {seo?.customMeta?.filter(m => m.name && m.content).map((meta, i) => (
          <meta key={`custom-${i}`} name={meta.name} content={meta.content} />
        ))}
        
        {/* Article specific meta for posts */}
        {type === 'post' && (
          <>
            <meta property="article:published_time" content={publishDate.toISOString()} />
            <meta property="article:modified_time" content={typeof data.updatedAt === 'string' ? data.updatedAt : new Date(data.updatedAt || publishDate).toISOString()} />
          </>
        )}
      </Helmet>

      {/* Page content */}
      <div className="w-full">
        {/* Handle pages with traditional content (non-page builder) */}
        {!data.usePageBuilder && data.content ? (
          <div 
            className="mx-auto px-6 py-12" 
            style={{ maxWidth: design?.containerWidth || '56rem' }}
          >
            <article className="prose prose-lg max-w-none">
              <header className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="page-title">
                  {data.title}
                </h1>
                {type === 'post' && (
                  <div className="text-sm text-gray-500 mb-4" data-testid="post-meta">
                    Published on {publishDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </div>
                )}
                {data.excerpt && (
                  <p className="text-xl text-gray-600 font-light" data-testid="page-excerpt">
                    {data.excerpt}
                  </p>
                )}
              </header>
              <div 
                dangerouslySetInnerHTML={{ __html: data.content }}
                data-testid="page-content"
              />
            </article>
          </div>
        ) : (
          /* Page Builder content */
          <>
            {blocks.length === 0 ? (
              <div 
                className="mx-auto px-6 py-12"
                style={{ maxWidth: design?.containerWidth || '56rem' }}
              >
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="page-title">
                    {data.title}
                  </h1>
                  <p className="text-gray-600" data-testid="empty-content">
                    This {type} doesn't have any content yet.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-stretch w-full min-w-0 overflow-x-clip"
                data-testid="page-builder-content"
                style={{
                  maxWidth: design?.containerWidth || undefined,
                  padding: design?.padding || undefined,
                }}
              >
                <BlockAnimationRuntime contentKey={`${type}-${data.id}-${blocks.length}`} />
                {blocks.map((block) => (
                  <PublicBlockRenderer key={block.id} block={block} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Post footer for blog posts */}
      {type === 'post' && (
        <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Published on {publishDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}