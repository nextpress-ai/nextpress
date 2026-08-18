import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { DragDropContext } from '@/lib/dnd'
import BlockRenderer, { ContainerChildren } from '../components/PageBuilder/BlockRenderer'
import { BlockActionsProvider, type BlockActionsContextValue } from '../components/PageBuilder/BlockActionsContext'
import { CANVAS_BLOCK_TOOLBAR_IDLE_MS } from '../components/PageBuilder/use-canvas-block-toolbar'
import type { BlockConfig, BlockContent } from '@shared/schema-types'

function getText(content: BlockContent): string {
  if (!content) return ''
  if (typeof content === 'object' && 'kind' in content) {
    return (content as any).kind === 'text' ? (content as any).value ?? '' : ''
  }
  if (typeof (content as any)?.text === 'string') return (content as any).text
  if (typeof (content as any)?.content === 'string') return (content as any).content
  if (typeof content === 'string') return content
  return ''
}

const mockBlockRegistry = vi.hoisted(() => ({
  'core/paragraph': {
    id: 'core/paragraph',
    name: 'Paragraph',
    label: 'Paragraph',
    component: ({ value, onChange }: { value: BlockConfig; onChange: (updated: BlockConfig) => void }) => (
      <p className="wp-block-paragraph" style={value.styles as any}>
        {getText(value.content)}
      </p>
    ),
    isContainer: false,
  },
  'core/group': {
    id: 'core/group',
    name: 'Group',
    label: 'Group',
    component: ({ value, onChange }: { value: BlockConfig; onChange: (updated: BlockConfig) => void }) => (
      <div className="wp-block-group" data-testid="group-block" data-block-id={value.id}>
        Group Container
      </div>
    ),
    isContainer: true,
    handlesOwnChildren: false,
  },
}));

// Mock the block registry using the resolved module path
const blocksModulePath = vi.hoisted(
  () =>
    '../components/PageBuilder/blocks',
);
vi.mock(blocksModulePath, () => ({
  blockRegistry: mockBlockRegistry,
}));
vi.mock(`${blocksModulePath}/index.ts`, () => ({
  blockRegistry: mockBlockRegistry,
}));

