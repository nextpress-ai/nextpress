import type { ReactNode } from 'react';
import AdminTopBar from '@/components/AdminTopBar';
import AdminSidebar from '@/components/AdminSidebar';

type AdminLayoutProps = {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
};

/**
 * Shared admin chrome — dark sidebar + top bar; main area follows global light/dark theme.
 * Page header uses surface contrast only (no heavy border chrome).
 */
export function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  return (
    <div className="admin-shell min-h-screen bg-npb-canvas-bg">
      <AdminTopBar />
      <AdminSidebar />
      <div className="admin-main ml-40 flex min-h-screen flex-col pt-8">
        <header className="admin-page-header shrink-0 bg-npb-surface-base px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-npb-text-primary">
              {title}
            </h1>
            {actions ? (
              <div className="flex shrink-0 items-center gap-3">{actions}</div>
            ) : null}
          </div>
        </header>
        <main className="admin-page-content content-fade-in flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
