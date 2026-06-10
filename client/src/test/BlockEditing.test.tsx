import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeadingBlock from '../components/PageBuilder/blocks/heading/HeadingBlock';
import TextBlock from '../components/PageBuilder/blocks/text/TextBlock';
import ButtonBlock from '../components/PageBuilder/blocks/button/ButtonBlock';
import SpacerBlock from '../components/PageBuilder/blocks/spacer/SpacerBlock';
import type { BlockConfig } from '@shared/schema-types';

describe('Block Editing', () => {
  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  describe('HeadingBlock Editing', () => {
    it('should update heading text when input changes', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: { kind: 'text', value: 'Original Heading', level: 2 } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText(/heading text/i);
      fireEvent.change(input, { target: { value: 'Updated Heading' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'Updated Heading',
          level: 2,
        },
      });
    });

    it('should update heading level when button clicked', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: { kind: 'text', value: 'Test', level: 2 } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const h4Button = screen.getByLabelText('Heading level 4');
      fireEvent.click(h4Button);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        styles: {
          fontSize: '1.5rem',
          fontWeight: '600',
        },
      });
    });

    // Text alignment is now handled by the Style tab in BlockSettings (styles.textAlign),
    // not by the heading's own settings panel. See Bug #3 fix.
  });

  describe('TextBlock Editing', () => {
    it('should update text content when textarea changes', () => {
      const block: BlockConfig = {
        id: 'text-1',
        name: 'core/paragraph',
        type: 'block',
        parentId: null,
        content: { kind: 'text', value: 'Original text' } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = TextBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const textarea = screen.getByLabelText(/text content/i);
      fireEvent.change(textarea, { target: { value: 'Updated text' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'Updated text',
        },
      });
    });

    // Text alignment is now handled centrally by BlockSettings Style tab (styles.textAlign),
    // not by individual block settings components. See tab reorganization.
  });

  describe('ButtonBlock Editing', () => {
    it('should update button text', () => {
      const block: BlockConfig = {
        id: 'button-1',
        name: 'core/button',
        type: 'block',
        parentId: null,
        content: { kind: 'text', value: 'Click me', url: 'https://example.com' } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = ButtonBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText(/button text/i);
      fireEvent.change(input, { target: { value: 'New button text' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'New button text',
          url: 'https://example.com',
        },
      });
    });

    it('should update button URL', () => {
      const block: BlockConfig = {
        id: 'button-1',
        name: 'core/button',
        type: 'block',
        parentId: null,
        content: { kind: 'text', value: 'Click me', url: 'https://example.com' } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = ButtonBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText(/link url/i);
      fireEvent.change(input, { target: { value: 'https://newurl.com' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'Click me',
          url: 'https://newurl.com',
        },
      });
    });
  });

  describe('SpacerBlock Editing', () => {
    it('should update spacer height via input', () => {
      const block: BlockConfig = {
        id: 'spacer-1',
        name: 'core/spacer',
        type: 'block',
        parentId: null,
        content: { kind: 'structured', data: { height: 100 } },
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = SpacerBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('spinbutton', { name: /height/i });
      fireEvent.change(input, { target: { value: '150' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'structured',
          data: { height: 150 },
        },
      });
    });
  });

  describe('Content Merging', () => {
    it('should preserve existing content properties when updating', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: {
          kind: 'text',
          value: 'Test',
          level: 2,
          textAlign: 'center',
          anchor: 'my-anchor',
          className: 'custom-class',
        } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      // Update only the heading text
      const input = screen.getByLabelText(/heading text/i);
      fireEvent.change(input, { target: { value: 'New Text' } });

      // Should merge with existing properties
      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'New Text',
          level: 2,
          textAlign: 'center',
          anchor: 'my-anchor',
          className: 'custom-class',
        },
      });
    });

    it('should allow overwriting specific properties', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: {
          kind: 'text',
          value: 'Test',
          level: 2,
          textAlign: 'left',
        } as any,
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      // Update the level
      const h5Button = screen.getByLabelText('Heading level 5');
      fireEvent.click(h5Button);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        styles: {
          fontSize: '1.25rem',
          fontWeight: '600',
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: { kind: 'empty' },
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      render(<Settings block={block} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText(/heading text/i);
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'New content' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'New content',
        },
      });
    });

    it('should handle undefined content', () => {
      const block: BlockConfig = {
        id: 'heading-1',
        name: 'core/heading',
        type: 'block',
        parentId: null,
        content: { kind: 'empty' },
        styles: {},
        children: [],
        settings: {},
      };

      const Settings = HeadingBlock.settings!;
      
      // Should render without crashing
      expect(() => {
        render(<Settings block={block} onUpdate={mockOnUpdate} />);
      }).not.toThrow();
    });
  });
});
