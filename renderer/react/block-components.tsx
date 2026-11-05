import type { BlockConfig } from "@shared/schema-types";
import Counter from "./counter";

// Import block components by category
import * as BasicBlocks from "./basic";
import * as MediaBlocks from "./media";
import * as LayoutBlocks from "./layout";
import * as AdvancedBlocks from "./advanced";
import * as PostBlocks from "./post";
import * as FormBlocks from "./form";
import { FormBlock } from "./form/form-block";
import { AccordionBlock, AccordionItemBlock } from "./layout/accordion";
import { PopupBlock } from "./layout/popup";
import * as DesignBlocks from "./design";
import { SearchBlock } from "./search";
import { CalloutBlock, CodeExampleBlock, CodeGroupBlock, DiagramBlock, DocsLayoutBlock, DocsPageBlock, DocsShellBlock, FileTreeBlock, ParamsBlock, UpdateBlock } from "./docs";

/**
 * Counter Block Component (legacy/test component)
 */
const CounterBlock: React.FC<BlockConfig> = (block) => {
	const content = block.content;
	const initialCount = (content && content.kind === "structured")
		? (content.data as Record<string, unknown>).initialCount as number || 0
		: 0;
	return <Counter initialCount={initialCount} />;
};

/**
 * Source of truth for block *output* on preview, publish, and SSR.
 * Wired through `PublicBlockRenderer` / `renderBlocksToHtml`. Do not duplicate
 * render logic in `client/.../PageBuilder/blocks/*` — that tree is editor-only.
 */
export const BLOCK_COMPONENTS: Record<string, React.FC<BlockConfig>> = {
	// Basic blocks
	"core/heading": BasicBlocks.HeadingBlock,
	"core/paragraph": BasicBlocks.ParagraphBlock,
	"core/button": BasicBlocks.ButtonBlock,
	"core/buttons": BasicBlocks.ButtonsBlock,

	// Media blocks
	"core/image": MediaBlocks.ImageBlock,
	"core/video": MediaBlocks.VideoBlock,
	"core/audio": MediaBlocks.AudioBlock,
	"core/gallery": MediaBlocks.GalleryBlock,
	"core/cover": MediaBlocks.CoverBlock,
	"core/file": MediaBlocks.FileBlock,
	"core/media-text": MediaBlocks.MediaTextBlock,

	// Layout blocks
	"core/columns": LayoutBlocks.ColumnsBlock,
	"core/group": LayoutBlocks.GroupBlock,
	"core/container": LayoutBlocks.ContainerBlock,
	"core/stack": LayoutBlocks.StackBlock,
	"core/page-shell": LayoutBlocks.PageShellBlock,
	"core/header": LayoutBlocks.HeaderBlock,
	"core/accordion": AccordionBlock,
	"core/accordion-item": AccordionItemBlock,
	"core/popup": PopupBlock,
	"core/spacer": LayoutBlocks.SpacerBlock,
	"core/separator": LayoutBlocks.SeparatorBlock,
	"core/divider": LayoutBlocks.DividerBlock,
	"core/grid": DesignBlocks.GridBlock,
	"core/card": DesignBlocks.CardBlock,
	"core/badge": DesignBlocks.BadgeBlock,
	"core/steps": DesignBlocks.StepsBlock,
	"core/step": DesignBlocks.StepBlock,
	"core/tabs": DesignBlocks.TabsBlock,
	"core/tab": DesignBlocks.TabBlock,
	"core/logo-cloud": DesignBlocks.LogoCloudBlock,
	"core/search": SearchBlock,
	"core/docs-layout": DocsLayoutBlock,

	// Docs blocks (category "docs", names start with docs/)
	"docs/shell": DocsShellBlock,
	"docs/page": DocsPageBlock,
	"docs/callout": CalloutBlock,
	"docs/code-group": CodeGroupBlock,
	"docs/file-tree": FileTreeBlock,
	"docs/params": ParamsBlock,
	"docs/example": CodeExampleBlock,
	"docs/diagram": DiagramBlock,
	"docs/update": UpdateBlock,

	// Advanced blocks
	"core/quote": AdvancedBlocks.QuoteBlock,
	"core/list": AdvancedBlocks.ListBlock,
	"core/code": AdvancedBlocks.CodeBlock,
	"core/html": AdvancedBlocks.HtmlBlock,
	"core/pullquote": AdvancedBlocks.PullquoteBlock,
	"core/preformatted": AdvancedBlocks.PreformattedBlock,
	"core/table": AdvancedBlocks.TableBlock,
	"core/markdown": AdvancedBlocks.MarkdownBlock,
	"core/icon": AdvancedBlocks.IconBlock,
	"core/input": FormBlocks.InputBlock,
	"core/textarea": FormBlocks.TextareaBlock,
	"core/select": FormBlocks.SelectBlock,
	"core/form": FormBlock,

	// Post blocks (core component aliases)
	"post/excerpt": PostBlocks.PostExcerptBlock,
	"post/title": BasicBlocks.HeadingBlock,
	"post/featured-image": MediaBlocks.ImageBlock,

	// Post blocks (dedicated SSR renderers)
	"post/author-box": PostBlocks.PostAuthorBoxBlock,
	"post/comments": PostBlocks.PostCommentsBlock,
	"post/info": PostBlocks.PostInfoBlock,
	"post/navigation": PostBlocks.PostNavigationBlock,
	"post/toc": PostBlocks.PostTocBlock,
	"post/list": PostBlocks.PostListBlock,
	"post/progress": PostBlocks.PostProgressBlock,
	"post/body": PostBlocks.PostBodyBlock,

	// Legacy/Special blocks
	"core/counter": CounterBlock,
};