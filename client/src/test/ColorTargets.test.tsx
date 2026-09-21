import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import BlockSettings from '@/components/PageBuilder/BlockSettings';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.setConfig({ testTimeout: 20000 });

const container = (): BlockConfig => ({
  id: 'container-1',
  name: 'core/container',
  type: 'container',
  label: 'Container',
  category: 'layout',
  content: { kind: 'structured', data: { tagName: 'div' } } as BlockConfig['content'],
  styles: {},
  settings: {},
  parentId: null,
  children: [],
});

const icon = (): BlockConfig => ({
  id: 'icon-1',
  name: 'core/icon',
  type: 'block',
  label: 'Icon',
  category: 'basic',
  content: {
    kind: 'structured',
    data: { icon: { iconSet: 'lucide', iconName: 'Star', size: 24, sizeUnit: 'px' } },
  } as BlockConfig['content'],
  styles: {},
  settings: {},
  parentId: null,
});

const tokenMaps = (onUpdate: ReturnType<typeof vi.fn>) =>
  onUpdate.mock.calls.filter(([updates]) => updates.other?.tokenMap).map(([updates]) => updates.other.tokenMap);

describe('every colour control can set background and text', () => {
  it('container: one control with a Background / Text toggle, saved to separate keys', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<BlockSettings block={container()} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /^Style$/ }));
    const colors = screen.getByRole('group', { name: 'Container color' });
    const toggle = within(colors).getByRole('group', { name: 'Container color target' });
    expect(within(toggle).getByRole('button', { name: 'Background' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(colors).getByRole('button', { name: 'slate-500' }));
    await user.click(within(toggle).getByRole('button', { name: 'Text' }));
    await user.click(within(colors).getByRole('button', { name: 'white' }));
    const maps = tokenMaps(onUpdate);
    expect(maps.some((map) => map.backgroundColor?.value === 'slate')).toBe(true);
    expect(maps.some((map) => map.color?.value === 'white')).toBe(true);
  });

  it('icon: the icon and its background share one control instead of two boxed pickers', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const { container: dom } = render(
      <TooltipProvider>
        <BlockSettings block={icon()} onUpdate={onUpdate} />
      </TooltipProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^Appearance$/ }));
    const colors = screen.getByRole('group', { name: 'Icon color' });
    const toggle = within(colors).getByRole('group', { name: 'Icon color target' });
    expect(within(toggle).getByRole('button', { name: 'Icon' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(toggle).getByRole('button', { name: 'Background' })).toBeInTheDocument();
    await user.click(within(toggle).getByRole('button', { name: 'Background' }));
    await user.click(within(colors).getByRole('button', { name: 'red-500' }));
    expect(tokenMaps(onUpdate).some((map) => map.backgroundColor?.value === 'red')).toBe(true);
    // The old developer-facing captions are gone.
    expect(dom.textContent).not.toMatch(/Token map|TokenColorPicker|tokenMap/);
  });

  it('the Style tab Colors card still leads with text for a heading and background for a container', async () => {
    const user = userEvent.setup();
    const heading: BlockConfig = { ...container(), id: 'h1', name: 'core/heading', type: 'block', label: 'Heading', content: { kind: 'text', value: 'Hi', level: 2 } as BlockConfig['content'] };
    const { unmount } = render(<BlockSettings block={heading} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    await user.click(screen.getByRole('button', { name: /^Colors$/ }));
    expect(within(screen.getByRole('group', { name: 'Color target' })).getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');
    unmount();
    render(<BlockSettings block={container()} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    await user.click(screen.getByRole('button', { name: /^Colors$/ }));
    expect(within(screen.getByRole('group', { name: 'Color target' })).getByRole('button', { name: 'Background' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('container: Theme drops the chosen colour so the container follows the page theme', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const withBlue: BlockConfig = {
      ...container(),
      other: { tokenMap: { backgroundColor: { property: 'backgroundColor', value: 'blue', variant: '500', alias: 'bg', style: '#3b82f6' } } },
    };
    render(<BlockSettings block={withBlue} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /^Style$/ }));
    const colors = screen.getByRole('group', { name: 'Container color' });
    expect(within(colors).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(colors).getByRole('button', { name: 'Theme' }));
    expect(tokenMaps(onUpdate).some((map) => map.backgroundColor === null)).toBe(true);
  });

  it('container: a container with no colour set already follows the theme', async () => {
    const user = userEvent.setup();
    render(<BlockSettings block={container()} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^Style$/ }));
    expect(within(screen.getByRole('group', { name: 'Container color' })).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('icon: Theme removes the colour token for whichever target is showing', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const coloured: BlockConfig = { ...icon(), other: { tokenMap: { color: { property: 'color', value: 'red', variant: '500', alias: 'text', style: '#ef4444' } } } };
    render(
      <TooltipProvider>
        <BlockSettings block={coloured} onUpdate={onUpdate} />
      </TooltipProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^Appearance$/ }));
    const colors = screen.getByRole('group', { name: 'Icon color' });
    expect(within(colors).getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(colors).getByRole('button', { name: 'Theme' }));
    expect(tokenMaps(onUpdate).some((map) => map.color === null)).toBe(true);
  });
});

