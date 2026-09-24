import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import { readPageShellContent } from '@shared/page-shell-model';
import { updateBlockDeep } from '@/lib/handlers/treeUtils';
import { PageShellSettings } from '@/components/PageBuilder/blocks/page-shell/page-shell-settings';
import { SpacingSidesField } from '@/components/PageBuilder/spacing-sides-field';

vi.setConfig({ testTimeout: 20000 });

const shell = (data: Record<string, unknown> = {}): BlockConfig => ({
  id: 'shell-1',
  name: 'core/page-shell',
  type: 'container',
  label: 'Page shell',
  category: 'layout',
  content: { kind: 'structured', data } as BlockConfig['content'],
  styles: {},
  settings: {},
  parentId: null,
});

const lastContent = (onUpdate: ReturnType<typeof vi.fn>) =>
  ((onUpdate.mock.calls.at(-1)![0] as { content: { data?: Record<string, unknown> } }).content.data ??
    (onUpdate.mock.calls.at(-1)![0] as { content: Record<string, unknown> }).content) as Record<string, unknown>;

describe('page shell padding panel', () => {
  it('shows side and top-and-bottom padding read from the older one-box value', () => {
    render(<PageShellSettings block={shell({ padding: '3rem 2rem' })} />);
    const side = screen.getByRole('radiogroup', { name: 'Side padding' });
    const vertical = screen.getByRole('radiogroup', { name: 'Top and bottom padding' });
    expect(within(side).getByRole('radio', { name: 'Roomy' })).toHaveAttribute('aria-checked', 'true');
    expect(within(vertical).getByRole('radio', { name: 'Roomy' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: 'Top and bottom padding custom value' })).toHaveValue('3');
  });

  it('a side preset writes only side padding and leaves the old value alone', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<PageShellSettings block={shell()} onUpdate={onUpdate} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Side padding' })).getByRole('radio', { name: 'Wide' }));
    const saved = lastContent(onUpdate);
    expect(saved.paddingInline).toBe('3rem');
    expect(saved.paddingBlock).toBeUndefined();
  });

  it('offers a content position only while the column is narrower than the page', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const { rerender } = render(<PageShellSettings block={shell({ containerWidth: '960px' })} onUpdate={onUpdate} />);
    const position = screen.getByRole('radiogroup', { name: 'Content position' });
    expect(within(position).getByRole('radio', { name: 'Center' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(position).getByRole('radio', { name: 'Left' }));
    expect(lastContent(onUpdate).contentAlign).toBe('left');
    rerender(<PageShellSettings block={shell({ containerWidth: '100%' })} onUpdate={onUpdate} />);
    expect(screen.queryByRole('radiogroup', { name: 'Content position' })).toBeNull();
  });
});

describe('spacing field sides modes', () => {
  const sides = { top: '2rem', right: '1rem', bottom: '2rem', left: '1rem' };

  it('opens as horizontal and vertical when the sides pair up, and writes both keys of an axis', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<SpacingSidesField label="Padding" kind="padding" sides={sides} onCommit={onCommit} />);
    expect(within(screen.getByRole('radiogroup', { name: 'Padding sides' })).getByRole('radio', { name: 'Horiz. & vert.' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(screen.getByRole('radiogroup', { name: 'Padding left and right' })).getByRole('radio', { name: 'XL' }));
    expect(onCommit).toHaveBeenCalledWith(['paddingLeft', 'paddingRight'], '2rem');
    await user.click(within(screen.getByRole('radiogroup', { name: 'Padding top and bottom' })).getByRole('radio', { name: 'SM' }));
    expect(onCommit).toHaveBeenLastCalledWith(['paddingTop', 'paddingBottom'], '0.5rem');
  });

  it('opens on each side when nothing pairs up, and on all sides when they match', () => {
    const mixed = render(
      <SpacingSidesField label="Margin" kind="margin" sides={{ top: '1rem', right: '2rem', bottom: '3rem', left: '4rem' }} onCommit={vi.fn()} />,
    );
    expect(within(screen.getByRole('radiogroup', { name: 'Margin sides' })).getByRole('radio', { name: 'Each side' })).toHaveAttribute('aria-checked', 'true');
    mixed.unmount();
    render(<SpacingSidesField label="Margin" kind="margin" sides={{ top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }} onCommit={vi.fn()} />);
    expect(within(screen.getByRole('radiogroup', { name: 'Margin sides' })).getByRole('radio', { name: 'All sides' })).toHaveAttribute('aria-checked', 'true');
  });

  it('can switch between modes without losing values', async () => {
    const user = userEvent.setup();
    render(<SpacingSidesField label="Padding" kind="padding" sides={sides} onCommit={vi.fn()} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Padding sides' })).getByRole('radio', { name: 'Each side' }));
    expect(screen.getByText('Top')).toBeInTheDocument();
    await user.click(within(screen.getByRole('radiogroup', { name: 'Padding sides' })).getByRole('radio', { name: 'All sides' }));
    expect(screen.getByRole('radiogroup', { name: 'Padding' })).toBeInTheDocument();
  });
});

describe('page shell scrollbar panel', () => {
  it('starts closed and standard; choosing Custom reveals width, corners and colors', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<PageShellSettings block={shell()} onUpdate={onUpdate} />);
    expect(screen.getByRole('button', { name: 'Scrollbar' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Scrollbar' }));
    expect(screen.queryByRole('radiogroup', { name: 'Scrollbar width' })).toBeNull();
    await user.click(within(screen.getByRole('radiogroup', { name: 'Look' })).getByRole('radio', { name: 'Custom' }));
    expect((lastContent(onUpdate).scrollbar as { look: string }).look).toBe('custom');
  });

  it('a saved custom scrollbar opens showing its width and lets you pick another', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<PageShellSettings block={shell({ scrollbar: { look: 'custom', width: '14px' } })} onUpdate={onUpdate} />);
    const width = screen.getByRole('radiogroup', { name: 'Scrollbar width' });
    expect(within(width).getByRole('radio', { name: 'Wide' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(width).getByRole('radio', { name: 'Thin' }));
    expect(lastContent(onUpdate).scrollbar).toMatchObject({ look: 'custom', width: '6px' });
    const colors = within(screen.getByRole('group', { name: 'Scrollbar color' }));
    await user.click(colors.getByRole('button', { name: 'Track' }));
    await user.click(colors.getAllByRole('button', { name: 'slate-500' })[0]!);
    expect((lastContent(onUpdate).scrollbar as { trackColor: { modifier: string } }).trackColor.modifier).toBe('track');
  });

  it('Standard only makes the bar thinner and drops the custom colours', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<PageShellSettings block={shell({ scrollbar: { look: 'hidden' } })} onUpdate={onUpdate} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Look' })).getByRole('radio', { name: 'Standard' }));
    expect(lastContent(onUpdate).scrollbar).toEqual({ look: 'default' });
  });

  it('a cleared scrollbar is gone after the page tree merges it', () => {
    const block = shell({ scrollbar: { look: 'custom', width: '14px' } });
    const { next } = updateBlockDeep([block], block.id, {
      content: { kind: 'structured', data: { scrollbar: null } },
    });
    expect(readPageShellContent(next[0]?.content).scrollbar).toBeUndefined();
  });
});
