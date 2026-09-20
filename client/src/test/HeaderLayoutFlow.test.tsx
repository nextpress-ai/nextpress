import { useState } from 'react';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BlockConfig } from '@shared/schema-types';
import { updateBlockDeep } from '@/lib/handlers/treeUtils';
import { blockRegistry } from '@/components/PageBuilder/blocks';
import BlockSettings from '@/components/PageBuilder/BlockSettings';

// The media picker inside the Brand card asks which site is active.
vi.mock('@/hooks/useActiveSite', () => ({
  useActiveSite: () => ({ activeSiteId: 'site-1' }),
  useOptionalActiveSite: () => ({ activeSiteId: 'site-1' }),
}));

const header = (): BlockConfig => ({
  id: 'header-1',
  name: 'core/header',
  type: 'block',
  label: 'Header',
  category: 'layout',
  content: blockRegistry['core/header']!.defaultContent as BlockConfig['content'],
  settings: {},
  parentId: null,
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Canvas + inspector sharing state through the same deep-merge update the builder uses. */
function Builder({ initial }: { initial?: BlockConfig }) {
  const [blocks, setBlocks] = useState<BlockConfig[]>([initial ?? header()]);
  const block = blocks[0]!;
  const update = (updates: Partial<BlockConfig>) =>
    setBlocks((prev) => updateBlockDeep(prev, block.id, updates).next);
  const Canvas = blockRegistry['core/header']!.component!;
  return (
    <QueryClientProvider client={queryClient}>
      <div data-testid="canvas">
        <Canvas value={block} onChange={(next: BlockConfig) => update(next)} />
      </div>
      <span data-testid="block-type">{block.type}</span>
      <div data-testid="inspector">
        <BlockSettings block={block} onUpdate={update} />
      </div>
    </QueryClientProvider>
  );
}

const slotNames = (canvas: HTMLElement, slot: 'is-left' | 'is-middle' | 'is-right'): string[] => {
  const el = canvas.querySelector(`.wp-block-header__slot.${slot}`);
  return el ? [...el.children].map((child) => child.className.replace('wp-block-header__', '')) : [];
};

describe('header layout changes reach the canvas', () => {
  it('moves links and buttons for every layout, before and after a logo is added', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    const layout = () => within(inspector).getByRole('radiogroup', { name: 'Header layout' });
    const pick = async (name: string) => user.click(within(layout()).getByRole('radio', { name }));

    const expectLayouts = async () => {
      await pick('Brand left, links middle, buttons right');
      expect([slotNames(canvas, 'is-middle'), slotNames(canvas, 'is-right')]).toEqual([['nav'], ['actions']]);
      await pick('Brand left, links right');
      expect([slotNames(canvas, 'is-middle'), slotNames(canvas, 'is-right')]).toEqual([[], ['nav']]);
      await pick('Brand left, buttons right');
      expect([slotNames(canvas, 'is-middle'), slotNames(canvas, 'is-right')]).toEqual([[], ['actions']]);
      await pick('Brand left, links and buttons right');
      expect([slotNames(canvas, 'is-middle'), slotNames(canvas, 'is-right')]).toEqual([[], ['nav', 'actions']]);
    };

    await expectLayouts();

    // Switch the brand to a logo and give it an image, then try the layouts again.
    await user.click(within(inspector).getByRole('radio', { name: 'Logo' }));
    const url = inspector.querySelector<HTMLInputElement>('#header-logo-url')!;
    fireEvent.change(url, { target: { value: '/uploads/logo.svg' } });
    expect(canvas.querySelector('.wp-block-header__brand img')).toHaveAttribute('src', '/uploads/logo.svg');

    await expectLayouts();
    expect(canvas.querySelector('.wp-block-header__brand img')).toHaveAttribute('src', '/uploads/logo.svg');
  }, 20000);

  it('keeps the chosen layout when logo size and corners change afterwards', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    await user.click(
      within(within(inspector).getByRole('radiogroup', { name: 'Header layout' })).getByRole('radio', {
        name: 'Brand left, links middle, buttons right',
      }),
    );
    await user.click(within(inspector).getByRole('radio', { name: 'Logo' }));
    await user.click(within(inspector).getByRole('button', { name: 'Logo look' }));
    const size = within(inspector).getAllByRole('radiogroup', { name: 'Size' })[0]!;
    await user.click(within(size).getByRole('radio', { name: 'XL' }));
    expect([slotNames(canvas, 'is-middle'), slotNames(canvas, 'is-right')]).toEqual([['nav'], ['actions']]);
    await act(async () => {});
  });
});

