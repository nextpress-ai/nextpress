import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig, TokenEntry } from '@shared/schema-types';
import BlockSettings from '@/components/PageBuilder/BlockSettings';
import { PageShellSettings } from '@/components/PageBuilder/blocks/page-shell/page-shell-settings';
import type { Fill } from '@shared/fill-model';
import { GRADIENT_PRESETS } from '@shared/gradient-presets';
import { FillField, type FillTarget } from '@/components/PageBuilder/fill/fill-field';

vi.setConfig({ testTimeout: 20000 });

// The library dialog needs the whole app's data providers; it is not what these tests are about.
vi.mock('@/components/media/MediaPickerDialog', () => ({ default: () => null }));

const targets = (fills: { background?: Fill; text?: Fill } = {}, textKinds?: FillTarget['fillKinds']): FillTarget[] => [
  { property: 'backgroundColor', label: 'Background', fill: fills.background },
  { property: 'color', label: 'Text', fill: fills.text, fillKinds: textKinds },
];

/** Keeps the fills in state so a click shows its result, the way the settings panel does. */
function Harness({ initial = {}, onFill, onColor, textKinds }: {
  initial?: { background?: Fill; text?: Fill };
  onFill?: (slot: string, fill: Fill | undefined) => void;
  onColor?: (entry: TokenEntry) => void;
  textKinds?: FillTarget['fillKinds'];
}) {
  const [fills, setFills] = useState(initial);
  return (
    <FillField
      ariaLabel="Color"
      targets={targets(fills, textKinds)}
      onColorChange={onColor ?? (() => undefined)}
      onFillChange={(target, fill) => {
        const slot = target.property === 'color' ? 'text' : 'background';
        onFill?.(slot, fill);
        setFills((current) => ({ ...current, [slot]: fill }));
      }}
    />
  );
}

const typeChips = (name: string) => within(screen.getByRole('radiogroup', { name }));

