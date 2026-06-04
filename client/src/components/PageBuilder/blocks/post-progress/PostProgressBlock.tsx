import * as React from 'react';
import { useState, useEffect } from 'react';
import { BarChart3, Palette, Settings } from 'lucide-react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsState } from '../useSettingsState';
import { useBlockState } from '../useBlockState';

// ============================================================================
// TYPES
// ============================================================================

export type PostProgressContent = {
  color?: string;
  height?: number;
  position?: 'top' | 'bottom';
  showPercentage?: boolean;
  backgroundColor?: string;
  className?: string;
};

const DEFAULT_CONTENT: PostProgressContent = {
  color: '#3b82f6',
  height: 4,
  position: 'top',
  showPercentage: false,
  backgroundColor: 'transparent',
  className: '',
};

const EDITOR_PREVIEW_FILL = 40;

// ============================================================================
// HOOKS
// ============================================================================

/** Track scroll progress (0–100). Uses rAF debouncing. Only active when `enabled`. */
function useScrollProgress(enabled: boolean): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct =
          scrollable > 0
            ? Math.min((window.scrollY / scrollable) * 100, 100)
            : 0;
        setProgress(Math.round(pct));
        rafId = null;
      });
    };
    handleScroll(); // initial position
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [enabled]);
  return progress;
}

// ============================================================================
// RENDERER
// ============================================================================

/**
 * Pure presentational renderer for the Reading Progress block.
 * Preview mode: fixed bar tracking scroll. Editor mode: static inline preview.
 */
function PostProgressRenderer({
  content,
  styles,
  isPreview,
}: {
  content: PostProgressContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}) {
  const color = content?.color ?? DEFAULT_CONTENT.color!;
  const height = content?.height ?? DEFAULT_CONTENT.height!;
  const position = content?.position ?? DEFAULT_CONTENT.position!;
  const showPercentage = content?.showPercentage ?? false;
  const backgroundColor = content?.backgroundColor ?? 'transparent';

  const scrollProgress = useScrollProgress(!!isPreview);
  const fillWidth = isPreview ? scrollProgress : EDITOR_PREVIEW_FILL;

  const containerClassName = [
    'wp-block-post-progress',
    content?.className || '',
  ]
    .filter(Boolean)
    .join(' ');

  // --- Preview mode: fixed bar attached to viewport edge ---
  if (isPreview) {
    const positionStyles: React.CSSProperties = {
      position: 'fixed',
      left: 0,
      right: 0,
      zIndex: 50,
      ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
    };

    return (
      <div
        className={containerClassName}
        style={{ ...positionStyles, height, backgroundColor, ...styles }}>
        <div
          style={{
            height: '100%',
            width: `${fillWidth}%`,
            backgroundColor: color,
            transition: 'width 100ms linear',
          }}
        />
        {showPercentage && (
          <span
            style={{
              position: 'absolute',
              [position === 'top' ? 'top' : 'bottom']: height + 4,
              right: 8,
              fontSize: '0.7rem',
              fontWeight: 600,
              color,
              lineHeight: 1,
              pointerEvents: 'none',
            }}>
            {fillWidth}%
          </span>
        )}
      </div>
    );
  }

  // --- Editor mode: inline static preview ---
  return (
    <div className={containerClassName} style={styles}>
      <div
        style={{
          position: 'relative',
          height,
          backgroundColor,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid var(--npb-border-default)',
        }}>
        <div
          style={{
            height: '100%',
            width: `${fillWidth}%`,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}>
        <span className="text-xs text-npb-text-secondary font-medium">
          Reading Progress Bar
        </span>
        <span className="text-xs text-npb-text-muted italic">
          Fixed to viewport when published
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostProgressBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostProgressContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <PostProgressRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

/** Sidebar settings panel for the Reading Progress block. */
function PostProgressSettings({
  block,
  onUpdate,
}: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
  const { content, updateContent } = useSettingsState<PostProgressContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Appearance */}
      <CollapsibleCard title="Appearance" icon={Palette} defaultOpen>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="progress-color">Bar Color</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="progress-color"
                type="color"
                value={content?.color ?? DEFAULT_CONTENT.color}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="h-9 w-9 cursor-pointer rounded border border-npb-border-default p-0.5"
              />
              <Input
                value={content?.color ?? DEFAULT_CONTENT.color}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="h-9 text-sm flex-1"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="progress-bg">Background Color</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="progress-bg"
                type="color"
                value={
                  content?.backgroundColor === 'transparent'
                    ? '#ffffff'
                    : (content?.backgroundColor ?? '#ffffff')
                }
                onChange={(e) =>
                  updateContent({ backgroundColor: e.target.value })
                }
                className="h-9 w-9 cursor-pointer rounded border border-npb-border-default p-0.5"
              />
              <Input
                value={
                  content?.backgroundColor ??
                  DEFAULT_CONTENT.backgroundColor
                }
                onChange={(e) =>
                  updateContent({ backgroundColor: e.target.value })
                }
                className="h-9 text-sm flex-1"
                placeholder="transparent"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="progress-height">Height (px)</SettingsLabel>
            <Input
              id="progress-height"
              type="number"
              min={2}
              max={12}
              value={content?.height ?? DEFAULT_CONTENT.height}
              onChange={(e) => {
                const val = Math.max(2, Math.min(12, Number(e.target.value)));
                updateContent({ height: val });
              }}
              className="mt-1 h-9 text-sm"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Behavior */}
      <CollapsibleCard title="Behavior" icon={Settings} defaultOpen>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="progress-position">Position</SettingsLabel>
            <Select
              value={content?.position ?? DEFAULT_CONTENT.position}
              onValueChange={(val) =>
                updateContent({ position: val as 'top' | 'bottom' })
              }>
              <SelectTrigger
                id="progress-position"
                className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top of viewport</SelectItem>
                <SelectItem value="bottom">Bottom of viewport</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="progress-percentage">
              Show Percentage
            </SettingsLabel>
            <Switch
              id="progress-percentage"
              checked={content?.showPercentage ?? false}
              onCheckedChange={(checked) =>
                updateContent({ showPercentage: checked })
              }
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

/**
 * Post Reading Progress block definition for the PageBuilder.
 * Fixed progress bar that fills as the reader scrolls. Static inline preview in editor.
 */
const PostProgressBlock: BlockDefinition = {
  id: 'post/progress',
  label: 'Reading Progress',
  icon: BarChart3,
  description: 'Show a reading progress indicator bar',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {},
  component: PostProgressBlockComponent,
  settings: PostProgressSettings,
  hasSettings: true,
};

export default PostProgressBlock;
