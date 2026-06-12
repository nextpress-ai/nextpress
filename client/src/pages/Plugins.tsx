import { AdminLayout } from '@/components/AdminLayout';
import { Plug } from 'lucide-react';

/**
 * Placeholder page for Plugins. Functionality not yet supported; shows coming-soon banner.
 */
export default function Plugins() {
  return (
    <AdminLayout title="Plugins">
      <div
        className="flex items-center gap-3 rounded-[var(--npb-radius-surface)] bg-npb-status-warning/10 px-4 py-3 text-npb-status-warning"
        role="status"
        aria-live="polite"
      >
        <Plug className="h-5 w-5 shrink-0" />
        <p className="font-medium">Plugins functionality is coming soon.</p>
      </div>
    </AdminLayout>
  );
}
