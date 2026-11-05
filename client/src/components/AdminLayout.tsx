import { useEffect, type ReactNode } from 'react';
import {
  AdminChrome,
  AdminPageFrame,
  useIsInsideAdminChrome,
} from '@/components/admin/admin-shell';

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
  // The browser tab names the screen, so several admin tabs can be told apart.
  useEffect(() => {
    if (title) document.title = `${title} · NextPress`;
  }, [title]);
  const page = <AdminPageFrame title={title} actions={actions}>{children}</AdminPageFrame>;

  return useIsInsideAdminChrome() ? page : <AdminChrome>{page}</AdminChrome>;
}
