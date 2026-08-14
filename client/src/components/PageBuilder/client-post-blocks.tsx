import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { BlockComponentProps } from "./blocks/types";

const noopChange = () => undefined;

function wrapEditorPostBlock(
  load: () => Promise<{ default: { component?: React.ComponentType<BlockComponentProps> } }>,
): React.FC<BlockConfig> {
  const LazyComponent = React.lazy(async () => {
    const mod = await load();
    const Component = mod.default.component;
    if (!Component) {
      return {
        default: function MissingPostBlock() {
          return null;
        },
      };
    }
    return { default: Component };
  });

  return function ClientPostBlock(block: BlockConfig) {
    return (
      <LazyComponent value={block} onChange={noopChange} isPreview />
    );
  };
}

/**
 * Preview/public overrides for post blocks that need live fetch (comments, prev/next).
 * Title, excerpt, and image stay on the SSR renderer after `bindPostBlocks`.
 */
export const CLIENT_POST_COMPONENTS: Record<string, React.FC<BlockConfig>> = {
  "post/comments": wrapEditorPostBlock(
    () => import("./blocks/post-comments/PostCommentsBlock"),
  ),
  "post/navigation": wrapEditorPostBlock(
    () => import("./blocks/post-navigation/PostNavigationBlock"),
  ),
  "post/author-box": wrapEditorPostBlock(
    () => import("./blocks/post-author-box/PostAuthorBoxBlock"),
  ),
  "post/info": wrapEditorPostBlock(
    () => import("./blocks/post-info/PostInfoBlock"),
  ),
};
