import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import {
  BORDER_RADIUS_PRESETS,
  MAX_WIDTH_PRESETS,
} from '@shared/dimension-presets';
import { DimensionPresetField } from '@/components/PageBuilder/dimension-preset-field';
import ColorField from '@/components/PageBuilder/ColorField';
import { SettingsDisclosure } from '@/components/PageBuilder/shared';
import BlockSettings from '@/components/PageBuilder/BlockSettings';

/** Owns the value like a real settings panel does, so typing round-trips through state. */
function Harness({
  initial,
  onChange,
  ...rest
}: {
  initial?: string;
  onChange?: (value: string | undefined) => void;
} & Partial<React.ComponentProps<typeof DimensionPresetField>>) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <DimensionPresetField
      label="Corner shape"
      presets={BORDER_RADIUS_PRESETS}
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const customBox = () => screen.getByLabelText('Corner shape custom value');
const customSegment = () => within(screen.getByRole('group', { name: 'Corner shape' })).getByRole('button', { name: 'Custom' });

describe('DimensionPresetField', () => {
  it('shows presets and always shows the [Custom | value | unit] group, with Custom unlit on a preset', () => {
    render(<Harness initial="0.375rem" />);
    expect(screen.getByRole('radio', { name: 'Rounded' })).toHaveAttribute('aria-checked', 'true');
    // No "Custom" chip in the preset row any more: it is the first segment of the group.
    expect(screen.queryByRole('radio', { name: 'Custom' })).toBeNull();
    expect(customSegment()).toHaveAttribute('aria-pressed', 'false');
    // The group shows the preset as a number and a unit, so MD reads as 0.375 rem.
    expect(customBox()).toHaveValue('0.375');
    expect(screen.getByRole('combobox', { name: 'Corner shape unit' })).toHaveTextContent('rem');
  });

  it('lights Custom and shows the number and unit when the saved value is not a preset', () => {
    render(<Harness initial="13px" />);
    expect(customSegment()).toHaveAttribute('aria-pressed', 'true');
    expect(customBox()).toHaveValue('13');
    expect(screen.getByRole('combobox', { name: 'Corner shape unit' })).toHaveTextContent('px');
    for (const chip of screen.getAllByRole('radio')) expect(chip).toHaveAttribute('aria-checked', 'false');
  });

  it('saves a typed number with the current unit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="0.375rem" onChange={onChange} />);
    await user.clear(customBox());
    await user.type(customBox(), '18');
    expect(onChange).toHaveBeenLastCalledWith('18rem');
  });

  it('accepts a whole value typed with its unit, and switches the unit to match', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="0.375rem" onChange={onChange} />);
    await user.clear(customBox());
    await user.type(customBox(), '12px');
    expect(onChange).toHaveBeenLastCalledWith('12px');
    expect(screen.getByRole('combobox', { name: 'Corner shape unit' })).toHaveTextContent('px');
  });

  it('never saves a half-typed unit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="9999px" onChange={onChange} />);
    await user.clear(customBox());
    await user.type(customBox(), '2r');
    expect(onChange.mock.calls.map((call) => call[0])).not.toContain('2r');
  });

  it('keeps the box focused and unrewritten while typing a value that equals a preset', async () => {
    const user = userEvent.setup();
    render(<Harness initial="9999px" />);
    const box = customBox();
    await user.clear(box);
    await user.type(box, '0.75rem'); // equals the "Soft" preset at the last keystroke
    expect(customBox()).toBe(box);
    expect(box).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Soft' })).toHaveAttribute('aria-checked', 'true');
    expect(customSegment()).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets the field be emptied without a default snapping back in mid-edit', async () => {
    const user = userEvent.setup();
    // Owner swaps an empty value for its default, like the header does.
    function DefaultingOwner() {
      const [value, setValue] = useState('0.375rem');
      return (
        <DimensionPresetField
          label="Corner shape"
          presets={BORDER_RADIUS_PRESETS}
          value={value}
          defaultValue="0.375rem"
          onChange={(next) => setValue(next ?? '0.375rem')}
        />
      );
    }
    render(<DefaultingOwner />);
    const box = customBox();
    await user.clear(box);
    expect(box).toHaveValue('');
    await user.type(box, '20');
    expect(box).toHaveValue('20');
  });

  it('keeps an expression it cannot split exactly as saved, with the unit dropdown off', () => {
    render(<Harness initial="calc(100% - 2rem)" />);
    expect(customBox()).toHaveValue('calc(100% - 2rem)');
    expect(customSegment()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'Corner shape unit' })).toBeDisabled();
  });

  it('shows Reset only for a saved value on fields with no Auto/None chip, and clears it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <DimensionPresetField label="Corner shape" presets={BORDER_RADIUS_PRESETS} value={undefined} onChange={onChange} />,
    );
    expect(screen.queryByRole('button', { name: 'Reset Corner shape' })).toBeNull();
    rerender(
      <DimensionPresetField label="Corner shape" presets={BORDER_RADIUS_PRESETS} value="50%" onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Reset Corner shape' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('treats the Auto/None chip as the reset, so there is no Reset button', () => {
    render(
      <DimensionPresetField label="Max width" presets={MAX_WIDTH_PRESETS} value="960px" onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();
  });

  it('is a plain box with no unit dropdown for text and number fields (aspect ratio, weight)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness label="Aspect" kind="text" presets={[{ value: '1 / 1', label: '1:1' }]} onChange={onChange} />,
    );
    expect(screen.queryByRole('combobox', { name: 'Aspect unit' })).toBeNull();
    await user.type(screen.getByLabelText('Aspect custom value'), '1.5');
    expect(onChange).toHaveBeenLastCalledWith('1.5');
  });

  it('offers screen units when a preset uses them (heights)', () => {
    render(
      <DimensionPresetField
        label="Min height"
        presets={[{ value: '100dvh', label: 'Full' }]}
        value="100dvh"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Min height custom value')).toHaveValue('100');
    expect(screen.getByRole('combobox', { name: 'Min height unit' })).toHaveTextContent('dvh');
  });
});

