import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import {
  type PostInfoContent,
  DEFAULT_CONTENT,
  DATE_FORMAT_OPTIONS,
  LAYOUT_OPTIONS,
} from './post-info-model';

interface PostInfoSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/** Sidebar settings panel for the post info block. */
export function PostInfoSettings({ block, onUpdate }: PostInfoSettingsProps) {
  const { content, updateContent } = useSettingsState<PostInfoContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const toggles = [
    {
      id: 'show-date',
      label: 'Show Date',
      key: 'showDate' as const,
      value: content?.showDate ?? true,
    },
    {
      id: 'show-categories',
      label: 'Show Categories',
      key: 'showCategories' as const,
      value: content?.showCategories ?? true,
    },
    {
      id: 'show-tags',
      label: 'Show Tags',
      key: 'showTags' as const,
      value: content?.showTags ?? true,
    },
    {
      id: 'show-readtime',
      label: 'Show Read Time',
      key: 'showReadTime' as const,
      value: content?.showReadTime ?? true,
    },
  ];

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Display" icon={Settings} defaultOpen>
        <div className="space-y-4">
          {toggles.map((toggle) => (
            <div key={toggle.id} className="flex items-center justify-between">
              <SettingsLabel htmlFor={toggle.id}>
                {toggle.label}
              </SettingsLabel>
              <Switch
                id={toggle.id}
                checked={toggle.value}
                onCheckedChange={(checked) =>
                  updateContent({ [toggle.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Format" icon={Settings} defaultOpen>
        <div className="space-y-4">
          <div>
            <SettingsLabel>Date Format</SettingsLabel>
            <Select
              value={content?.dateFormat ?? 'long'}
              onValueChange={(val) =>
                updateContent({
                  dateFormat: val as PostInfoContent['dateFormat'],
                })
              }>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel>Layout</SettingsLabel>
            <Select
              value={content?.layout ?? 'inline'}
              onValueChange={(val) =>
                updateContent({ layout: val as PostInfoContent['layout'] })
              }>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Post" icon={Settings} defaultOpen={false}>
        <div className="space-y-2">
          <SettingsLabel>Post ID</SettingsLabel>
          {content?.postId ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs truncate">
                {content.postId}
              </Badge>
              <button
                onClick={() => updateContent({ postId: '' })}
                className="text-xs text-npb-text-muted hover:text-npb-status-error">
                clear
              </button>
            </div>
          ) : (
            <Input
              value={content?.postId || ''}
              onChange={(e) => updateContent({ postId: e.target.value })}
              placeholder="Auto-set when added to a post"
              className="h-9 text-sm"
            />
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
