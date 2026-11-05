import type { BlockDefinition } from './types';
import type { BlockConfig } from '@shared/schema-types';
import { createDefaultBlock } from '@shared/block-catalog';
import { generateBlockId } from '../utils';
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
import StackBlock from './stack/StackBlock';
import PageShellBlock from './page-shell/PageShellBlock';
import HeaderBlock from './header/HeaderBlock';
import AccordionBlock from './accordion/AccordionBlock';
import AccordionItemBlock from './accordion/AccordionItemBlock';
import PopupBlock from './popup/PopupBlock';
import FormBlock from './form/FormBlock';
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
import InputBlock from './input/InputBlock';
import TextareaBlock from './textarea/TextareaBlock';
import SelectBlock from './select/SelectBlock';
import TemplatePartBlock from './template-part/TemplatePartBlock';

// Post blocks
import GridBlock from './grid/GridBlock';
import CardBlock from './card/CardBlock';
import BadgeBlock from './badge/BadgeBlock';
import StepsBlock from './steps/StepsBlock';
import StepBlock from './steps/StepBlock';
import TabsBlock from './tabs/TabsBlock';
import TabBlock from './tabs/TabBlock';
import LogoCloudBlock from './logo-cloud/LogoCloudBlock';
import SearchBlock from './search/SearchBlock';
import DocsLayoutBlock from './docs-layout/DocsLayoutBlock';
import DocsShellBlock from './docs-shell/DocsShellBlock';
import DocsPageBlock from './docs-page/DocsPageBlock';
import CalloutBlock from './callout/CalloutBlock';
import CodeGroupBlock from './code-group/CodeGroupBlock';
import FileTreeBlock from './file-tree/FileTreeBlock';
import ParamsBlock from './params/ParamsBlock';
import CodeExampleBlock from './code-example/CodeExampleBlock';
import DiagramBlock from './diagram/DiagramBlock';
import UpdateBlock from './update/UpdateBlock';
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
import PostBodyBlock from './post-body/PostBodyBlock';

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
    PageShellBlock,
    HeaderBlock,
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
    PostBodyBlock,
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
  'core/stack': StackBlock,
  'core/page-shell': PageShellBlock,
  'core/header': HeaderBlock,
  'core/accordion': AccordionBlock,
  'core/accordion-item': AccordionItemBlock,
  'core/popup': PopupBlock,
  'core/form': FormBlock,
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
  'core/input': InputBlock,
  'core/textarea': TextareaBlock,
  'core/select': SelectBlock,
  'core/template-part': TemplatePartBlock,
  'core/grid': GridBlock,
  'core/card': CardBlock,
  'core/badge': BadgeBlock,
  'core/steps': StepsBlock,
  'core/step': StepBlock,
  'core/tabs': TabsBlock,
  'core/tab': TabBlock,
  'core/logo-cloud': LogoCloudBlock,
  'core/search': SearchBlock,
  'core/docs-layout': DocsLayoutBlock,

  // Docs blocks (category "docs", names start with docs/)
  'docs/shell': DocsShellBlock,
  'docs/page': DocsPageBlock,
  'docs/callout': CalloutBlock,
  'docs/code-group': CodeGroupBlock,
  'docs/file-tree': FileTreeBlock,
  'docs/params': ParamsBlock,
  'docs/example': CodeExampleBlock,
  'docs/diagram': DiagramBlock,
  'docs/update': UpdateBlock,

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
  'post/body': PostBodyBlock,
};

/** A new block as the editor inserts it. Same helper the SDK and the AI builder use. */
export function getDefaultBlock(type: string, id: string): BlockConfig | null {
  if (!blockRegistry[type]) return null;
  return createDefaultBlock({ name: type, id, newId: generateBlockId });
}

export type { BlockDefinition } from './types';
