import React from 'react';
import type { BlockConfig, BlockContent } from '@shared/schema-types';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { SettingsLabel } from '../../shared';
import { Plus, Trash2, SquareMousePointer, Settings } from 'lucide-react';
import { useBlockState } from '../useBlockState';
import { useSettingsState } from '../useSettingsState';

// ============================================================================
// TYPES
// ============================================================================

interface ButtonItem {
  id: string;
  text: string;
  url: string;
  linkTarget?: '_self' | '_blank';
  rel?: string;
  title?: string;
  className?: string;
}

type ButtonsData = {
  buttons?: ButtonItem[];
  layout?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

type ButtonsContent = BlockContent & {
  data?: ButtonsData;
};

const DEFAULT_DATA: ButtonsData = {
  buttons: [
    {
      id: 'btn-1',
      text: 'Click Me',
      url: '#',
      linkTarget: '_self',
      rel: '',
      title: '',
      className: '',
    },
  ],
  layout: 'flex-start',
  orientation: 'horizontal',
  className: '',
};

const DEFAULT_CONTENT: ButtonsContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

// ============================================================================
// RENDERER
// ============================================================================

interface ButtonsRendererProps {
  content: ButtonsContent;
  styles?: React.CSSProperties;
}

function ButtonsRenderer({ content, styles }: ButtonsRendererProps) {
  const buttonsData = content?.kind === 'structured' ? (content.data as ButtonsData) : DEFAULT_DATA;
  
  const buttons: ButtonItem[] = Array.isArray(buttonsData?.buttons)
    ? buttonsData.buttons
    : [];

  const layout = buttonsData?.layout || 'flex-start';
  const orientation = buttonsData?.orientation || 'horizontal';
  const className = [
    'wp-block-buttons',
    orientation === 'vertical' ? 'is-vertical' : '',
    layout === 'center' ? 'is-content-justification-center' : '',
    layout === 'right' ? 'is-content-justification-right' : '',
    layout === 'space-between' ? 'is-content-justification-space-between' : '',
    buttonsData?.className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={{
        ...styles,
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        justifyContent: layout,
        gap: '0.5em',
        alignItems: orientation === 'vertical' ? 'flex-start' : 'center',
        flexWrap: 'wrap',
      }}>
      {buttons.map((button, index) => {
        const buttonClassName = ['wp-block-button', button.className || '']
          .filter(Boolean)
          .join(' ');

        return (
          <div key={button.id || index} className={buttonClassName}>
            <a
              className="wp-block-button__link"
              href={button.url}
              target={button.linkTarget}
              rel={button.rel}
              title={button.title}
              style={{
                backgroundColor: '#007cba',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}>
              {button.text}
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ButtonsBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<ButtonsContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <ButtonsRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface ButtonsSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ButtonsSettings({ block, onUpdate }: ButtonsSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  // Get current state
  const content = accessor
    ? (accessor.getContent() as ButtonsContent)
    : (block.content as ButtonsContent) || DEFAULT_CONTENT;
  const buttonsData = content?.kind === 'structured' ? (content.data as ButtonsData) : DEFAULT_DATA;
  
  const buttons: ButtonItem[] = Array.isArray(buttonsData?.buttons)
    ? buttonsData.buttons
    : [];

  // Update handlers
  const updateContent = (updates: Partial<ButtonsData>) => {
    if (accessor) {
      const current = accessor.getContent() as ButtonsContent;
      const currentData = current?.kind === 'structured' ? (current.data as ButtonsData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as ButtonsContent);
      rerender();
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured' 
        ? (block.content.data as ButtonsData) 
        : DEFAULT_DATA;
      onUpdate({
        content: {
          kind: 'structured',
          data: {
            ...currentData,
            ...updates,
          },
        } as BlockContent,
      });
    }
  };

  const updateButtons = (newButtons: ButtonItem[]) => {
    updateContent({ buttons: newButtons });
  };

  const addButton = () => {
    const newButton: ButtonItem = {
      id: `btn-${Date.now()}`,
      text: 'Button',
      url: '#',
      linkTarget: '_self',
      rel: '',
      title: '',
      className: '',
    };
    updateButtons([...buttons, newButton]);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    updateButtons(newButtons);
  };

  const updateButton = (index: number, updates: Partial<ButtonItem>) => {
    const newButtons = buttons.map((btn, i) =>
      i === index ? { ...btn, ...updates } : btn
    );
    updateButtons(newButtons);
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={SquareMousePointer} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <SettingsLabel>Buttons</SettingsLabel>
            <Button type="button" variant="outline" size="sm" onClick={addButton}>
              <Plus className="w-4 h-4 mr-1" />
              Add Button
            </Button>
          </div>

          {buttons.map((button, index) => (
            <div key={button.id || index} className="border border-npb-border-default rounded p-4 space-y-3 bg-npb-surface-raised">
              <div className="flex justify-between items-center">
                <SettingsLabel>Button {index + 1}</SettingsLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeButton(index)}
                  className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <SettingsLabel htmlFor={`btn-text-${index}`}>Button Text</SettingsLabel>
                <Input
                  id={`btn-text-${index}`}
                  value={button.text}
                  onChange={(e) => updateButton(index, { text: e.target.value })}
                  placeholder="Button text"
                  className="mt-1 h-9"
                />
              </div>

              <div>
                <SettingsLabel htmlFor={`btn-url-${index}`}>URL</SettingsLabel>
                <Input
                  id={`btn-url-${index}`}
                  value={button.url}
                  onChange={(e) => updateButton(index, { url: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-1 h-9"
                />
              </div>

              <div>
                <SettingsLabel htmlFor={`btn-target-${index}`}>Link Target</SettingsLabel>
                <Select
                  value={button.linkTarget || '_self'}
                  onValueChange={(value: '_self' | '_blank') =>
                    updateButton(index, { linkTarget: value })
                  }>
                  <SelectTrigger id={`btn-target-${index}`} className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_self">Same Window</SelectItem>
                    <SelectItem value="_blank">New Window</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="buttons-layout">Layout</SettingsLabel>
            <Select
              value={buttonsData?.layout || 'flex-start'}
              onValueChange={(value) => updateContent({ layout: value })}>
              <SelectTrigger id="buttons-layout" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flex-start">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="flex-end">Right</SelectItem>
                <SelectItem value="space-between">Space Between</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="buttons-orientation">Orientation</SettingsLabel>
            <Select
              value={buttonsData?.orientation || 'horizontal'}
              onValueChange={(value) => updateContent({ orientation: value as any })}>
              <SelectTrigger id="buttons-orientation" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ButtonsBlock: BlockDefinition = {
  id: 'core/buttons',
  label: 'Buttons',
  icon: SquareMousePointer,
  description:
    'Prompt visitors to take action with a group of button-style links',
  category: 'basic',
  defaultContent: {
    kind: 'structured',
    data: {
      buttons: [
        {
          id: 'btn-1',
          text: 'Click Me',
          url: '#',
          linkTarget: '_self',
          rel: '',
          title: '',
          className: '',
        },
      ],
      layout: 'flex-start',
      orientation: 'horizontal',
      className: '',
    },
  },
  defaultStyles: { margin: '1em 0' },
  component: ButtonsBlockComponent,
  settings: ButtonsSettings,
  hasSettings: true,
};

export default ButtonsBlock;
