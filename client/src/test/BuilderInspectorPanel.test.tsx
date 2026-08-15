import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import { BuilderInspectorPanel } from '@/components/PageBuilder/BuilderInspectorPanel';

const headingBlock: BlockConfig = {
  id: 'heading-1',
  name: 'core/heading',
  type: 'block',
  label: 'Heading',
  category: 'basic',
  content: { kind: 'text', value: 'Hello world', level: 2 },
  settings: {},
  parentId: null,
};

describe('BuilderInspectorPanel', () => {
  it('shows an explicit empty state when no block is selected', () => {
    render(
      <BuilderInspectorPanel
        selectedBlock={null}
        updateBlock={vi.fn()}
        setHoverHighlight={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Block inspector' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Select a block to edit its settings',
    );
  });

  it('renders block content settings for a selected heading', () => {
    render(
      <div className="npb-editor-sidebar flex h-[480px] w-80 flex-col">
        <BuilderInspectorPanel
          selectedBlock={headingBlock}
          updateBlock={vi.fn()}
          setHoverHighlight={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading text')).toBeInTheDocument();
  });
});

