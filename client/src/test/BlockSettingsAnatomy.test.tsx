import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import BlockSettings from '@/components/PageBuilder/BlockSettings';

const pageShell = (data: Record<string, unknown> = {}): BlockConfig => ({
  id: 'shell-1',
  name: 'core/page-shell',
  type: 'block',
  label: 'Page shell',
  category: 'layout',
  content: {
    kind: 'structured',
    data: { fontFamily: 'system-ui', containerWidth: '1200px', padding: '2rem 1rem', ...data },
  },
  settings: {},
  parentId: null,
});

const group = (): BlockConfig => ({
  id: 'group-1',
  name: 'core/group',
  type: 'block',
  label: 'Group',
  category: 'layout',
  content: { kind: 'structured', data: {} },
  settings: {},
  parentId: null,
});

const heading = (): BlockConfig => ({
  id: 'heading-1',
  name: 'core/heading',
  type: 'block',
  label: 'Heading',
  category: 'basic',
  content: { kind: 'text', value: 'Hello', level: 2 },
  settings: {},
  parentId: null,
});

const renderSettings = (block: BlockConfig) =>
  render(<BlockSettings block={block} onUpdate={vi.fn()} />);

describe('block settings anatomy', () => {
  it('names the selected block once and never repeats a generic "Block settings" title', () => {
    const { container } = renderSettings(pageShell());
    expect(screen.getByRole('heading', { name: 'Page shell' })).toBeInTheDocument();
    expect(screen.queryByText(/^Block settings$/i)).toBeNull();
    // The old hero card and boxed panel wrappers are gone.
    expect(container.querySelector('.npb-settings-hero')).toBeNull();
    expect(container.querySelector('.npb-settings-panel')).toBeNull();
  });

  it('shows the three tabs in the same header as the block name', () => {
    renderSettings(heading());
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim());
    expect(tabs).toEqual(['Content', 'Style', 'Advanced']);
    const header = screen.getByRole('heading', { name: 'Heading' }).closest('.sticky');
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).getAllByRole('tab')).toHaveLength(3);
  });

  it('renders a single-group block flat, with no accordion header to open or close', () => {
    const { container } = renderSettings(pageShell());
    expect(container.querySelector('[data-npb-collapsible-card]')).toBeNull();
    expect(screen.queryByRole('button', { name: /Page design/ })).toBeNull();
    for (const label of ['Font', 'Content width', 'Padding', 'Background', 'Text']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('offers presets plus the Custom group for page width and padding, and shows a saved custom value', () => {
    renderSettings(pageShell({ containerWidth: '1100px', padding: '3rem 1.5rem' }));
    const width = screen.getByRole('group', { name: 'Content width' });
    expect(within(width).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Content width custom value')).toHaveValue('1100');
    expect(screen.getByRole('combobox', { name: 'Content width unit' })).toHaveTextContent('px');
    // Two-part padding cannot be split into one number, so it stays exactly as saved.
    const padding = screen.getByRole('group', { name: 'Padding' });
    expect(within(padding).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Padding custom value')).toHaveValue('3rem 1.5rem');
  });

  it('lights the Normal padding preset for the default page padding, with Custom unlit', () => {
    renderSettings(pageShell());
    const padding = screen.getByRole('radiogroup', { name: 'Padding' });
    expect(within(padding).getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true');
    const group = screen.getByRole('group', { name: 'Padding' });
    expect(within(group).getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('never nests one accordion card inside another', async () => {
    const user = userEvent.setup();
    const { container } = renderSettings(group());
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    const cards = container.querySelectorAll('[data-npb-collapsible-card]');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.querySelector('[data-npb-collapsible-card]')).toBeNull();
    });
  });

  it('labels every field in one weight and colour, so no label reads as a heading', async () => {
    const user = userEvent.setup();
    const { container } = renderSettings(heading());
    await user.click(screen.getByRole('tab', { name: 'Style' }));
    const labels = container.querySelectorAll('.npb-settings-label');
    expect(labels.length).toBeGreaterThan(3);
    labels.forEach((label) => {
      expect(label.className).not.toMatch(/font-semibold/);
    });
  });
});
