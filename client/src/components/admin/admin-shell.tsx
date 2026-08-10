import { createContext, useContext, type ReactNode } from 'react';
import AdminTopBar from '@/components/AdminTopBar';
import AdminSidebar from '@/components/AdminSidebar';
import { SkipLink } from '@/components/a11y/skip-link';
import { MotionPage } from '@/components/motion/motion-primitives';

const AdminChromeContext = createContext(false);

type AdminPageFrameProps = {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
};

/**
 * Renders persistent admin navigation around route-owned page content.
 */
export function AdminChrome({ children }: { children: ReactNode }): ReactNode {
  return (
    <AdminChromeContext.Provider value={true}>
      <div className="admin-shell min-h-screen bg-npb-canvas-bg">
        <SkipLink href="#admin-main-content">Skip to content</SkipLink>
        <AdminTopBar />
        <AdminSidebar />
        <div className="admin-main ml-40 flex min-h-screen flex-col pt-8">{children}</div>
      </div>
    </AdminChromeContext.Provider>
  );
}

/**
 * Renders page title/actions and content without owning persistent navigation.
 */
export function AdminPageFrame({
  children,
  title,
  actions,
}: AdminPageFrameProps): ReactNode {
  return (
    <>
      <header className="admin-page-header sticky top-8 z-30 shrink-0 bg-npb-surface-base px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-npb-text-primary">
            {title}
          </h1>
          {actions ? (
            <div className="flex shrink-0 items-center gap-3">{actions}</div>
          ) : null}
        </div>
      </header>
      <main
        id="admin-main-content"
        className="admin-page-content flex-1 p-6"
        tabIndex={-1}>
        <MotionPage>{children}</MotionPage>
      </main>
    </>
  );
}

/**
 * Reports whether the current page already sits inside route-owned admin chrome.
 */
export function useIsInsideAdminChrome(): boolean {
  return useContext(AdminChromeContext);
}

