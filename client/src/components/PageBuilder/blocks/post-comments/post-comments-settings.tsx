import { getBlockStateAccessor } from '../blockStateRegistry';
import type { BlockConfig, BlockContent } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Settings } from 'lucide-react';
import { type PostCommentsContent, DEFAULT_CONTENT } from './post-comments-model';

/** Sidebar settings panel for the post comments block. */
export function PostCommentsSettings({
  block,
  onUpdate,
}: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
  const accessor = getBlockStateAccessor(block.id);
  const content = (block.content as PostCommentsContent) || DEFAULT_CONTENT;

  const updateContent = (updates: Partial<PostCommentsContent>) => {
    const updated = { ...content, ...updates };
    if (accessor) {
      accessor.setContent(updated);
    } else if (onUpdate) {
      onUpdate({ content: { ...updated } as BlockContent });
    }
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Display" icon={Settings} defaultOpen>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pc-show-form">Show comment form</SettingsLabel>
            <Switch
              id="pc-show-form"
              checked={content.showForm ?? true}
              onCheckedChange={(v) => updateContent({ showForm: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pc-show-count">Show comment count</SettingsLabel>
            <Switch
              id="pc-show-count"
              checked={content.showCount ?? true}
              onCheckedChange={(v) => updateContent({ showCount: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="pc-allow-replies">Allow replies</SettingsLabel>
            <Switch
              id="pc-allow-replies"
              checked={content.allowReplies ?? true}
              onCheckedChange={(v) => updateContent({ allowReplies: v })}
            />
          </div>
          <div>
            <SettingsLabel htmlFor="pc-per-page">Comments per page</SettingsLabel>
            <Input
              id="pc-per-page"
              type="number"
              min={1}
              max={100}
              className="h-9"
              value={content.commentsPerPage ?? 10}
              onChange={(e) =>
                updateContent({
                  commentsPerPage: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
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
