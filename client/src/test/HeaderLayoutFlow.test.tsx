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

describe('float on scroll in the editor canvas', () => {
  const pageWithHeader = (sticky: boolean): BlockConfig => ({
    id: 'shell-1',
    name: 'core/page-shell',
    type: 'container',
    label: 'Page shell',
    category: 'layout',
    content: blockRegistry['core/page-shell']!.defaultContent as BlockConfig['content'],
    settings: {},
    parentId: null,
    children: [
      {
        ...header(),
        parentId: 'shell-1',
        content: {
          kind: 'structured',
          data: { ...(blockRegistry['core/header']!.defaultContent as { data: Record<string, unknown> }).data, sticky },
        } as BlockConfig['content'],
      },
    ],
  });

  /** The wrapper nearest the header that is sticky, or null. */
  const stickyAncestor = (headerEl: Element): HTMLElement | null =>
    headerEl.closest<HTMLElement>('[style*="position: sticky"]');

  it('sticks a wrapper around the header — not the header itself — when it floats', () => {
    const Shell = blockRegistry['core/page-shell']!.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Shell value={pageWithHeader(true)} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    const headerEl = container.querySelector('header.wp-block-header')!;
    const sticky = stickyAncestor(headerEl);
    expect(sticky).not.toBeNull();
    expect(sticky).not.toBe(headerEl);
    // It must be a direct child of the page column, the only place it has room to travel.
    expect(sticky!.parentElement).toBe(container.querySelector('.wp-block-page-shell__inner'));
    expect(sticky!.style.top).toBe('0px');
  });

  it('has no sticky wrapper when the header does not float', () => {
    const Shell = blockRegistry['core/page-shell']!.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Shell value={pageWithHeader(false)} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(stickyAncestor(container.querySelector('header.wp-block-header')!)).toBeNull();
  });

  it('calls the setting "Float on scroll"', () => {
    render(<Builder />);
    const inspector = screen.getByTestId('inspector');
    expect(within(inspector).getByText('Float on scroll')).toBeInTheDocument();
    expect(within(inspector).queryByText('Stay on scroll')).toBeNull();
  });

  it('says the page already applies its side padding', () => {
    render(<Builder />);
    const inspector = screen.getByTestId('inspector');
    expect(within(inspector).queryByRole('switch', { name: 'Match page padding' })).toBeNull();
    expect(within(inspector).getByText(/page's side padding already applies/i)).toBeInTheDocument();
  });
});

describe('two-target colour control in the header buttons', () => {
  it('sets a button background and its text colour apart, and paints both on the canvas', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    await user.click(within(inspector).getByRole('button', { name: /^Buttons$/ }));
    await user.click(within(inspector).getAllByRole('button', { name: 'Button style' })[1]!); // the solid one
    const colors = within(inspector).getByRole('group', { name: 'Button color' }); // only the opened button mounts its colours
    const toggle = within(colors).getByRole('group', { name: 'Button color target' });
    expect(within(toggle).getByRole('button', { name: 'Background' })).toBeInTheDocument();
    await user.click(within(colors).getByRole('button', { name: 'blue-500' }));
    await user.click(within(toggle).getByRole('button', { name: 'Text' }));
    await user.click(within(colors).getByRole('button', { name: 'yellow-400' }));
    const solid = canvas.querySelector<HTMLElement>('.wp-block-header__action.is-solid')!;
    expect(solid.style.backgroundColor).not.toBe('');
    expect(solid.style.color).not.toBe('');
    expect(solid.style.color).not.toBe('rgb(255, 255, 255)');
  });

  it('calls the first target "Outline" on a ghost button, since a ghost has no fill', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const inspector = screen.getByTestId('inspector');
    await user.click(within(inspector).getByRole('button', { name: /^Buttons$/ }));
    await user.click(within(inspector).getAllByRole('button', { name: 'Button style' })[0]!); // the ghost one
    const toggle = within(within(inspector).getByRole('group', { name: 'Button color' })).getByRole('group', { name: 'Button color target' });
    expect(within(toggle).getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    expect(within(toggle).queryByRole('button', { name: 'Background' })).toBeNull();
  });

  it('Theme hands a button colour back to the page accent', async () => {
    const user = userEvent.setup();
    render(<Builder />);
    const canvas = screen.getByTestId('canvas');
    const inspector = screen.getByTestId('inspector');
    await user.click(within(inspector).getByRole('button', { name: /^Buttons$/ }));
    await user.click(within(inspector).getAllByRole('button', { name: 'Button style' })[1]!);
    const colors = within(inspector).getByRole('group', { name: 'Button color' });
    expect(within(colors).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true'); // starts on the theme
    await user.click(within(colors).getByRole('button', { name: 'blue-500' }));
    const solid = () => canvas.querySelector<HTMLElement>('.wp-block-header__action.is-solid')!;
    expect(solid().style.backgroundColor).not.toBe('');
    expect(within(colors).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(colors).getByRole('button', { name: 'Theme' }));
    expect(solid().style.backgroundColor).toBe('');
    expect(within(colors).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true');
  });
});