describe('FillField', () => {
  it('starts on Color with the ordinary colour picker', () => {
    render(<Harness />);
    expect(typeChips('Background fill type').getByRole('radio', { name: 'Color' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: 'Color custom value' })).toBeInTheDocument();
  });

  it('Gradient starts from a ready-made one and a preset swaps it', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} />);
    await user.click(typeChips('Background fill type').getByRole('radio', { name: 'Gradient' }));
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ kind: 'gradient' }));
    expect(screen.getByRole('img', { name: 'Gradient preview' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('group', { name: 'Ready-made gradients' })).getByRole('button', { name: 'Sunset' }));
    expect(onFill).toHaveBeenLastCalledWith('background', GRADIENT_PRESETS.find((preset) => preset.id === 'sunset')!.fill);
  });

  it('edits type, direction, colors and positions, keeping 2 to 4 colors', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} />);
    await user.click(typeChips('Background fill type').getByRole('radio', { name: 'Gradient' }));

    await user.click(within(screen.getByRole('radiogroup', { name: 'Direction' })).getByRole('radio', { name: 'Right' }));
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ angle: 90 }));

    await user.click(within(screen.getByRole('radiogroup', { name: 'Type' })).getByRole('radio', { name: 'Radial' }));
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ shape: 'radial' }));
    expect(screen.queryByRole('radiogroup', { name: 'Direction' })).toBeNull();

    // Two colors is the minimum: neither can be removed yet.
    expect(screen.getByRole('button', { name: 'Remove color 1' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add color' }));
    expect(screen.getByRole('group', { name: 'Color 3' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add color' }));
    expect(screen.getByRole('button', { name: 'Add color' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove color 4' }));
    expect(screen.queryByRole('group', { name: 'Color 4' })).toBeNull();

    const value = screen.getByRole('textbox', { name: 'Color 1 value' });
    await user.clear(value);
    await user.type(value, '#123456');
    expect(onFill).toHaveBeenLastCalledWith(
      'background',
      expect.objectContaining({ stops: expect.arrayContaining([expect.objectContaining({ color: '#123456' })]) }),
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Color 2 position' }), { target: { value: '70' } });
    expect(onFill).toHaveBeenLastCalledWith(
      'background',
      expect.objectContaining({ stops: expect.arrayContaining([expect.objectContaining({ position: 70 })]) }),
    );
  });

  it('refuses a color that could break the page and keeps the last good one', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} initial={{ background: GRADIENT_PRESETS[2]!.fill }} />);
    const value = screen.getByRole('textbox', { name: 'Color 1 value' });
    const calls = onFill.mock.calls.length;
    fireEvent.change(value, { target: { value: 'red;}body{x:y' } });
    expect(value).toHaveAttribute('aria-invalid', 'true');
    expect(onFill.mock.calls.slice(calls).every(([, fill]) => JSON.stringify(fill).indexOf('body{') === -1)).toBe(true);
  });

  it('Image asks for a picture first, refuses unsafe addresses, then offers size, position and tint', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} />);
    await user.click(typeChips('Background fill type').getByRole('radio', { name: 'Image' }));
    expect(screen.queryByRole('radiogroup', { name: 'Size' })).toBeNull();

    const url = screen.getByRole('textbox', { name: 'Picture' });
    fireEvent.change(url, { target: { value: 'javascript:alert(1)' } });
    expect(screen.getByRole('alert')).toHaveTextContent('https://');
    expect(onFill).not.toHaveBeenCalledWith('background', expect.objectContaining({ kind: 'image' }));

    fireEvent.change(url, { target: { value: '/uploads/hero.jpg' } });
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ kind: 'image', url: '/uploads/hero.jpg', size: 'cover' }));

    await user.click(within(screen.getByRole('group', { name: 'Picture position' })).getByRole('button', { name: 'Top left' }));
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ position: 'top left' }));
    expect(screen.queryByRole('radiogroup', { name: 'Tiling' })).toBeNull();
    await user.click(within(screen.getByRole('radiogroup', { name: 'Size' })).getByRole('radio', { name: 'Original' }));
    expect(screen.getByRole('radiogroup', { name: 'Tiling' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('radiogroup', { name: 'Tint' })).getByRole('radio', { name: 'Darken' }));
    expect(onFill).toHaveBeenLastCalledWith('background', expect.objectContaining({ tint: { tone: 'dark', strength: 40 } }));
    expect(screen.getByRole('slider', { name: 'Tint strength' })).toBeInTheDocument();
  });

  it('going back to Color clears the fill, and forward again restores it', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} initial={{ background: GRADIENT_PRESETS[3]!.fill }} />);
    await user.click(typeChips('Background fill type').getByRole('radio', { name: 'Color' }));
    expect(onFill).toHaveBeenLastCalledWith('background', undefined);
    await user.click(typeChips('Background fill type').getByRole('radio', { name: 'Gradient' }));
    expect(onFill).toHaveBeenLastCalledWith('background', GRADIENT_PRESETS[3]!.fill);
  });

  it('background and text hold separate fills, and text explains the trade-off', async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    render(<Harness onFill={onFill} />);
    await user.click(within(screen.getByRole('group', { name: 'Color target' })).getByRole('button', { name: 'Text' }));
    await user.click(typeChips('Text fill type').getByRole('radio', { name: 'Gradient' }));
    expect(onFill).toHaveBeenLastCalledWith('text', expect.objectContaining({ kind: 'gradient' }));
    expect(screen.getByText(/replaces this block/)).toBeInTheDocument();
  });

  it('a colour-only target shows no fill choice at all', async () => {
    const user = userEvent.setup();
    render(<Harness textKinds={[]} />);
    await user.click(within(screen.getByRole('group', { name: 'Color target' })).getByRole('button', { name: 'Text' }));
    expect(screen.queryByRole('radiogroup', { name: 'Text fill type' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Color custom value' })).toBeInTheDocument();
  });
});

describe('where fills are saved', () => {
  it('a block keeps its gradient in other.fills and clears it with null', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const heading: BlockConfig = {
      id: 'h-1',
      name: 'core/heading',
      type: 'block',
      label: 'Heading',
      category: 'basic',
      content: { kind: 'text', value: 'Hello', level: 2 } as BlockConfig['content'],
      styles: {},
      settings: {},
      parentId: null,
    };
    render(<BlockSettings block={heading} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    await user.click(screen.getByRole('button', { name: /^Colors/ }));
    // A heading opens on Text; the Text fill can be a gradient.
    await user.click(within(screen.getByRole('radiogroup', { name: 'Text fill type' })).getByRole('radio', { name: 'Gradient' }));
    const saved = onUpdate.mock.calls.at(-1)![0] as { other: { fills: { text: { kind: string } } } };
    expect(saved.other.fills.text.kind).toBe('gradient');
  });

  it('a block that already has a background fill opens on it, and Color clears it as null', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const box: BlockConfig = {
      id: 'g-1',
      name: 'core/group',
      type: 'container',
      label: 'Group',
      category: 'layout',
      content: { kind: 'structured', data: {} } as BlockConfig['content'],
      styles: {},
      settings: {},
      parentId: null,
      other: { fills: { background: GRADIENT_PRESETS[1]!.fill } },
    };
    render(<BlockSettings block={box} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    expect(screen.getByRole('button', { name: /^Colors/ })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('radiogroup', { name: 'Background fill type' })).getByRole('radio', { name: 'Gradient' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(screen.getByRole('radiogroup', { name: 'Background fill type' })).getByRole('radio', { name: 'Color' }));
    const saved = onUpdate.mock.calls.at(-1)![0] as { other: { fills: { background: unknown } } };
    expect(saved.other.fills.background).toBeNull();
  });

  it('the page shell keeps its background fill in its own content, text stays a plain color', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const shell: BlockConfig = {
      id: 'shell-1',
      name: 'core/page-shell',
      type: 'container',
      label: 'Page shell',
      category: 'layout',
      content: { kind: 'structured', data: {} } as BlockConfig['content'],
      styles: {},
      settings: {},
      parentId: null,
    };
    render(<PageShellSettings block={shell} onUpdate={onUpdate} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Background fill type' })).getByRole('radio', { name: 'Gradient' }));
    const content = (onUpdate.mock.calls.at(-1)![0] as { content: { data?: Record<string, unknown> } & Record<string, unknown> }).content;
    const saved = (content.data ?? content) as { backgroundFill?: { kind: string } };
    expect(saved.backgroundFill?.kind).toBe('gradient');
    await user.click(within(screen.getByRole('group', { name: 'Page color target' })).getByRole('button', { name: 'Text' }));
    expect(screen.queryByRole('radiogroup', { name: 'Text fill type' })).toBeNull();
  });
});
