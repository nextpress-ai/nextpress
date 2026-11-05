import { useMemo, useState } from 'react';
import { Draggable, Droppable } from '@/lib/dnd';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  NPB_BLOCK_LIBRARY_CARD_LABEL_MAX_CHARS,
  truncateWithEllipsis,
} from '@/lib/truncate-with-ellipsis';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { blockRegistry } from './blocks';
import type { BlockCategory, BlockDefinition } from './blocks/types';
import { TEMPLATE_PART_BLOCK_NAME } from '@shared/template-parts';
import { Box, ChevronDown, ChevronRight, Search, X } from 'lucide-react';

export type BlockLibraryCategory = {
  id: string;
  name: string;
  blocks: BlockDefinition[];
};

if (import.meta.env.DEBUG_BUILDER) {
  console.log('blockRegistry:', blockRegistry);
}

// A template part means nothing until a template is chosen, so it is added from the Templates group,
// not dragged in from here.
// `core/docs-layout` is the older all-in-one docs block, kept only so existing pages keep working.
// `post/body` is a written post's writing: the blog writing editor makes it, nothing is dropped as one.
const HIDDEN_FROM_LIBRARY = new Set([TEMPLATE_PART_BLOCK_NAME, "core/divider", "core/docs-layout", "post/body"]);

const allBlocks = Object.values(blockRegistry).filter(
  (block, index, arr) =>
    arr.findIndex((b) => b.id === block.id) === index && !HIDDEN_FROM_LIBRARY.has(block.id)
);

/** The groups in the order the page builder's library shows them. Docs blocks are not here: they live in the docs editor. */
const LIBRARY_GROUPS: ReadonlyArray<{ id: BlockCategory; name: string }> = [
  { id: 'basic', name: 'Basic' },
  { id: 'form', name: 'Form fields' },
  { id: 'media', name: 'Media' },
  { id: 'layout', name: 'Layout' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'post', name: 'Post' },
];

/** Which editor the library is for: the page builder's design blocks, or the docs editor's docs blocks. */
export type BlockLibraryMode = 'page' | 'docs';

/**
 * The docs frame (page shell, docs shell, docs page). The docs editor draws it itself and takes
 * blocks only inside the docs page, so no library ever offers these.
 */
export const DOCS_FRAME_BLOCKS: ReadonlySet<string> = new Set(['docs/shell', 'docs/page']);

/**
 * The blocks one group shows: the ones that belong to it, then blocks from other groups that
 * list themselves here with `alsoIn` (the Docs group also shows Code, Image, Table and more).
 *
 * WHY: someone writing docs should find everything for a docs page in one place, while each
 * block keeps a single name and its own home group.
 */
const blocksInGroup = (groupId: BlockCategory): BlockDefinition[] => [
  ...allBlocks.filter((block) => block.category === groupId),
  ...allBlocks.filter((block) => block.category !== groupId && block.alsoIn?.includes(groupId)),
];

/**
 * Category groups for the block library sidebar (Basic, Media, …).
 * Exported so BuilderSidebar can own accordion open state for fold-all.
 *
 * `mode: 'docs'` is the docs editor's inserter: one group, the Docs group (the `docs` category and
 * the blocks that list themselves in it), and nothing else, because other blocks may not survive
 * being saved as MDX. The default `'page'` is the page builder, which never shows the Docs group.
 */
export function buildBlockLibraryCategories({ mode = 'page' }: { mode?: BlockLibraryMode } = {}): BlockLibraryCategory[] {
  if (mode === 'docs') {
    const blocks = blocksInGroup('docs').filter((block) => !DOCS_FRAME_BLOCKS.has(block.id));
    return blocks.length > 0 ? [{ id: 'docs', name: 'Docs', blocks }] : [];
  }
  let cats: BlockLibraryCategory[] = LIBRARY_GROUPS.map(({ id, name }) => ({
    id,
    name,
    blocks: blocksInGroup(id),
  })).filter((c) => c.blocks.length > 0);

  if (cats.length === 0 && allBlocks.length > 0) {
    cats = [{ id: 'all', name: 'All Blocks', blocks: allBlocks }];
  }
  return cats;
}

const DEFAULT_CATEGORIES = buildBlockLibraryCategories();

export type BlockLibraryProps = {
  categories?: BlockLibraryCategory[];
  openCategories?: Record<string, boolean>;
  onCategoryOpenChange?: (categoryId: string, open: boolean) => void;
  /**
   * A click (or Enter) on a tile adds that block without dragging. The docs editor passes it so the
   * keyboard can add blocks too; without it a tile is dragged only, as in the page builder.
   */
  onPick?: (block: BlockDefinition) => void;
};

