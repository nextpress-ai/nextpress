import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDirectDraggablesInDroppable } from '@/lib/dnd';

describe('getDirectDraggablesInDroppable', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('returns only direct children of the droppable, not nested droppable items', () => {
    root.innerHTML = `
      <div data-rfd-droppable-id="canvas">
        <div data-rfd-draggable-id="group-a">Group A
          <div data-rfd-droppable-id="group-a-inner">
            <div data-rfd-draggable-id="icon-1">Icon</div>
            <div data-rfd-draggable-id="icon-2">Icon</div>
          </div>
        </div>
        <div data-rfd-draggable-id="paragraph-b">Paragraph</div>
      </div>
    `;

    const canvas = root.querySelector('[data-rfd-droppable-id="canvas"]') as HTMLElement;
    const direct = getDirectDraggablesInDroppable(canvas).map(
      (el) => el.getAttribute('data-rfd-draggable-id'),
    );

    expect(direct).toEqual(['group-a', 'paragraph-b']);
  });

  it('returns all draggables inside a leaf droppable', () => {
    root.innerHTML = `
      <div data-rfd-droppable-id="container-x">
        <div data-rfd-draggable-id="child-0">A</div>
        <div data-rfd-draggable-id="child-1">B</div>
      </div>
    `;

    const container = root.querySelector(
      '[data-rfd-droppable-id="container-x"]',
    ) as HTMLElement;
    const direct = getDirectDraggablesInDroppable(container).map(
      (el) => el.getAttribute('data-rfd-draggable-id'),
    );

    expect(direct).toEqual(['child-0', 'child-1']);
  });
});
