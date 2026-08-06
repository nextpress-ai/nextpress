import type { BlockConfig, PageOther } from "@shared/schema-types";
import { PAGE_BLOCK_STACK_GAP } from "@shared/block-container-placement";
import { resolveBlockTreeForSurface } from "@shared/resolve-block-for-surface";
import PublicBlockRenderer from "./PublicBlockRenderer";
import { BlockAnimationRuntime } from "./BlockAnimationRuntime";
import { PublishBlockStyles } from "./PublishBlockStyles";

type PageDesign = PageOther["design"];

type PublicBlockStackProps = {
  blocks: BlockConfig[];
  design?: PageDesign;
  animationContentKey: string;
  testId?: string;
  deviceView?: "desktop" | "tablet" | "mobile";
};

/**
 * Shared block stack for preview and published pages (not the editor canvas).
 * Same path as SSR: `PublicBlockRenderer` → `renderer/react/*` (`BLOCK_COMPONENTS`).
 */
export function PublicBlockStack({
  blocks,
  design,
  animationContentKey,
  testId,
  deviceView,
}: PublicBlockStackProps): JSX.Element | null {
  if (blocks.length === 0) {
    return null;
  }

  const { css: deviceAndTokenCss } = resolveBlockTreeForSurface({
    blocks,
    surface: deviceView ? "canvas" : "publish",
    deviceView,
  });

  return (
    <div
      className="np-public-block-stack mx-auto flex w-full min-w-0 flex-col items-stretch overflow-x-clip"
      data-testid={testId}
      style={{
        maxWidth: design?.containerWidth || undefined,
        padding: design?.padding || undefined,
        gap: PAGE_BLOCK_STACK_GAP,
      }}
    >
      <PublishBlockStyles />
      {deviceAndTokenCss ? (
        <style dangerouslySetInnerHTML={{ __html: deviceAndTokenCss }} />
      ) : null}
      <BlockAnimationRuntime contentKey={animationContentKey} />
      {blocks.map((block) => (
        <PublicBlockRenderer key={block.id} block={block} deviceView={deviceView} />
      ))}
    </div>
  );
}
