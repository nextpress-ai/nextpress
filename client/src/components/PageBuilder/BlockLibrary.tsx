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
import type { BlockDefinition } from './blocks/types';
import { Box, ChevronDown, ChevronRight, Search, X } from 'lucide-react';

export type BlockLibraryCategory = {
  id: string;
  name: string;
  blocks: BlockDefinition[];
};

if (import.meta.env.DEBUG_BUILDER) {
  console.log('blockRegistry:', blockRegistry);
}

const allBlocks = Object.values(blockRegistry).filter(
  (block, index, arr) => arr.findIndex((b) => b.id === block.id) === index
);

/**
 * Category groups for the block library sidebar (Basic, Media, …).
 * Exported so BuilderSidebar can own accordion open state for fold-all.
 */
export function buildBlockLibraryCategories(): BlockLibraryCategory[] {
  let cats: BlockLibraryCategory[] = [
    {
      id: 'basic',
      name: 'Basic',
      blocks: allBlocks.filter((b) => b.category === 'basic'),
    },
    {
      id: 'form',
      name: 'Form fields',
      blocks: allBlocks.filter((b) => b.category === 'form'),
    },
    {
      id: 'media',
      name: 'Media',
      blocks: allBlocks.filter((b) => b.category === 'media'),
    },
    {
      id: 'layout',
      name: 'Layout',
      blocks: allBlocks.filter((b) => b.category === 'layout'),
    },
    {
      id: 'advanced',
      name: 'Advanced',
      blocks: allBlocks.filter((b) => b.category === 'advanced'),
    },
    {
      id: 'post',
      name: 'Post',
      blocks: allBlocks.filter((b) => b.category === 'post'),
    },
  ].filter((c) => c.blocks.length > 0);

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
};

export default function BlockLibrary({
  categories: categoriesProp,
  openCategories: openCategoriesProp,
  onCategoryOpenChange,
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

  /** Filter blocks by label/description/category; drop emptied categories. */
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        blocks: category.blocks.filter((block) =>
          `${block.label} ${block.description ?? ''} ${block.category ?? ''}`
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-npb-text-muted" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blocks..."
          className="h-9 rounded-none border-npb-border-default bg-npb-surface-base pl-9 pr-9 text-sm text-npb-text-primary focus-visible:outline-none"
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
                                {...provided.dragHandleProps}
                                data-dnd-debug-id={block.id}
                                title={block.description}
                                className={`cursor-grab bg-npb-surface-base text-npb-text-secondary border border-npb-border-default rounded-none hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong hover:shadow-md hover:scale-[1.02] transition-all duration-200 ease-out ${
                                  snapshot.isDragging
                                    ? 'opacity-60 scale-105 border-npb-border-strong shadow-xl bg-npb-interactive-bg-active'
                                    : ''
                                }`}>
                                <CardContent className="p-4">
                                  <div className="flex flex-col items-center gap-3 text-center overflow-ellipsis">
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
                                  </div>
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
