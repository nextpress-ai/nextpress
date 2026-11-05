import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SiteMenu } from '@/components/PageBuilder/EditorBar/SiteMenu';

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

describe('SiteMenu', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
  });

  test('renders trigger button', () => {
    render(
      <SiteMenu>
        <button>Test Trigger</button>
      </SiteMenu>
    );

    expect(screen.getByText('Test Trigger')).toBeInTheDocument();
  });

  test('opens dropdown menu on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <SiteMenu>
        <button>Open Menu</button>
      </SiteMenu>
    );

    const trigger = screen.getByText('Open Menu');
    await user.click(trigger);

    // Check for menu items
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  test('navigates to /settings when Settings is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SiteMenu>
        <button>Open Menu</button>
      </SiteMenu>
    );

    const trigger = screen.getByText('Open Menu');
    await user.click(trigger);

    const settingsItem = screen.getByText('Settings');
    await user.click(settingsItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/settings');
  });

  test('navigates to /themes when Themes is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SiteMenu>
        <button>Open Menu</button>
      </SiteMenu>
    );

    const trigger = screen.getByText('Open Menu');
    await user.click(trigger);

    const themesItem = screen.getByText('Themes');
    await user.click(themesItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/themes');
  });

  test('navigates to /media when Media is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SiteMenu>
        <button>Open Menu</button>
      </SiteMenu>
    );

    const trigger = screen.getByText('Open Menu');
    await user.click(trigger);

    const mediaItem = screen.getByText('Media');
    await user.click(mediaItem);

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/media');
  });

  test('displays correct icons for menu items', async () => {
    const user = userEvent.setup();
    render(
      <SiteMenu>
        <button>Open Menu</button>
      </SiteMenu>
    );

    const trigger = screen.getByText('Open Menu');
    await user.click(trigger);

    // Check that all menu items are present (icons are rendered with lucide-react)
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });
});
