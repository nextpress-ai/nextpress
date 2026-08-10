import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragAndDropHandler } from '../hooks/useDragAndDropHandler'
import type { BlockConfig } from '@shared/schema-types'
import type { DropResult } from '@/lib/dnd'
import * as toastModule from '@/hooks/use-toast'
import { buildColumnDroppableId } from '../components/PageBuilder/blocks/columns/columns-model'

// Mock the block registry
vi.mock('../components/PageBuilder/blocks', () => ({
  blockRegistry: {
    'core/paragraph': {
      id: 'core/paragraph',
      label: 'Paragraph',
      isContainer: false,
      defaultContent: { kind: 'text', value: '' },
      defaultStyles: {},
      category: 'basic'
    },
    'core/group': {
      id: 'core/group',
      label: 'Group',
      isContainer: true,
      defaultContent: { kind: 'structured', data: {} },
      defaultStyles: {},
      category: 'layout'
    },
    'core/columns': {
      id: 'core/columns',
      label: 'Columns',
      isContainer: true,
      defaultContent: { kind: 'structured', data: {} },
      defaultStyles: {},
      category: 'layout'
    }
  },
  getDefaultBlock: (type: string, id: string) => {
    const registry: any = {
      'core/paragraph': {
        id,
        name: 'core/paragraph',
        type: 'block',
        parentId: null,
        label: 'Paragraph',
        category: 'basic',
        content: { kind: 'text', value: '' },
        styles: {},
        settings: {}
      },
      'core/group': {
        id,
        name: 'core/group',
        type: 'container',
        parentId: null,
        label: 'Group',
        category: 'layout',
        content: { kind: 'structured', data: {} },
        styles: {},
        settings: {},
        children: []
      }
    };
    return registry[type] || null;
  }
}))