/** A tile's face: the block's icon in its well and its name. */
function TileFace({ block }: { block: BlockDefinition }) {
  return (
    <>
      <div className="w-10 h-10 bg-npb-surface-inset rounded-none flex items-center justify-center group-hover:bg-npb-interactive-bg-active transition-colors">
        {block.icon ? (
          <block.icon className="w-5 h-5 text-npb-text-secondary" />
        ) : (
          <Box className="w-5 h-5 text-npb-text-secondary" />
        )}
      </div>
      <p
        className="text-sm font-medium text-npb-text-primary w-full leading-snug min-w-0"
        title={block.label}>
        {truncateWithEllipsis({
          text: block.label,
          maxChars: NPB_BLOCK_LIBRARY_CARD_LABEL_MAX_CHARS,
        })}
      </p>
    </>
  );
}

const TILE_FACE_CLASS = 'flex flex-col items-center gap-3 text-center overflow-ellipsis';

const BLOCK_SEARCH_INPUT_ID = 'block-library-search';

export default function BlockLibrary({
  categories: categoriesProp,
  openCategories: openCategoriesProp,
  onCategoryOpenChange,
  onPick,
}: BlockLibraryProps) {
  const categories = categoriesProp ?? DEFAULT_CATEGORIES;

  const isControlled =
    openCategoriesProp !== undefined && onCategoryOpenChange !== undefined;

  const [internalOpen, setInternalOpen] = useState<Record<string, boolean>>(() =>
    (categoriesProp ?? DEFAULT_CATEGORIES).reduce<Record<string, boolean>>(
      (acc, category) => ({ ...acc, [category.id]: true }),
      {}
    )
  );

  const openCategories = isControlled ? openCategoriesProp! : internalOpen;

  const handleOpenChange = (categoryId: string, open: boolean) => {
    if (isControlled) {
      onCategoryOpenChange!(categoryId, open);
      return;
    }
    setInternalOpen((prev) => ({
      ...prev,
      [categoryId]: open,
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  /**
   * Filter blocks by label/description/group; drop emptied groups. The group is the one the block
   * is shown in, so searching "docs" lists the Docs group's blocks there without repeating the
   * borrowed ones (Code, Image…) in their own groups.
   */
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        blocks: category.blocks.filter((block) =>
          `${block.label} ${block.description ?? ''} ${category.id}`
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      }))
      .filter((category) => category.blocks.length > 0);
  }, [categories, normalizedQuery]);

  let globalIndex = 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor={BLOCK_SEARCH_INPUT_ID} className="sr-only">
          Search blocks
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-npb-text-muted"
          aria-hidden
        />
        <Input
          id={BLOCK_SEARCH_INPUT_ID}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blocks..."
          className="h-9 rounded-none border-npb-border-default bg-npb-surface-base pl-9 pr-9 text-sm text-npb-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-npb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-npb-surface-base"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-none p-1 text-npb-text-muted hover:text-npb-text-primary">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearching && filteredCategories.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-npb-text-muted">
          No blocks match “{searchQuery.trim()}”.
        </p>
      )}

      {filteredCategories.map((category) => {
        const startIndex = globalIndex;
        globalIndex += category.blocks.length;

        return (
          <Card
            key={category.id}
            className="border border-npb-border-default bg-npb-surface-base shadow-sm rounded-none">
            <Collapsible
              open={isSearching ? true : openCategories[category.id]}
              onOpenChange={(open) => handleOpenChange(category.id, open)}>
              <CardHeader className="p-0">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={isSearching}
                    className="w-full justify-between p-4 h-auto font-semibold text-sm text-npb-text-primary hover:text-npb-text-primary hover:bg-npb-interactive-bg-hover">
                    <span>{category.name}</span>
                    {(isSearching || openCategories[category.id]) ? (
                      <ChevronDown className="w-4 h-4 text-npb-text-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-npb-text-muted" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 pl-4 pr-6">
                  <Droppable
                    droppableId={`block-library-${category.id}`}
                    isDropDisabled={true}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {category.blocks.map((block, index) => (
                          <Draggable
                            key={block.id}
                            draggableId={block.id}
                            index={startIndex + index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                data-dnd-debug-id={block.id}
                                title={block.description}
                                className={`relative bg-npb-surface-base text-npb-text-secondary border border-npb-border-default rounded-none hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong hover:shadow-md hover:scale-[1.02] transition-all duration-200 ease-out ${
                                  snapshot.isDragging
                                    ? 'opacity-60 scale-105 border-npb-border-strong shadow-xl bg-npb-interactive-bg-active'
                                    : ''
                                }`}>
                                <CardContent className="p-4">
                                  {onPick ? (
                                    <button
                                      type="button"
                                      {...provided.dragHandleProps}
                                      onClick={() => onPick(block)}
                                      className={`${TILE_FACE_CLASS} w-full rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-npb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-npb-surface-base cursor-grab active:cursor-grabbing`}>
                                      <TileFace block={block} />
                                    </button>
                                  ) : (
                                    <div
                                      className={`${TILE_FACE_CLASS} cursor-grab active:cursor-grabbing`}
                                      {...provided.dragHandleProps}>
                                      <TileFace block={block} />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
