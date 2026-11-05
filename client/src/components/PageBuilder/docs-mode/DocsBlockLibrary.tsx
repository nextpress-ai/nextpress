import type { ReactElement } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import BlockLibrary from "../BlockLibrary";
import { LIBRARY_PANEL_CLASS } from "../BuilderLibraryPanel";
import type { BlockDefinition } from "../blocks/types";
import type { BuilderLibraryState } from "../use-builder-library-state";
import { useRequiredDocsMode } from "./docs-mode-context";

/**
 * The docs inserter: the page builder's own block list, showing the docs sections only. A block is
 * dragged onto the page, or clicked to add it after the picked block (so the keyboard can add
 * blocks too). `library` holds which sections are open, so the rail's "fold all" button works on this list.
 */
export function DocsBlockLibrary({ library }: { library: BuilderLibraryState }): ReactElement {
	const docs = useRequiredDocsMode();

	const add = (block: BlockDefinition): void => docs.insertBlock(block.id);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="docs-block-library">
			<p className="npb-settings-hint-muted text-xs" aria-live="polite">
				Drag a block onto the page, or click it to add it after the picked block.
			</p>
			<div className={`${LIBRARY_PANEL_CLASS} min-h-0 flex-1`} role="region" aria-label="Docs blocks">
				<ScrollArea className="h-full rounded-[inherit]" bottomOverlay={<div className="npb-editor-scroll-fade" aria-hidden />}>
					<div className="max-w-full pr-2">
						<BlockLibrary
							categories={library.categories}
							openCategories={library.openCategories}
							onCategoryOpenChange={library.onCategoryOpenChange}
							onPick={add}
						/>
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
