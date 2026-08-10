import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminLayout } from '@/components/AdminLayout';
import { AdminChrome } from '@/components/admin/admin-shell';

vi.mock('@/components/AdminTopBar', () => ({
  default: () => <div data-testid="admin-top-bar" />,
}));

vi.mock('@/components/AdminSidebar', () => ({
  default: () => <div data-testid="admin-sidebar" />,
}));

describe('admin route shell', () => {
  it('keeps one chrome instance when a page is inside route-owned chrome', () => {
    render(
      <AdminChrome>
        <AdminLayout title="Dashboard">
          <p>Dashboard content</p>
        </AdminLayout>
      </AdminChrome>,
    );

    expect(screen.getAllByTestId('admin-top-bar')).toHaveLength(1);
    expect(screen.getAllByTestId('admin-sidebar')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('keeps the existing standalone page API working', () => {
    render(
      <AdminLayout title="Posts">
        <p>Posts content</p>
      </AdminLayout>,
    );

    expect(screen.getAllByTestId('admin-top-bar')).toHaveLength(1);
    expect(screen.getAllByTestId('admin-sidebar')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Posts' })).toBeInTheDocument();
  });
});

