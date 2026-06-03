import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HeadingBlock from '../components/PageBuilder/blocks/heading/HeadingBlock'
import type { BlockConfig } from '@shared/schema-types'

// Mock the useBlockState hook
const mockOnChange = vi.fn()

vi.mock('../components/PageBuilder/blocks/useBlockState', () => ({
  useBlockState: ({ value }: { value: BlockConfig }) => ({
    content: value.content,
    styles: value.styles,
  })
}))

describe('HeadingBlock', () => {
  const createHeadingBlock = (content: any): BlockConfig => ({
    id: 'test-heading',
    name: 'core/heading',
    type: 'block',
    parentId: null,
    label: 'Heading',
    content,
    styles: {},
    children: [],
    settings: {}
  })

  describe('HeadingBlockComponent', () => {
    it('should render heading with default content', () => {
      const block = createHeadingBlock({ kind: 'text', value: 'Test Heading', level: 2 })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Test Heading')
      expect(heading.tagName).toBe('H2')
    })

    it('should render different heading levels', () => {
      const levels = [1, 2, 3, 4, 5, 6] as const
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      levels.forEach(level => {
        const block = createHeadingBlock({ kind: 'text', value: `H${level} Heading`, level })
        
        const { container } = render(<Component value={block} onChange={mockOnChange} />)
        const heading = container.querySelector(`h${level}`)
        
        expect(heading).toBeInTheDocument()
        expect(heading).toHaveTextContent(`H${level} Heading`)
      })
    })

    it('should apply text alignment styles', () => {
      const block = createHeadingBlock({ 
        kind: 'text',
        value: 'Centered Heading', 
        level: 2, 
        textAlign: 'center' 
      })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      expect(heading).toHaveClass('has-text-align-center')
    })

    it('should apply custom anchor ID', () => {
      const block = createHeadingBlock({ 
        kind: 'text',
        value: 'Anchored Heading', 
        level: 2, 
        anchor: 'my-anchor' 
      })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      expect(heading).toHaveAttribute('id', 'my-anchor')
    })

    it('should apply custom CSS classes', () => {
      const block = createHeadingBlock({ 
        kind: 'text',
        value: 'Custom Heading', 
        level: 2, 
        className: 'my-custom-class' 
      })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      expect(heading).toHaveClass('my-custom-class')
    })

    it('should apply inline styles', () => {
      const block = createHeadingBlock({ kind: 'text', value: 'Styled Heading', level: 2 })
      block.styles = { color: 'red', fontSize: '24px' }
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      // Accept either literal or computed rgb equivalent
      expect(getComputedStyle(heading).color).toBe('rgb(255, 0, 0)')
      expect(getComputedStyle(heading).fontSize).toBe('24px')
    })

    it('should handle empty content gracefully', () => {
      const block = createHeadingBlock({ kind: 'text', value: '', level: 2 })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      expect(heading).toHaveTextContent('')
    })

    it('should render with discriminated union structure', () => {
      const block = createHeadingBlock({ 
        kind: 'text',
        value: 'New Content', 
        level: 2 
      })
      const Component = HeadingBlock.component as React.ComponentType<any>
      
      render(<Component value={block} onChange={mockOnChange} />)
      
      const heading = screen.getByRole('heading')
      expect(heading).toHaveTextContent('New Content')
    })
  })

  describe('HeadingSettings', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should render all setting controls', () => {
      const block = createHeadingBlock({ kind: 'text', value: 'Test', level: 2 })
      const Settings = HeadingBlock.settings!
      const mockOnUpdate = vi.fn()
      
      render(<Settings block={block} onUpdate={mockOnUpdate} />)
      
      // Check for elements that are visible by default (in open collapsible cards)
      expect(screen.getByLabelText(/heading text/i)).toBeInTheDocument()
      expect(screen.getByText(/heading level/i)).toBeInTheDocument() // Label text, not form control
      
      // Check for heading level buttons
      expect(screen.getByLabelText('Heading level 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Heading level 2')).toBeInTheDocument()
      
      // Content section and Settings section should be visible (defaultOpen=true)
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should call onUpdate when text changes', () => {
      const block = createHeadingBlock({ kind: 'text', value: 'Test', level: 2 })
      const Settings = HeadingBlock.settings!
      const mockOnUpdate = vi.fn()
      
      render(<Settings block={block} onUpdate={mockOnUpdate} />)
      
      const textInput = screen.getByLabelText(/heading text/i)
      fireEvent.change(textInput, { target: { value: 'New Text' } })
      
      expect(mockOnUpdate).toHaveBeenCalledWith({
        content: {
          kind: 'text',
          value: 'New Text',
          level: 2
        }
      })
    })

    it('should call onUpdate when level changes', () => {
      const block = createHeadingBlock({ kind: 'text', value: 'Test', level: 2 })
      const Settings = HeadingBlock.settings!
      const mockOnUpdate = vi.fn()
      
      render(<Settings block={block} onUpdate={mockOnUpdate} />)
      
      // Click H3 button
      const h3Button = screen.getByLabelText('Heading level 3')
      fireEvent.click(h3Button)
      
      expect(mockOnUpdate).toHaveBeenCalledWith({
        styles: {
          fontSize: '1.75rem',
          fontWeight: '700',
        }
      })
    })

    it('should display current values in form fields', () => {
      const block = createHeadingBlock({ 
        kind: 'text',
        value: 'Current Text', 
        level: 3,
        textAlign: 'center',
        anchor: 'test-anchor',
        className: 'test-class'
      })
      const Settings = HeadingBlock.settings!
      const mockOnUpdate = vi.fn()
      
      render(<Settings block={block} onUpdate={mockOnUpdate} />)
      
      // Check visible fields (in always-open sections)
      const textInput = screen.getByDisplayValue('Current Text')
      expect(textInput).toBeInTheDocument()
      
      // Check that H3 button is selected (has different styling).
      // Heading settings migrated to design tokens in the theming migration:
      // the selected state now uses the `bg-npb-interactive-bg-active` token.
      const h3Button = screen.getByLabelText('Heading level 3')
      expect(h3Button).toHaveClass('bg-npb-interactive-bg-active') // Selected state class
      
      // Note: Anchor ID and CSS Classes are now handled centrally by BlockSettings Advanced tab,
      // not by individual block settings components
    })
  })

  describe('Block Definition', () => {
    it('should have correct metadata', () => {
      expect(HeadingBlock.id).toBe('core/heading') // Machine identifier
      expect(HeadingBlock.label).toBe('Heading') // Display name
      expect(HeadingBlock.category).toBe('basic')
      expect(HeadingBlock.description).toBe('Add a heading text')
    })

    it('should have default content', () => {
      expect(HeadingBlock.defaultContent).toEqual({
        kind: 'text',
        value: 'Your heading here',
        level: 2,
        textAlign: 'left',
        anchor: '',
        className: '',
      })
    })

    it('should have default styles', () => {
      expect(HeadingBlock.defaultStyles).toEqual({
        fontWeight: '700',
        margin: '1rem 0',
      })
    })

    it('should not be a container block', () => {
      expect(HeadingBlock.isContainer).toBeFalsy()
    })
  })
})