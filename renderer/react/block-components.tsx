import type { BlockConfig } from "@shared/schema-types";
import Counter from "./counter";

// Import block components by category
import * as BasicBlocks from "./basic";
import * as MediaBlocks from "./media";
import * as LayoutBlocks from "./layout";
import * as AdvancedBlocks from "./advanced";
import * as PostBlocks from "./post";

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
 * Registry of all block components
 * Maps block names (e.g., "core/heading") to their React components
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
	"core/spacer": LayoutBlocks.SpacerBlock,
	"core/separator": LayoutBlocks.SeparatorBlock,
	"core/divider": LayoutBlocks.DividerBlock,

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

	// Post blocks (core component aliases)
	"post/excerpt": BasicBlocks.ParagraphBlock,
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

	// Legacy/Special blocks
	"core/counter": CounterBlock,
};