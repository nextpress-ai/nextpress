import type { BlockData } from "./block-types";
import Counter from "./counter";

// Import block components by category
import * as BasicBlocks from "./basic";
import * as MediaBlocks from "./media";
import * as LayoutBlocks from "./layout";
import * as AdvancedBlocks from "./advanced";

/**
 * Counter Block Component (legacy/test component)
 */
const CounterBlock: React.FC<BlockData> = (props) => {
  const { initialCount } = props as Extract<
    BlockData,
    { blockName: "core/counter" }
  >;
  return <Counter initialCount={initialCount} />;
};

/**
 * Registry of all block components
 * Maps block names (e.g., "core/heading") to their React components
 */
export const BLOCK_COMPONENTS: Record<string, React.FC<BlockData>> = {
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

  // Legacy/Special blocks
  "core/counter": CounterBlock,
};
