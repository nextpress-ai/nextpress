import type { BlockDefinition } from './types';
import type { BlockConfig } from '@shared/schema-types';
import HeadingBlock from './heading/HeadingBlock';
import TextBlock from './text/TextBlock';
import ButtonBlock from './button/ButtonBlock';
import ImageBlock from './image/ImageBlock';
import VideoBlock from './video/VideoBlock';
import AudioBlock from './audio/AudioBlock';
import SpacerBlock from './spacer/SpacerBlock';
import DividerBlock from './divider/DividerBlock';
import ColumnsBlock from './columns/ColumnsBlock';
import QuoteBlock from './quote/QuoteBlock';
import ListBlock from './list/ListBlock';
import MediaTextBlock from './media-text/MediaTextBlock';
import SeparatorBlock from './separator/SeparatorBlock';
import GroupBlock from './group/GroupBlock';
import ContainerBlock from './container/ContainerBlock';
import ButtonsBlock from './buttons/ButtonsBlock';
import GalleryBlock from './gallery/GalleryBlock';
import CoverBlock from './cover/CoverBlock';
import FileBlock from './file/FileBlock';
import CodeBlock from './code/CodeBlock';
import HtmlBlock from './html/HtmlBlock';
import PullquoteBlock from './pullquote/PullquoteBlock';
import PreformattedBlock from './preformatted/PreformattedBlock';
import TableBlock from './table/TableBlock';
import MarkdownBlock from './markdown/MarkdownBlock';
import IconBlock from './icon/IconBlock';

// Post blocks
import PostTitleBlock from './post-title/PostTitleBlock';
import PostExcerptBlock from './post-excerpt/PostExcerptBlock';
import PostFeaturedImageBlock from './post-featured-image/PostFeaturedImageBlock';
import PostListBlock from './post-list/PostListBlock';

import PostTocBlock from './post-toc/PostTocBlock';
import PostAuthorBoxBlock from './post-author-box/PostAuthorBoxBlock';
import PostCommentsBlock from './post-comments/PostCommentsBlock';
import PostNavigationBlock from './post-navigation/PostNavigationBlock';
import PostInfoBlock from './post-info/PostInfoBlock';
import PostProgressBlock from './post-progress/PostProgressBlock';

if (import.meta.env.DEBUG_BUILDER) {
  console.log('Imported Blocks:', {
    HeadingBlock,
    TextBlock,
    ButtonBlock,
    ImageBlock,
    VideoBlock,
    AudioBlock,
    SpacerBlock,
    DividerBlock,
    ColumnsBlock,
    QuoteBlock,
    ListBlock,
    MediaTextBlock,
    SeparatorBlock,
    ContainerBlock,
    GroupBlock,
    ButtonsBlock,
    GalleryBlock,
    CoverBlock,
    FileBlock,
    CodeBlock,
    HtmlBlock,
    PullquoteBlock,
    PreformattedBlock,
    TableBlock,
    MarkdownBlock,
    IconBlock,
    PostTitleBlock,
    PostExcerptBlock,
    PostFeaturedImageBlock,
    PostListBlock,

    PostTocBlock,
    PostAuthorBoxBlock,
    PostCommentsBlock,
    PostNavigationBlock,
    PostInfoBlock,
    PostProgressBlock,
  });
}

/**
 * Editor-only block registry (DnD, settings panels, inline edit).
 * Preview and published pages do NOT use these components — they render via
 * `renderer/react/*` (`BLOCK_COMPONENTS`). Change how a block *looks* on the
 * site in the renderer; change editor UX here.
 */
export const blockRegistry: Record<string, BlockDefinition> = {
  // Gutenberg-compatible ids (deprecated aliases removed per new architecture)
  'core/heading': HeadingBlock,
  'core/paragraph': TextBlock,
  'core/button': ButtonBlock,
  'core/buttons': ButtonsBlock,
  'core/image': ImageBlock,
  'core/gallery': GalleryBlock,
  'core/video': VideoBlock,
  'core/audio': AudioBlock,
  'core/spacer': SpacerBlock,
  'core/separator': SeparatorBlock,
  'core/columns': ColumnsBlock,
  'core/container': ContainerBlock,
  'core/group': GroupBlock,
  'core/quote': QuoteBlock,
  'core/list': ListBlock,
  'core/media-text': MediaTextBlock,
  'core/cover': CoverBlock,
  'core/file': FileBlock,
  'core/code': CodeBlock,
  'core/html': HtmlBlock,
  'core/pullquote': PullquoteBlock,
  'core/preformatted': PreformattedBlock,
  'core/table': TableBlock,
  'core/markdown': MarkdownBlock,
  'core/icon': IconBlock,
  'core/divider': DividerBlock,

  // Post blocks
  'post/title': PostTitleBlock,
  'post/excerpt': PostExcerptBlock,
  'post/featured-image': PostFeaturedImageBlock,
  'post/list': PostListBlock,
  'post/toc': PostTocBlock,
  'post/author-box': PostAuthorBoxBlock,
  'post/comments': PostCommentsBlock,
  'post/navigation': PostNavigationBlock,
  'post/info': PostInfoBlock,
  'post/progress': PostProgressBlock,
};

export function getDefaultBlock(type: string, id: string): BlockConfig | null {
  const def = blockRegistry[type];
  if (!def) return null;

  // Deep clone default content to avoid shared references across instances
  const content = structuredClone(def.defaultContent ?? {});

  const block: BlockConfig = {
    id,
    name: def.id, // Canonical key (e.g., 'core/heading')
    label: def.label, // User-facing display name (e.g., 'Heading')
    type: def.isContainer ? 'container' : 'block',
    parentId: null,
    category: def.category,
    content,
    styles: {
      padding: '20px',
      margin: '0px',
      ...def.defaultStyles,
    },
    settings: {},
    other: {
      tokenMap: {},
      units: { spacing: "px", font: "rem", dimension: "px", border: "px" },
    },
  };

  // Only add children array for containers
  if (def.isContainer) {
    block.children = [];
  }

  return block;
}

export type { BlockDefinition } from './types';
