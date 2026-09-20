import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import BlockSettings from '@/components/PageBuilder/BlockSettings';

const button = (overrides: Partial<BlockConfig> = {}): BlockConfig => ({
  id: 'button-1',
  name: 'core/button',
  type: 'block',
  label: 'Button',
  category: 'basic',
  content: { kind: 'text', value: 'Click Me', url: '#' } as BlockConfig['content'],
  // What a freshly inserted button has today.
  styles: { backgroundColor: '#007cba', color: '#ffffff', padding: '12px 24px', borderRadius: '4px', border: 'none', fontSize: '16px' },
  settings: {},
  parentId: null,
  ...overrides,
});

async function openStyle(block: BlockConfig) {
  const user = userEvent.setup();
  const onUpdate = vi.fn();
  render(<BlockSettings block={block} onUpdate={onUpdate} />);
  await user.click(screen.getByRole('tab', { name: 'Style' }));
  return { user, onUpdate };
}

const lastStyles = (onUpdate: ReturnType<typeof vi.fn>) =>
  (onUpdate.mock.calls.filter(([updates]) => 'styles' in updates).at(-1)![0] as { styles: Record<string, unknown> }).styles;

describe('button block look, size, corners and color', () => {
  it('opens Button look first, with the untouched button reading as Solid and LG', async () => {
    await openStyle(button());
    const header = screen.getByRole('button', { name: /Button look/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('radiogroup', { name: 'Look' })).getByRole('radio', { name: 'Solid button' })).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByRole('radiogroup', { name: 'Size' })).getByRole('radio', { name: 'LG' })).toHaveAttribute('aria-checked', 'true');
    // Typography folds away for buttons — size covers the common case.
    expect(screen.getByRole('button', { name: /Typography/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('a size preset sets the text size and padding together', async () => {
    const { user, onUpdate } = await openStyle(button());
    await user.click(within(screen.getByRole('radiogroup', { name: 'Size' })).getByRole('radio', { name: 'SM' }));
    expect(lastStyles(onUpdate)).toMatchObject({ fontSize: '0.75rem', padding: '0.35rem 0.85rem' });
  });

  it('a custom text size keeps proportional padding, and shows as Custom', async () => {
    const { user, onUpdate } = await openStyle(button({ styles: { fontSize: '19px', padding: '12px 24px' } }));
    const group = screen.getByRole('group', { name: 'Button text size' });
    expect(within(group).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    const box = screen.getByLabelText('Button text size custom value');
    await user.clear(box);
    await user.type(box, '22');
    expect(lastStyles(onUpdate)).toMatchObject({ fontSize: '22px', padding: '0.75em 1.5em' });
  });

  it('corners take a preset', async () => {
    const { user, onUpdate } = await openStyle(button());
    await user.click(within(screen.getByRole('radiogroup', { name: 'Corners' })).getByRole('radio', { name: 'Pill' }));
    expect(lastStyles(onUpdate)).toMatchObject({ borderRadius: '9999px' });
  });

  it('Ghost clears the background and moves the colour to the text and border, then Solid brings it back', async () => {
    const { user, onUpdate } = await openStyle(button());
    await user.click(within(screen.getByRole('radiogroup', { name: 'Look' })).getByRole('radio', { name: 'Ghost button' }));
    expect(lastStyles(onUpdate)).toMatchObject({ backgroundColor: 'transparent', color: '#007cba', border: '1px solid currentColor' });
    // Colour tokens are updated in the same click so a stale one cannot win.
    const tokenUpdate = onUpdate.mock.calls.find(([updates]) => updates.other?.tokenMap)!;
    expect(tokenUpdate[0].other.tokenMap).toMatchObject({ backgroundColor: null, color: null });
  });

  it('a ghost button reads as Ghost and its Color edits the text colour', async () => {
    const { user, onUpdate } = await openStyle(
      button({ styles: { backgroundColor: 'transparent', color: '#16a34a', border: '1px solid currentColor', padding: '12px 24px', fontSize: '16px' } }),
    );
    expect(within(screen.getByRole('radiogroup', { name: 'Look' })).getByRole('radio', { name: 'Ghost button' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(screen.getByRole('group', { name: 'Button color' })).getByRole('button', { name: 'red-500' }));
    const tokenUpdate = onUpdate.mock.calls.find(([updates]) => updates.other?.tokenMap)!;
    expect(tokenUpdate[0].other.tokenMap.color).toMatchObject({ property: 'color', value: 'red', variant: '500' });
  });

  it('other blocks do not get the button card', async () => {
    await openStyle({ ...button(), id: 'h1', name: 'core/heading', label: 'Heading', content: { kind: 'text', value: 'Hi', level: 2 } as BlockConfig['content'] });
    expect(screen.queryByRole('button', { name: /Button look/ })).toBeNull();
  });
});
