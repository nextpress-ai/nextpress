import type { BlockConfig, PageOther } from "@shared/schema-types";
import { PAGE_BLOCK_STACK_GAP } from "@shared/block-container-placement";
import PublicBlockRenderer from "./PublicBlockRenderer";
import { BlockAnimationRuntime } from "./BlockAnimationRuntime";

type PageDesign = PageOther["design"];

type PublicBlockStackProps = {
  blocks: BlockConfig[];
  design?: PageDesign;
  animationContentKey: string;
  testId?: string;
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
}: PublicBlockStackProps): JSX.Element | null {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div
      className="mx-auto flex w-full min-w-0 flex-col items-stretch overflow-x-clip"
      data-testid={testId}
      style={{
        maxWidth: design?.containerWidth || undefined,
        padding: design?.padding || undefined,
        gap: PAGE_BLOCK_STACK_GAP,
      }}
    >
      <BlockAnimationRuntime contentKey={animationContentKey} />
      {blocks.map((block) => (
        <PublicBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
