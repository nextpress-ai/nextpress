import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminSidebar from '@/components/AdminSidebar';

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    className,
    'aria-current': ariaCurrent,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    'aria-current'?: string;
  }) => {
    const ariaCurrentValue = ariaCurrent as "page" | "step" | "location" | "date" | "time" | "true" | "false" | boolean | undefined;
    return (
      <a href={href} className={className} aria-current={ariaCurrentValue}>
        {children}
      </a>
    ) as unknown as React.ReactElement;
  },
  useLocation: () => ['/admin/pages', vi.fn()],
}));

vi.mock('@/components/admin/WhatsNewSidebarBanner', () => ({
  WhatsNewSidebarBanner: () => null,
}));

describe('AdminSidebar', () => {
  it('marks current navigation link for assistive technology', () => {
    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: 'Pages' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Posts' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
