import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BlockRenderer from "../components/PageBuilder/BlockRenderer";
import { BlockActionsProvider } from "../components/PageBuilder/BlockActionsContext";
import type { BlockConfig } from "@shared/schema-types";

describe("In-Canvas Editing & Toolbar", () => {
  it("renders Edit button when selected and not editing, then triggers onStartEditing", () => {
    const onStartEditing = vi.fn();
    const onStopEditing = vi.fn();
    const onSelect = vi.fn();

    const block: BlockConfig = {
      id: "test-heading-1",
      name: "core/heading",
      type: "block",
      parentId: null,
      content: {
        kind: "text",
        value: "Heading text",
        level: 2,
      },
    };

    render(
      <BlockActionsProvider
        value={{
          selectedBlockId: "test-heading-1",
          editingBlockId: null,
          onSelect,
          onStartEditing,
          onStopEditing,
          hoveredBlockId: null,
          onHoverBlock: vi.fn(),
          onDuplicate: vi.fn(),
          onDelete: vi.fn(),
          hoverHighlight: null,
        }}
      >
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      </BlockActionsProvider>,
    );

    const editBtn = screen.getByRole("button", { name: /Edit block/i });
    expect(editBtn).toBeDefined();

    fireEvent.click(editBtn);
    expect(onStartEditing).toHaveBeenCalledWith("test-heading-1");
  });

  it("renders Done button when isEditing is true, and hides the drag handle", () => {
    const onStartEditing = vi.fn();
    const onStopEditing = vi.fn();

    const block: BlockConfig = {
      id: "test-heading-2",
      name: "core/heading",
      type: "block",
      parentId: null,
      content: {
        kind: "text",
        value: "Heading text",
        level: 2,
      },
    };

    render(
      <BlockActionsProvider
        value={{
          selectedBlockId: "test-heading-2",
          editingBlockId: "test-heading-2",
          onSelect: vi.fn(),
          onStartEditing,
          onStopEditing,
          hoveredBlockId: null,
          onHoverBlock: vi.fn(),
          onDuplicate: vi.fn(),
          onDelete: vi.fn(),
          hoverHighlight: null,
        }}
      >
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          dragHandleProps={{ "data-testid": "drag-handle" }}
        />
      </BlockActionsProvider>,
    );

    const doneBtn = screen.getByRole("button", { name: /Done editing/i });
    expect(doneBtn).toBeDefined();

    // Drag handle should be hidden during active editing
    expect(screen.queryByTitle(/Drag to reorder/i)).toBeNull();

    fireEvent.click(doneBtn);
    expect(onStopEditing).toHaveBeenCalled();
  });

  it("starts editing on double-click", () => {
    const onStartEditing = vi.fn();

    const block: BlockConfig = {
      id: "test-heading-3",
      name: "core/heading",
      type: "block",
      parentId: null,
      content: {
        kind: "text",
        value: "Heading text",
        level: 2,
      },
    };

    render(
      <BlockActionsProvider
        value={{
          selectedBlockId: null,
          editingBlockId: null,
          onSelect: vi.fn(),
          onStartEditing,
          onStopEditing: vi.fn(),
          hoveredBlockId: null,
          onHoverBlock: vi.fn(),
          onDuplicate: vi.fn(),
          onDelete: vi.fn(),
          hoverHighlight: null,
        }}
      >
        <BlockRenderer
          block={block}
          isSelected={false}
          isPreview={false}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      </BlockActionsProvider>,
    );

    fireEvent.doubleClick(screen.getByText("Heading text"));
    expect(onStartEditing).toHaveBeenCalledWith("test-heading-3");
  });

  it("renders an inline text editor on a heading block while editing", () => {
    const onBlockChange = vi.fn();

    const block: BlockConfig = {
      id: "test-heading-4",
      name: "core/heading",
      type: "block",
      parentId: null,
      content: {
        kind: "text",
        value: "Heading text",
        level: 2,
      },
    };

    render(
      <BlockActionsProvider
        value={{
          selectedBlockId: "test-heading-4",
          editingBlockId: "test-heading-4",
          onSelect: vi.fn(),
          onStartEditing: vi.fn(),
          onStopEditing: vi.fn(),
          hoveredBlockId: null,
          onHoverBlock: vi.fn(),
          onDuplicate: vi.fn(),
          onDelete: vi.fn(),
          hoverHighlight: null,
        }}
      >
        <BlockRenderer
          block={block}
          isSelected={true}
          isPreview={false}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onBlockChange={onBlockChange}
        />
      </BlockActionsProvider>,
    );

    const input = screen.getByDisplayValue("Heading text");
    expect(input.tagName).toBe("INPUT");

    fireEvent.change(input, { target: { value: "New heading" } });
    const updated = onBlockChange.mock.calls[0][0] as BlockConfig;
    expect((updated.content as { value?: string }).value).toBe("New heading");
  });
});
