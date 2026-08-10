import type { ReactElement } from 'react';
import type { BlockConfig } from '@shared/schema-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import BlockLibrary, {
  type BlockLibraryCategory,
} from './BlockLibrary';
import { TemplateLibrary } from './TemplateLibrary';

/** Inputs shared by compact and wide library shells. */
export type BuilderLibraryPanelProps = {
  categories: BlockLibraryCategory[];
  openCategories: Record<string, boolean>;
  onCategoryOpenChange: (categoryId: string, open: boolean) => void;
  onInsertTemplate?: (blocks: BlockConfig[]) => void;
};

const panelShellClass =
  'relative h-full overflow-hidden rounded-[var(--npb-radius-surface)] bg-npb-surface-raised';
const scrollPanelBottomFade = (
  <div className="npb-editor-scroll-fade" aria-hidden />
);
const templateWrapClass =
  'mt-4 rounded-[var(--npb-radius-surface)] bg-npb-surface-raised';

/**
 * Renders block and template sources once inside whichever builder shell is
 * active, preventing duplicate draggable IDs across responsive trees.
 */
export function BuilderLibraryPanel({
  categories,
  openCategories,
  onCategoryOpenChange,
  onInsertTemplate,
}: BuilderLibraryPanelProps): ReactElement {
  return (
    <div
      className={panelShellClass}
      data-testid="builder-library-panel"
      role="region"
      aria-label="Block library">
      <ScrollArea
        className="h-full rounded-[inherit]"
        bottomOverlay={scrollPanelBottomFade}>
        <div className="max-w-full pr-2">
          <BlockLibrary
            categories={categories}
            openCategories={openCategories}
            onCategoryOpenChange={onCategoryOpenChange}
          />
          {onInsertTemplate ? (
            <div className={templateWrapClass}>
              <TemplateLibrary onInsertTemplate={onInsertTemplate} />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
