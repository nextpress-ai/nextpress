import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlockConfig } from '@shared/schema-types';
import {
  BUILDER_WIDE_QUERY,
  BuilderResponsiveSidebar,
} from '@/components/PageBuilder/BuilderResponsiveSidebar';
import type { BuilderSidebarProps } from '@/components/PageBuilder/BuilderSidebar';
import { BuilderInspectorPanel } from '@/components/PageBuilder/BuilderInspectorPanel';

const { useMediaQueryMock } = vi.hoisted(() => ({
  useMediaQueryMock: vi.fn<(query: string) => boolean>(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: (query: string) => useMediaQueryMock(query),
}));

vi.mock('@/components/PageBuilder/BuilderSidebar', () => ({
  BuilderSidebar: () => (
    <div data-testid="compact-builder-sidebar">Compact sidebar</div>
  ),
}));

vi.mock('@/components/PageBuilder/BuilderLibrarySidebar', () => ({
  BuilderLibrarySidebar: () => (
    <div data-testid="library-builder-sidebar">Library sidebar</div>
  ),
}));

const buildSidebarProps = (): BuilderSidebarProps => ({
  activeTab: 'settings',
  setActiveTab: () => {},
  selectedBlock: null,
  updateBlock: (_blockId: string, _updates: Partial<BlockConfig>) => {},
  setHoverHighlight: () => {},
  sidebarVisible: true,
  onToggleSidebar: () => {},
  onInsertTemplate: () => {},
  blocks: [],
  onApplyResponsiveDefaults: () => {},
});

describe('BuilderResponsiveSidebar', () => {
  beforeEach(() => {
    useMediaQueryMock.mockReset();
  });

  it('renders library sidebar only at wide breakpoint', () => {
    useMediaQueryMock.mockReturnValue(true);

    render(<BuilderResponsiveSidebar {...buildSidebarProps()} />);

    expect(useMediaQueryMock).toHaveBeenCalledWith(BUILDER_WIDE_QUERY);
    expect(screen.getByTestId('library-builder-sidebar')).toBeInTheDocument();
    expect(
      screen.queryByTestId('compact-builder-sidebar'),
    ).not.toBeInTheDocument();
  });

  it('keeps compact tabbed sidebar below wide breakpoint', () => {
    useMediaQueryMock.mockReturnValue(false);

    render(<BuilderResponsiveSidebar {...buildSidebarProps()} />);

    expect(screen.getByTestId('compact-builder-sidebar')).toBeInTheDocument();
    expect(
      screen.queryByTestId('library-builder-sidebar'),
    ).not.toBeInTheDocument();
  });
});

describe('BuilderInspectorPanel', () => {
  it('shows explicit empty state without selected block', () => {
    render(
      <BuilderInspectorPanel
        selectedBlock={null}
        updateBlock={() => {}}
        setHoverHighlight={() => {}}
      />,
    );

    expect(
      screen.getByRole('region', { name: 'Block inspector' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Select a block to edit its settings'),
    ).toBeInTheDocument();
  });
});