// Simplify DnD components for testing
vi.mock('@/lib/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children(
      { innerRef: vi.fn(), droppableProps: {}, placeholder: null },
      { isDraggingOver: false },
    ),
  Draggable: ({ children }: any) =>
    children(
      { innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

describe('BlockRenderer', () => {
  const mockActions = {
    selectedBlockId: null,
    editingBlockId: null,
    hoveredBlockId: null,
    onSelect: vi.fn(),
    onStartEditing: vi.fn(),
    onStopEditing: vi.fn(),
    onHoverBlock: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    hoverHighlight: null as any
  }

  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <DragDropContext onDragEnd={() => {}}>
        <BlockActionsProvider value={mockActions as unknown as BlockActionsContextValue}>
          {children}
        </BlockActionsProvider>
      </DragDropContext>
    )
  }

  const createMockBlock = (id: string, name: string = 'core/paragraph', children?: BlockConfig[]): BlockConfig => ({
    id,
    name,
    type: children ? 'container' : 'block',
    parentId: null,
    label: name === 'core/paragraph' ? 'Paragraph' : name === 'core/group' ? 'Group' : name,
    content: children ? { kind: 'structured', data: {} } : { kind: 'text', value: `Content for ${id}` },
    styles: {},
    children: children || [],
    settings: {}
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Block Rendering', () => {
    it('should render a simple paragraph block', () => {
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const renderedParagraph = document.querySelector('.wp-block-paragraph');
      expect(renderedParagraph).toBeInTheDocument()
      expect(screen.getByText('Content for test-block')).toBeInTheDocument()
    })

    it('should render fallback for unknown block type', () => {
      const block = createMockBlock('unknown-block', 'unknown/type')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      expect(screen.getByText('unknown/type block')).toBeInTheDocument()
      expect(screen.getByText('Not implemented yet')).toBeInTheDocument()
    })
  })

  describe('Container Block Rendering', () => {
    it('should render container block with nested children', () => {
      const containerBlock = createMockBlock('container-1', 'core/group', [
        createMockBlock('child-1', 'core/paragraph'),
        createMockBlock('child-2', 'core/paragraph')
      ])
      
      renderWithProviders(
        <BlockRenderer
          block={containerBlock}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      // Container should be rendered with the actual wp-block-group class
      const groupBlock = document.querySelector('.wp-block-group')
      expect(groupBlock).toBeInTheDocument()
      
      // Children should be rendered
      expect(screen.getByText('Content for child-1')).toBeInTheDocument()
      expect(screen.getByText('Content for child-2')).toBeInTheDocument()
    })

    it('should show droppable area for empty container in edit mode', () => {
      const emptyContainer = createMockBlock('empty-container', 'core/group', [])
      
      renderWithProviders(
        <BlockRenderer
          block={emptyContainer}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      expect(screen.getByText('Drag blocks here')).toBeInTheDocument()
    })

    it('should not show droppable area in preview mode', () => {
      const emptyContainer = createMockBlock('empty-container', 'core/group', [])
      
      renderWithProviders(
        <BlockRenderer
          block={emptyContainer}
          isSelected={false}
          isPreview={true}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      expect(screen.queryByText('Drag blocks here')).not.toBeInTheDocument()
    })
  })

  describe('Selection and Interaction', () => {
    it('should show block controls when hovered', () => {
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const blockElement = paragraphElement?.closest('.relative.group')
      expect(blockElement).toBeInTheDocument()
      
      // Hover to show controls
      fireEvent.mouseEnter(blockElement!)
      
      // Block label should use display name
      expect(screen.getByText('Paragraph')).toBeInTheDocument()
    })

    it('should call onSelect when clicked', () => {
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const blockElement = paragraphElement?.closest('.relative.group')
      fireEvent.click(blockElement!)
      
      expect(mockActions.onSelect).toHaveBeenCalledWith('test-block')
    })

    it('does not bubble click to the canvas parent', () => {
      const onCanvasClick = vi.fn()
      const block = createMockBlock('test-block', 'core/paragraph')

      renderWithProviders(
        <div onClick={onCanvasClick}>
          <BlockRenderer
            block={block}
            isSelected={false}
            isPreview={false}
            onDuplicate={() => {}}
            onDelete={() => {}}
          />
        </div>
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const blockElement = paragraphElement?.closest('.relative.group')
      fireEvent.click(blockElement!)

      expect(mockActions.onSelect).toHaveBeenCalledWith('test-block')
      expect(onCanvasClick).not.toHaveBeenCalled()
    })

    it('should show selection highlight when selected', () => {
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const highlight = document.querySelector('.block-test-block')
      expect(highlight).toHaveClass('npb-canvas-block-selected')
      expect(highlight).toHaveAttribute('data-chrome', 'true')
    })

    it('should not show controls in preview mode', () => {
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={true}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const blockElement = paragraphElement?.closest('.relative.group')
      fireEvent.mouseEnter(blockElement!)
      
      // Controls should not be visible in preview mode
      expect(screen.queryByText('Paragraph')).not.toBeInTheDocument()
    })

    it('should call onDuplicate when duplicate button clicked', () => {
      const onDuplicate = vi.fn()
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={onDuplicate}
          onDelete={() => {}}
        />
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const wrapper = paragraphElement?.closest('.relative.group')!
      fireEvent.mouseEnter(wrapper)
      const duplicateButton = within(wrapper as HTMLElement).getByRole('button', { name: /duplicate/i })
      fireEvent.click(duplicateButton)
      
      expect(onDuplicate).toHaveBeenCalled()
    })

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn()
      const block = createMockBlock('test-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={onDelete}
        />
      )

      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const wrapper = paragraphElement?.closest('.relative.group')!
      fireEvent.mouseEnter(wrapper)
      const deleteButton = within(wrapper as HTMLElement).getByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)
      
      expect(onDelete).toHaveBeenCalled()
    })

    it('fades the toolbar and selection ring after idle, while the block stays selected', () => {
      vi.useFakeTimers()
      try {
        const block = createMockBlock('test-block', 'core/paragraph')

        renderWithProviders(
          <BlockRenderer
            block={block}
            isSelected={true}
            isPreview={false}
            onDuplicate={() => {}}
            onDelete={() => {}}
          />
        )

        const toolbar = document.querySelector('.npb-canvas-toolbar')
        expect(toolbar).toHaveAttribute('data-open', 'true')
        const selectedBlock = document.querySelector('.block-test-block')
        expect(selectedBlock).toHaveClass('npb-canvas-block-selected')
        expect(selectedBlock).toHaveAttribute('data-chrome', 'true')

        act(() => {
          vi.advanceTimersByTime(CANVAS_BLOCK_TOOLBAR_IDLE_MS)
        })

        expect(document.querySelector('.npb-canvas-toolbar')).toHaveAttribute(
          'data-open',
          'false',
        )
        const idleBlock = document.querySelector('.block-test-block')
        expect(idleBlock).toHaveClass('npb-canvas-block-selected')
        expect(idleBlock).toHaveAttribute('data-chrome', 'false')
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Nested Block Selection', () => {
    it('should handle selection of nested blocks correctly', () => {
      const containerBlock = createMockBlock('container-1', 'core/group', [
        createMockBlock('child-1', 'core/paragraph'),
        createMockBlock('child-2', 'core/paragraph')
      ])
      
      renderWithProviders(
        <BlockRenderer
          block={containerBlock}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      // Click on first child block
      const firstChild = screen.getByText('Content for child-1')
      const firstChildBlock = firstChild.closest('.relative.group')
      fireEvent.click(firstChildBlock!)
      
      // Should select the child block, not the container
      expect(mockActions.onSelect).toHaveBeenCalledWith('child-1')
    })

    it('should prevent event bubbling when clicking nested blocks', () => {
      const containerBlock = createMockBlock('container-1', 'core/group', [
        createMockBlock('child-1', 'core/paragraph')
      ])
      
      renderWithProviders(
        <BlockRenderer
          block={containerBlock}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const childBlock = screen.getByText('Content for child-1').closest('.relative.group')
      fireEvent.click(childBlock!)
      
      // Should only call onSelect once for the child, not the container
      expect(mockActions.onSelect).toHaveBeenCalledTimes(1)
      expect(mockActions.onSelect).toHaveBeenCalledWith('child-1')
    })
  })

  describe('Styles and CSS Classes', () => {
    it('should apply custom styles to block', () => {
      const block = createMockBlock('styled-block', 'core/paragraph')
      block.styles = { 
        backgroundColor: 'red', 
        padding: '20px',
        margin: '10px' 
      }
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      )

      const blockElement = document.querySelector('.wp-block-paragraph') as HTMLElement
      expect(blockElement).toHaveStyle({ 
        padding: '20px'
      })
    })

    it('should handle margin and padding highlight styles', () => {
      const block = createMockBlock('highlighted-block', 'core/paragraph')
      
      renderWithProviders(
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={() => {}}
          onDelete={() => {}}
          hoverHighlight="padding"
        />
      )

      // This would test the hover highlight functionality
      // The exact implementation depends on how the highlight is applied
      const paragraphElement = document.querySelector('.wp-block-paragraph')
      const blockElement = paragraphElement?.closest('.relative.group')
      expect(blockElement).toBeInTheDocument()
    })
  })
})