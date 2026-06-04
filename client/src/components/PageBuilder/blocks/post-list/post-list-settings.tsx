import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { useSettingsState } from '../useSettingsState';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { LayoutList, Settings } from 'lucide-react';
import { type PostListContent, DEFAULT_CONTENT } from './post-list-model';

export function PostListSettings({
  block,
  onUpdate,
}: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
  const { content, updateContent } = useSettingsState<PostListContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Layout" icon={LayoutList} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="pl-layout">Layout</SettingsLabel>
            <Select
              value={content.layout ?? 'grid'}
              onValueChange={(v) => updateContent({ layout: v as any })}>
              <SelectTrigger id="pl-layout" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid (3 columns)</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="cards">Cards (2 columns)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel htmlFor="pl-count">Posts per page</SettingsLabel>
            <Input
              id="pl-count"
              type="number"
              min={1}
              max={50}
              className="h-9"
              value={content.postsPerPage ?? 6}
              onChange={(e) =>
                updateContent({
                  postsPerPage: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Display" icon={Settings} defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pl-excerpt">Show excerpt</SettingsLabel>
            <Switch
              id="pl-excerpt"
              checked={content.showExcerpt ?? true}
              onCheckedChange={(v) => updateContent({ showExcerpt: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pl-image">Show featured image</SettingsLabel>
            <Switch
              id="pl-image"
              checked={content.showFeaturedImage ?? true}
              onCheckedChange={(v) => updateContent({ showFeaturedImage: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pl-date">Show date</SettingsLabel>
            <Switch
              id="pl-date"
              checked={content.showDate ?? true}
              onCheckedChange={(v) => updateContent({ showDate: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pl-author">Show author</SettingsLabel>
            <Switch
              id="pl-author"
              checked={content.showAuthor ?? true}
              onCheckedChange={(v) => updateContent({ showAuthor: v })}
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Query" icon={Settings} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="pl-blog">Blog ID (optional)</SettingsLabel>
            <Input
              id="pl-blog"
              className="h-9"
              value={content.blogId ?? ''}
              onChange={(e) => updateContent({ blogId: e.target.value })}
              placeholder="Filter by blog ID"
            />
          </div>
          <div>
            <SettingsLabel htmlFor="pl-orderby">Order by</SettingsLabel>
            <Select
              value={content.orderBy ?? 'date'}
              onValueChange={(v) => updateContent({ orderBy: v as any })}>
              <SelectTrigger id="pl-orderby" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel htmlFor="pl-order">Order</SettingsLabel>
            <Select
              value={content.order ?? 'desc'}
              onValueChange={(v) => updateContent({ order: v as any })}>
              <SelectTrigger id="pl-order" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
