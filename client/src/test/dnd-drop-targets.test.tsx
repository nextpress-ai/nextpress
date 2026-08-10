import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { DragDropContext, Draggable, Droppable } from "@/lib/dnd";
import type { DropResult } from "@/lib/dnd";

const makeRect = ({
	left,
	top,
	width,
	height,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
}): DOMRect => ({
	x: left,
	y: top,
	left,
	top,
	right: left + width,
	bottom: top + height,
	width,
	height,
	toJSON: () => ({}),
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("custom DnD drop targets", () => {
	it("keeps library source metadata while using horizontal insertion ordering", () => {
		const onDragEnd = vi.fn<(result: DropResult) => void>();
		const { getByTestId } = render(
			<DragDropContext onDragEnd={onDragEnd}>
				<Droppable droppableId="block-library-basic" isDropDisabled>
					{(provided) => (
						<div ref={provided.innerRef} {...provided.droppableProps}>
							<Draggable draggableId="core/text" index={7}>
								{(dragProvided) => (
									<div
										data-testid="library-source"
										ref={dragProvided.innerRef}
										{...dragProvided.draggableProps}
										{...(dragProvided.dragHandleProps ?? {})}
									/>
								)}
							</Draggable>
						</div>
					)}
				</Droppable>
				<Droppable droppableId="horizontal-target" direction="horizontal">
					{(provided) => (
						<div ref={provided.innerRef} {...provided.droppableProps}>
							<Draggable draggableId="target-a" index={0}>
								{(dragProvided) => (
									<div
										data-testid="target-a"
										ref={dragProvided.innerRef}
										{...dragProvided.draggableProps}
									/>
								)}
							</Draggable>
							<Draggable draggableId="target-b" index={1}>
								{(dragProvided) => (
									<div
										data-testid="target-b"
										ref={dragProvided.innerRef}
										{...dragProvided.draggableProps}
									/>
								)}
							</Draggable>
						</div>
					)}
				</Droppable>
			</DragDropContext>,
		);

		const targetA = getByTestId("target-a");
		const targetB = getByTestId("target-b");
		vi.spyOn(targetA, "getBoundingClientRect").mockReturnValue(
			makeRect({ left: 0, top: 0, width: 100, height: 40 }),
		);
		vi.spyOn(targetB, "getBoundingClientRect").mockReturnValue(
			makeRect({ left: 100, top: 0, width: 100, height: 40 }),
		);
		vi.spyOn(document, "elementFromPoint").mockReturnValue(
			targetA.parentElement,
		);

		fireEvent.mouseDown(getByTestId("library-source"), {
			clientX: 10,
			clientY: 10,
		});
		fireEvent.mouseMove(document, { clientX: 75, clientY: 10 });
		fireEvent.mouseUp(document, { clientX: 75, clientY: 10 });

		expect(onDragEnd).toHaveBeenCalledWith(
			expect.objectContaining({
				draggableId: "core/text",
				source: { droppableId: "block-library-basic", index: 7 },
				destination: { droppableId: "horizontal-target", index: 1 },
			}),
		);
	});

	it("rejects disabled library destinations", () => {
		const onDragEnd = vi.fn<(result: DropResult) => void>();
		const { getByTestId } = render(
			<DragDropContext onDragEnd={onDragEnd}>
				<Droppable droppableId="canvas">
					{(provided) => (
						<div ref={provided.innerRef} {...provided.droppableProps}>
							<Draggable draggableId="canvas-item" index={0}>
								{(dragProvided) => (
									<div
										data-testid="canvas-source"
										ref={dragProvided.innerRef}
										{...dragProvided.draggableProps}
										{...(dragProvided.dragHandleProps ?? {})}
									/>
								)}
							</Draggable>
						</div>
					)}
				</Droppable>
				<Droppable droppableId="block-library-layout" isDropDisabled>
					{(provided) => (
						<div
							data-testid="disabled-library"
							ref={provided.innerRef}
							{...provided.droppableProps}
						/>
					)}
				</Droppable>
			</DragDropContext>,
		);

		const disabledLibrary = getByTestId("disabled-library");
		vi.spyOn(document, "elementFromPoint").mockReturnValue(disabledLibrary);

		fireEvent.mouseDown(getByTestId("canvas-source"), {
			clientX: 10,
			clientY: 10,
		});
		fireEvent.mouseMove(document, { clientX: 20, clientY: 20 });
		fireEvent.mouseUp(document, { clientX: 20, clientY: 20 });

		expect(onDragEnd).toHaveBeenCalledWith(
			expect.objectContaining({
				source: { droppableId: "canvas", index: 0 },
				destination: null,
			}),
		);
	});
});