describe('useDragAndDropHandler', () => {
  let blocks: BlockConfig[]
  let setBlocks: ReturnType<typeof vi.fn>
  let setSelectedBlockId: ReturnType<typeof vi.fn>
  let setActiveTab: ReturnType<typeof vi.fn>

  const createMockBlock = (id: string, type: string = 'core/paragraph', children?: BlockConfig[]): BlockConfig => ({
    id,
    name: type,
    type: type.includes('group') || type.includes('columns') ? 'container' : 'block',
    parentId: null,
    label: type.split('/')[1] || 'Block',
    content: type.includes('group') || type.includes('columns') ? { kind: 'structured', data: {} } : { kind: 'text', value: `Content for ${id}` },
    styles: {},
    children: children || [],
    settings: {}
  })

  beforeEach(() => {
    blocks = [
      createMockBlock('block1', 'core/paragraph'),
      createMockBlock('container1', 'core/group', [
        createMockBlock('nested1', 'core/paragraph'),
        createMockBlock('nested2', 'core/paragraph')
      ]),
      createMockBlock('block3', 'core/paragraph')
    ]
    
    setBlocks = vi.fn()
    setSelectedBlockId = vi.fn()
    setActiveTab = vi.fn()
    
    vi.clearAllMocks()
  })

  describe('handleDragEnd', () => {
    it('allows same-index moves between columns with duplicate legacy IDs', () => {
      const first = createMockBlock('column-child-a')
      const second = createMockBlock('column-child-b')
      const columns = createMockBlock('columns-1', 'core/columns', [first, second])
      columns.settings = {
        columnLayout: [
          { columnId: 'default-col-1', blockIds: [first.id] },
          { columnId: 'default-col-1', blockIds: [second.id] },
        ],
      }
      const { result } = renderHook(() =>
        useDragAndDropHandler([columns], setBlocks, setSelectedBlockId, setActiveTab)
      )

      act(() => {
        result.current.handleDragEnd({
          draggableId: first.id,
          type: 'DEFAULT',
          source: {
            droppableId: buildColumnDroppableId({
              columnsBlockId: columns.id,
              columnId: 'default-col-1',
              columnIndex: 0,
            }),
            index: 0,
          },
          destination: {
            droppableId: buildColumnDroppableId({
              columnsBlockId: columns.id,
              columnId: 'default-col-1',
              columnIndex: 1,
            }),
            index: 0,
          },
          reason: 'DROP',
          mode: 'FLUID',
          combine: null,
        })
      })

      const next = setBlocks.mock.calls[0][0] as BlockConfig[]
      const nextColumns = next[0]
      const nextLayout = nextColumns.settings?.columnLayout as Array<{
        blockIds: string[]
      }>
      expect(nextLayout.map((column) => column.blockIds)).toEqual([[], [
        first.id,
        second.id,
      ]])
      expect(nextColumns.children?.map((child) => child.id)).toEqual([
        first.id,
        second.id,
      ])
    })

    it('updates source and destination layouts across columns blocks', () => {
      const sourceChild = createMockBlock('source-child')
      const destinationChild = createMockBlock('destination-child')
      const sourceColumns = createMockBlock('columns-source', 'core/columns', [sourceChild])
      sourceColumns.settings = {
        columnLayout: [
          { columnId: 'default-col-1', blockIds: [sourceChild.id] },
        ],
      }
      const destinationColumns = createMockBlock(
        'columns-destination',
        'core/columns',
        [destinationChild],
      )
      destinationColumns.settings = {
        columnLayout: [
          { columnId: 'default-col-1', blockIds: [destinationChild.id] },
        ],
      }
      const { result } = renderHook(() =>
        useDragAndDropHandler(
          [sourceColumns, destinationColumns],
          setBlocks,
          setSelectedBlockId,
          setActiveTab,
        )
      )

      act(() => {
        result.current.handleDragEnd({
          draggableId: sourceChild.id,
          type: 'DEFAULT',
          source: {
            droppableId: buildColumnDroppableId({
              columnsBlockId: sourceColumns.id,
              columnId: 'default-col-1',
              columnIndex: 0,
            }),
            index: 0,
          },
          destination: {
            droppableId: buildColumnDroppableId({
              columnsBlockId: destinationColumns.id,
              columnId: 'default-col-1',
              columnIndex: 0,
            }),
            index: 0,
          },
          reason: 'DROP',
          mode: 'FLUID',
          combine: null,
        })
      })

      const next = setBlocks.mock.calls[0][0] as BlockConfig[]
      const nextSource = next[0]
      const nextDestination = next[1]
      expect(
        (nextSource.settings?.columnLayout as Array<{ blockIds: string[] }>)[0]
          .blockIds,
      ).toEqual([])
      expect(
        (nextDestination.settings?.columnLayout as Array<{ blockIds: string[] }>)[0]
          .blockIds,
      ).toEqual([sourceChild.id, destinationChild.id])
    })

    it('should do nothing if no destination', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'block1',
        type: 'DEFAULT',
        source: { droppableId: 'canvas', index: 0 },
        destination: null,
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).not.toHaveBeenCalled()
    })

    it('should do nothing if dropped in same position (and not show error toast)', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )
      const toastSpy = vi.spyOn(toastModule, 'toast')

      const dropResult: DropResult = {
        draggableId: 'block1',
        type: 'DEFAULT',
        source: { droppableId: 'canvas', index: 0 },
        destination: { droppableId: 'canvas', index: 0 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).not.toHaveBeenCalled()
      expect(toastSpy).not.toHaveBeenCalled()
    })

    it('should no-op when dropping immediately after itself in same container (no error toast)', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )
      const toastSpy = vi.spyOn(toastModule, 'toast')

      const dropResult: DropResult = {
        draggableId: 'nested1',
        type: 'DEFAULT',
        source: { droppableId: 'container1', index: 0 },
        destination: { droppableId: 'container1', index: 1 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      // moveExistingBlock should treat this as no-op and not call setBlocks
      expect(setBlocks).not.toHaveBeenCalled()
      expect(toastSpy).not.toHaveBeenCalled()
    })

    it('should reorder downward correctly when moving to end', () => {
      // Add third child to test downward reorder
      blocks[1].children!.push(createMockBlock('nested3', 'core/paragraph'))
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'nested1',
        type: 'DEFAULT',
        source: { droppableId: 'container1', index: 0 },
        destination: { droppableId: 'container1', index: 3 }, // beyond length to append
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      const updater = setBlocks.mock.calls[0][0]
      const next = typeof updater === 'function' ? updater(blocks) : updater
      const container = next.find((b: BlockConfig) => b.id === 'container1')!
      expect(container.children!.map((c: BlockConfig) => c.id)).toEqual(['nested2','nested3','nested1'])
    })

    it('should handle moving from canvas to container', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'block1',
        type: 'DEFAULT',
        source: { droppableId: 'canvas', index: 0 },
        destination: { droppableId: 'container1', index: 2 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      expect(setSelectedBlockId).toHaveBeenCalledWith('block1')
      expect(setActiveTab).toHaveBeenCalledWith('settings')
    })

    it('should handle moving between different containers', () => {
      const blocksWithTwoContainers = [
        createMockBlock('container1', 'core/group', [
          createMockBlock('nested1', 'core/paragraph')
        ]),
        createMockBlock('container2', 'core/group', [
          createMockBlock('nested2', 'core/paragraph')
        ])
      ]

      const { result } = renderHook(() => 
        useDragAndDropHandler(blocksWithTwoContainers, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'nested1',
        type: 'DEFAULT',
        source: { droppableId: 'container1', index: 0 },
        destination: { droppableId: 'container2', index: 1 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      expect(setSelectedBlockId).toHaveBeenCalledWith('nested1')
      expect(setActiveTab).toHaveBeenCalledWith('settings')
    })

    it('should handle moving from container back to canvas', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'nested1',
        type: 'DEFAULT',
        source: { droppableId: 'container1', index: 0 },
        destination: { droppableId: 'canvas', index: 2 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      expect(setSelectedBlockId).toHaveBeenCalledWith('nested1')
      expect(setActiveTab).toHaveBeenCalledWith('settings')
    })

    it('should handle adding new block from library to canvas', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'core/paragraph',
        type: 'DEFAULT',
        source: { droppableId: 'block-library', index: 0 },
        destination: { droppableId: 'canvas', index: 1 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      expect(setActiveTab).toHaveBeenCalledWith('settings')
      
      // Should select the newly created block
      expect(setSelectedBlockId).toHaveBeenCalled()
    })

    it('should handle adding new block from library to container', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'core/paragraph',
        type: 'DEFAULT',
        source: { droppableId: 'block-library', index: 0 },
        destination: { droppableId: 'container1', index: 2 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      expect(setActiveTab).toHaveBeenCalledWith('settings')
      expect(setSelectedBlockId).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown droppable IDs gracefully', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'block1',
        type: 'DEFAULT',
        source: { droppableId: 'unknown-source', index: 0 },
        destination: { droppableId: 'unknown-destination', index: 0 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      // Should not crash and should not call any updates
      expect(setBlocks).not.toHaveBeenCalled()
    })

    it('should handle deeply nested structures', () => {
      const deeplyNestedBlocks = [
        createMockBlock('root', 'core/group', [
          createMockBlock('level1', 'core/group', [
            createMockBlock('level2', 'core/paragraph')
          ])
        ])
      ]

      const { result } = renderHook(() => 
        useDragAndDropHandler(deeplyNestedBlocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'level2',
        type: 'DEFAULT',
        source: { droppableId: 'level1', index: 0 },
        destination: { droppableId: 'root', index: 1 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
    })

    it('should maintain block data integrity during moves', () => {
      const { result } = renderHook(() => 
        useDragAndDropHandler(blocks, setBlocks, setSelectedBlockId, setActiveTab)
      )

      const dropResult: DropResult = {
        draggableId: 'nested1',
        type: 'DEFAULT',
        source: { droppableId: 'container1', index: 0 },
        destination: { droppableId: 'canvas', index: 2 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null
      }

      act(() => {
        result.current.handleDragEnd(dropResult)
      })

      expect(setBlocks).toHaveBeenCalled()
      
      // Verify that the block maintains its properties during the move
      const updatedBlocks = setBlocks.mock.calls[0][0]
      // In our implementation, setBlocks is called with a function updater.
      // If this changes, update the test accordingly.
      const next = typeof updatedBlocks === 'function' ? updatedBlocks(blocks) : updatedBlocks
      // The moved block should still exist and have the same content
      const movedBlock = next.find((b: BlockConfig) => 
        b.id === 'nested1' || b.children?.some(child => child.id === 'nested1')
      )
      expect(movedBlock).toBeDefined()
    })
  })
})
