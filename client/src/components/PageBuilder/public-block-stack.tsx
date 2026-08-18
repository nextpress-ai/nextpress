import type { JSX } from "react";
import type { BlockConfig, PageOther } from "@shared/schema-types";
import { DEFAULT_PAGE_DESIGN } from "@shared/page-other";
import { PAGE_BLOCK_STACK_GAP } from "@shared/block-container-placement";
import { resolveBlockTreeForSurface } from "@shared/resolve-block-for-surface";
import {
	bindPostBlocks,
	bindablePostFromRecord,
	type BindablePostDocument,
} from "@shared/bind-post-blocks";
import PublicBlockRenderer from "./PublicBlockRenderer";
import { BlockAnimationRuntime } from "./BlockAnimationRuntime";
import { PublishBlockStyles } from "./PublishBlockStyles";
import { PageProvider, type PostDocumentValue } from "./PageContext";

type PageDesign = PageOther["design"];

type PublicBlockStackProps = {
  blocks: BlockConfig[];
  design?: PageDesign;
  pageTitle?: string;
  animationContentKey: string;
  testId?: string;
  deviceView?: "desktop" | "tablet" | "mobile";
  post?: BindablePostDocument;
  themeCssVars?: Record<string, string>;
};

const toIsoOrNull = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/**
 * Shared block stack for preview and published pages (not the editor canvas).
 * Same path as SSR: `PublicBlockRenderer` → `renderer/react/*` (`BLOCK_COMPONENTS`).
 * Post documents are bound so title, excerpt, image, author, and info use real fields.
 */
export function PublicBlockStack({
  blocks,
  design,
  pageTitle,
  animationContentKey,
  testId,
  deviceView,
  post,
  themeCssVars,
}: PublicBlockStackProps): JSX.Element | null {
  if (blocks.length === 0) {
    return null;
  }

  const boundPost = post ? bindablePostFromRecord(post) : undefined;
  const resolvedBlocks = boundPost
    ? bindPostBlocks({ blocks, post: boundPost })
    : blocks;

  const { css: deviceAndTokenCss } = resolveBlockTreeForSurface({
    blocks: resolvedBlocks,
    surface: deviceView ? "canvas" : "publish",
    deviceView,
  });

  const postDocument: PostDocumentValue | null = boundPost?.id
    ? {
        contentType: "post",
        postId: boundPost.id,
        authorId: boundPost.authorId ?? undefined,
        title: boundPost.title ?? "",
        excerpt: boundPost.excerpt ?? "",
        featuredImage: boundPost.featuredImage ?? "",
        categories: boundPost.categories ?? [],
        tags: boundPost.tags ?? [],
        publishedAt: toIsoOrNull(boundPost.publishedAt),
        createdAt: toIsoOrNull(boundPost.createdAt),
        author: boundPost.author ?? null,
        updateDocument: () => undefined,
      }
    : null;

  return (
    <PageProvider postDocument={postDocument}>
      <div
        className="np-public-block-stack mx-auto flex w-full min-w-0 flex-col items-stretch overflow-x-clip"
        data-testid={testId}
        style={{
          ...themeCssVars,
          maxWidth: design?.containerWidth ?? DEFAULT_PAGE_DESIGN.containerWidth,
          padding: design?.padding ?? DEFAULT_PAGE_DESIGN.padding,
          gap: PAGE_BLOCK_STACK_GAP,
        }}
      >
        <PublishBlockStyles />
        {deviceAndTokenCss ? (
          <style dangerouslySetInnerHTML={{ __html: deviceAndTokenCss }} />
        ) : null}
        {pageTitle ? (
          <h1 className="sr-only">{pageTitle}</h1>
        ) : null}
        <BlockAnimationRuntime contentKey={animationContentKey} />
        {resolvedBlocks.map((block) => (
          <PublicBlockRenderer key={block.id} block={block} deviceView={deviceView} />
        ))}
      </div>
    </PageProvider>
  );
}