describe('ColorField', () => {
  const blue = { property: 'backgroundColor', value: 'blue', variant: '500', alias: 'bg', style: '#3b82f6' };
  const targets = [
    { property: 'backgroundColor', label: 'Background', entry: blue, styleValue: '#3b82f6' },
    { property: 'color', label: 'Text', entry: undefined },
  ];

  it('toggles between background and text, and edits whichever is showing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorField ariaLabel="Color" targets={targets} onChange={onChange} />);
    const bg = screen.getByRole('button', { name: 'Background' });
    const text = screen.getByRole('button', { name: 'Text' });
    expect(bg).toHaveAttribute('aria-pressed', 'true');
    expect(text).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'red-500' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ property: 'backgroundColor', value: 'red', variant: '500' }));

    await user.click(text);
    expect(text).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'red-500' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ property: 'color', value: 'red', variant: '500' }));
  });

  it('marks the current colour in the quick picks and shows its value in the Custom group', () => {
    render(<ColorField ariaLabel="Color" targets={targets} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'blue-500' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'red-500' })).toHaveAttribute('aria-pressed', 'false');
    // A palette colour is not a "custom" one, so Custom stays unlit but the value is readable.
    expect(within(screen.getByRole('group', { name: 'Color custom color' })).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Color custom value')).toHaveValue('#3b82f6');
  });

  it('lights Custom for a colour that is not on the palette', () => {
    render(
      <ColorField
        ariaLabel="Color"
        targets={[{ property: 'color', label: 'Text', entry: { property: 'color', value: '', variant: null, alias: 'text', style: '#123abc' } }]}
        onChange={vi.fn()}
      />,
    );
    expect(within(screen.getByRole('group', { name: 'Color custom color' })).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Color custom value')).toHaveValue('#123abc');
  });

  it('saves a typed colour only once it is valid, and never a half-typed one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorField ariaLabel="Color" targets={[{ property: 'color', label: 'Text', entry: undefined }]} onChange={onChange} />);
    const box = screen.getByLabelText('Color custom value');
    await user.type(box, '#12');
    expect(onChange).not.toHaveBeenCalled();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    await user.type(box, '3abc');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ property: 'color', value: '', style: '#123abc' }));
    expect(box).not.toHaveAttribute('aria-invalid');
  });

  it('has no unit dropdown — colours have no units', () => {
    render(<ColorField ariaLabel="Color" targets={targets} onChange={vi.fn()} />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('keeps the full palette out of the page until "All colors" is opened', async () => {
    const user = userEvent.setup();
    render(<ColorField ariaLabel="Color" targets={targets} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'rose-300' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'All colors' }));
    expect(screen.getByRole('button', { name: 'rose-300' })).toBeInTheDocument();
  });

  it('offers a Theme button that is lit while the colour follows the page theme', () => {
    render(
      <ColorField ariaLabel="Color" targets={[{ property: 'color', label: 'Text', entry: undefined }]} onChange={vi.fn()} onTheme={vi.fn()} />,
    );
    // Nothing set = the theme's colour, so Theme is lit even before anything is chosen.
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hands a chosen colour back to the theme with one click, and does nothing when already on the theme', async () => {
    const user = userEvent.setup();
    const onTheme = vi.fn();
    const { unmount } = render(<ColorField key="set" ariaLabel="Color" targets={targets} onChange={vi.fn()} onTheme={onTheme} />);
    const theme = screen.getByRole('button', { name: 'Theme' });
    expect(theme).toHaveAttribute('aria-pressed', 'false');
    await user.click(theme);
    expect(onTheme).toHaveBeenCalledWith(expect.objectContaining({ property: 'backgroundColor' }));
    unmount();

    const again = vi.fn();
    render(<ColorField key="unset" ariaLabel="Color" targets={[{ property: 'color', label: 'Text', entry: undefined }]} onChange={vi.fn()} onTheme={again} />);
    await user.click(screen.getByRole('button', { name: 'Theme' }));
    expect(again).not.toHaveBeenCalled();
  });

  it('follows the theme for the target being edited, and each target keeps its own state', async () => {
    const user = userEvent.setup();
    render(<ColorField ariaLabel="Color" targets={targets} onChange={vi.fn()} onTheme={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'false'); // Background is blue
    await user.click(screen.getByRole('button', { name: 'Text' }));
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true'); // Text is unset
  });

  it('honours a theme stored as a value (e.g. a var) and never shows it as a custom colour', () => {
    render(
      <ColorField
        ariaLabel="Color"
        targets={[{ property: 'backgroundColor', label: 'Background', styleValue: 'var(--npb-accent, #007cba)', followsTheme: true }]}
        onChange={vi.fn()}
        onTheme={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Color custom color' })).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Color custom value')).toHaveValue('');
  });

  it('has no Theme button when the field cannot follow a theme', () => {
    render(<ColorField ariaLabel="Color" targets={targets} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Theme' })).toBeNull();
  });
});

describe('SettingsDisclosure', () => {
  it('keeps its content out of the page until opened', async () => {
    const user = userEvent.setup();
    render(
      <SettingsDisclosure title="Margin">
        <p>margin fields</p>
      </SettingsDisclosure>,
    );
    expect(screen.queryByText('margin fields')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Margin' }));
    expect(screen.getByText('margin fields')).toBeInTheDocument();
  });

  it('starts open when told the person already set something inside', () => {
    render(
      <SettingsDisclosure title="Margin" defaultOpen>
        <p>margin fields</p>
      </SettingsDisclosure>,
    );
    expect(screen.getByText('margin fields')).toBeInTheDocument();
  });
});

const headingWith = (overrides: Partial<BlockConfig>): BlockConfig => ({
  id: 'heading-1',
  name: 'core/heading',
  type: 'block',
  label: 'Heading',
  category: 'basic',
  content: { kind: 'text', value: 'Hello world', level: 2 },
  settings: {},
  parentId: null,
  ...overrides,
});

/** Card headers are buttons with aria-expanded; read their open state by title. */
const cardOpen = (title: string): boolean => {
  const header = screen.getByText(title, { selector: '.npb-settings-collapsible-title' }).closest('button')!;
  return header.getAttribute('aria-expanded') === 'true';
};

async function openStyleTab(block: BlockConfig) {
  const user = userEvent.setup();
  render(<BlockSettings block={block} onUpdate={vi.fn()} />);
  await user.click(screen.getByRole('tab', { name: /Style/ }));
}

describe('Style tab progressive disclosure', () => {
  it('opens only Typography for an untouched heading', async () => {
    await openStyleTab(headingWith({}));
    expect(cardOpen('Typography')).toBe(true);
    for (const title of ['Colors', 'Spacing', 'Layout & Dimensions', 'Border & Radius', 'Custom CSS']) {
      expect(cardOpen(title)).toBe(false);
    }
  });

  it('opens Colors and Spacing by themselves when the block already has them', async () => {
    await openStyleTab(
      headingWith({
        styles: { padding: '1rem', color: '#111111' },
      }),
    );
    expect(cardOpen('Colors')).toBe(true);
    expect(cardOpen('Spacing')).toBe(true);
    expect(cardOpen('Border & Radius')).toBe(false);
  });

  it('folds weight and line height away until one is saved', async () => {
    await openStyleTab(headingWith({}));
    expect(screen.getByRole('button', { name: 'Weight & line height' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('radiogroup', { name: 'Font weight' })).toBeNull();
    expect(screen.getByRole('radiogroup', { name: 'Font size' })).toBeInTheDocument();
  });

  it('opens weight and line height by themselves when a weight is saved', async () => {
    await openStyleTab(headingWith({ styles: { fontWeight: '700' } }));
    expect(screen.getByRole('button', { name: 'Weight & line height' })).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('group', { name: 'Font weight' });
    expect(within(group).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Font weight custom value')).toHaveValue('700');
  });

  it('keeps Margin folded unless a margin is saved', async () => {
    await openStyleTab(headingWith({ styles: { padding: '1rem' } }));
    const spacing = screen.getByText('Spacing', { selector: '.npb-settings-collapsible-title' }).closest('[data-npb-collapsible-card]') as HTMLElement;
    expect(within(spacing).getByRole('button', { name: 'Margin' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a saved custom font size as Custom, never as a bare box under lit chips', async () => {
    await openStyleTab(headingWith({ styles: { fontSize: '19px' } }));
    const group = screen.getByRole('group', { name: 'Font size' });
    expect(within(group).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Font size custom value')).toHaveValue('19');
    expect(screen.getByRole('combobox', { name: 'Font size unit' })).toHaveTextContent('px');
  });
});
