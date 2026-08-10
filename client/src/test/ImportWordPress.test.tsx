import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImportWordPress from '@/pages/ImportWordPress';

vi.mock('@/components/AdminLayout', () => ({
  AdminLayout: ({
    children,
    title,
    actions,
  }: {
    children: ReactNode;
    title: string;
    actions?: ReactNode;
  }) => (
    <div data-testid="admin-layout">
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
}));

vi.mock('@/components/import/WordPressImportFlow', () => ({
  WordPressImportFlow: () => <div data-testid="wordpress-import-flow" />,
}));

describe('ImportWordPress', () => {
  it('uses route-owned admin layout without rendering its own chrome', () => {
    render(<ImportWordPress />);

    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import WordPress' })).toBeInTheDocument();
    expect(screen.getByTestId('wordpress-import-flow')).toBeInTheDocument();
  });
});
