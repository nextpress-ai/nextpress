import { useSettingsState } from '../useSettingsState';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Eye, Tag } from 'lucide-react';
import { type PostNavigationContent, DEFAULT_CONTENT } from './post-navigation-model';

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostNavigationSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/** Sidebar settings panel for the post navigation block. */
export function PostNavigationSettings({
  block,
  onUpdate,
}: PostNavigationSettingsProps) {
  const { content, updateContent } = useSettingsState<PostNavigationContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const currentShowThumbnail = content?.showThumbnail ?? false;
  const currentShowLabel = content?.showLabel ?? true;

  return (
    <div className="space-y-4">
      {/* Display Settings */}
      <CollapsibleCard title="Display" icon={Eye} defaultOpen>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="nav-show-thumbnail">
              Show Thumbnail
            </SettingsLabel>
            <Switch
              id="nav-show-thumbnail"
              checked={currentShowThumbnail}
              onCheckedChange={(checked) =>
                updateContent({ showThumbnail: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="nav-show-label">Show Label</SettingsLabel>
            <Switch
              id="nav-show-label"
              checked={currentShowLabel}
              onCheckedChange={(checked) =>
                updateContent({ showLabel: checked })
              }
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Label Text */}
      <CollapsibleCard title="Labels" icon={Tag} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="nav-prev-label">Previous Label</SettingsLabel>
            <Input
              id="nav-prev-label"
              value={content?.prevLabel || ''}
              onChange={(e) => updateContent({ prevLabel: e.target.value })}
              placeholder="Previous Post"
              className="mt-1 h-9 text-sm"
            />
          </div>
          <div>
            <SettingsLabel htmlFor="nav-next-label">Next Label</SettingsLabel>
            <Input
              id="nav-next-label"
              value={content?.nextLabel || ''}
              onChange={(e) => updateContent({ nextLabel: e.target.value })}
              placeholder="Next Post"
              className="mt-1 h-9 text-sm"
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