const BLOCKS_LAYOUT = 'Brand left, your own blocks right';
const BUTTONS_LAYOUT = 'Brand left, buttons right';

const childButton = (): BlockConfig => ({
  id: 'child-button',
  name: 'core/button',
  type: 'block',
  label: 'Button',
  category: 'basic',
  content: { kind: 'text', value: 'Contact us', url: '/contact' } as BlockConfig['content'],
  settings: {},
  parentId: 'header-1',
});

describe('header with no menu and blocks on the right', () => {
  it('has no menu button in the buttons-only layout, and keeps the buttons in view', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    await user.click(
      within(within(inspector).getByRole('radiogroup', { name: 'Header layout' })).getByRole('radio', {
        name: BUTTONS_LAYOUT,
      }),
    );
    expect(canvas.querySelector('.wp-block-header__mobile-panel')).toBeNull();
    expect(canvas.querySelector('.wp-block-header__burger')).toBeNull();
    expect(canvas.querySelector('.wp-block-header.is-no-menu')).not.toBeNull();
    expect(slotNames(canvas, 'is-right')).toEqual(['actions']);
  });

  it('offers the blocks layout, makes the header a container, and shows a drop area with no menu', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    expect(screen.getByTestId('block-type')).toHaveTextContent('block');

    await user.click(
      within(within(inspector).getByRole('radiogroup', { name: 'Header layout' })).getByRole('radio', {
        name: BLOCKS_LAYOUT,
      }),
    );

    expect(screen.getByTestId('block-type')).toHaveTextContent('container');
    expect(canvas.querySelector('.wp-block-header__slot.is-right .wp-block-header__blocks')).not.toBeNull();
    expect(canvas.querySelector('.wp-block-header__mobile-panel')).toBeNull();
    // The right side is a real drop area for child blocks.
    expect(canvas.querySelector('.wp-block-header__slot.is-right [data-container-children="true"]')).not.toBeNull();
    // No built-in links or buttons in this layout, so no cards for them either.
    expect(canvas.querySelector('.wp-block-header__nav')).toBeNull();
    expect(canvas.querySelector('.wp-block-header__actions')).toBeNull();
    expect(within(inspector).queryByRole('button', { name: /^Links$/ })).toBeNull();
    expect(within(inspector).queryByRole('button', { name: /^Buttons$/ })).toBeNull();
    expect(within(inspector).getByText(/Drop any block on the header/)).toBeInTheDocument();
  });

  it('paints blocks already inside the header on the right, and keeps them when switching away and back', async () => {
    const user = userEvent.setup();
    const initial: BlockConfig = {
      ...header(),
      type: 'container',
      children: [childButton()],
      content: {
        kind: 'structured',
        data: {
          ...(blockRegistry['core/header']!.defaultContent as { data: Record<string, unknown> }).data,
          variant: 'brand-and-blocks',
        },
      } as BlockConfig['content'],
    };
    render(<Builder initial={initial} />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    const right = () => canvas.querySelector('.wp-block-header__slot.is-right')!;
    expect(within(right() as HTMLElement).getByText('Contact us')).toBeInTheDocument();

    const pick = (name: string) =>
      user.click(
        within(within(inspector).getByRole('radiogroup', { name: 'Header layout' })).getByRole('radio', { name }),
      );
    await pick('Brand left, links and buttons right');
    expect(canvas.textContent).not.toContain('Contact us');
    await pick(BLOCKS_LAYOUT);
    expect(within(right() as HTMLElement).getByText('Contact us')).toBeInTheDocument();
  });
});

