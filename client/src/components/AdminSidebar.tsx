import { Link, useLocation } from 'wouter';
import {
  Gauge,
  FileText,
  File,
  Image,
  MessageCircle,
  Paintbrush,
  Layout,
  Plug,
  Users,
  Cog,
} from 'lucide-react';
import { NEXTPRESS_CONFIG } from '../../../config';

type MenuItem = {
  label: string;
  path: string;
  icon: typeof Gauge;
  section?: string;
};

const menuItems: MenuItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: Gauge },
  { label: 'Posts', path: '/admin/posts', icon: FileText, section: 'Content' },
  { label: 'Pages', path: '/admin/pages', icon: File, section: 'Content' },
  { label: 'Media', path: '/admin/media', icon: Image, section: 'Content' },
  { label: 'Comments', path: '/admin/comments', icon: MessageCircle, section: 'Content' },
  { label: 'Themes', path: '/admin/themes', icon: Paintbrush, section: 'Appearance' },
  { label: 'Templates', path: '/admin/templates', icon: Layout, section: 'Appearance' },
  { label: 'Plugins', path: '/admin/plugins', icon: Plug, section: 'System' },
  { label: 'Users', path: '/admin/users', icon: Users, section: 'System' },
  { label: 'Settings', path: '/admin/settings', icon: Cog, section: 'System' },
];

export default function AdminSidebar() {
  const [location] = useLocation();

  const groupedItems = menuItems.reduce(
    (acc, item) => {
      if (!item.section) {
        acc.main = acc.main ?? [];
        acc.main.push(item);
      } else {
        acc[item.section] = acc[item.section] ?? [];
        acc[item.section].push(item);
      }
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  return (
    <div className="admin-sidebar fixed left-0 top-8 bottom-0 z-40 w-40 overflow-hidden">
      <div className="flex h-full flex-col">
        <nav className="flex-1 space-y-1 overflow-y-auto pt-3">
          {groupedItems.main?.map((item) => {
            const Icon = item.icon;
            const isActive =
              location === item.path ||
              (item.path === '/admin/dashboard' && location === '/admin');

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`admin-sidebar-link ${isActive ? 'admin-sidebar-link-active' : ''}`}
              >
                <Icon className="mr-3 h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {Object.entries(groupedItems)
            .filter(([key]) => key !== 'main')
            .map(([section, items]) => (
              <div key={section} className="px-4 py-2">
                <div className="admin-sidebar-section-label">{section}</div>
                <div className="ml-2 space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;

                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`admin-sidebar-link admin-sidebar-link-sub ${
                          isActive ? 'admin-sidebar-link-active' : ''
                        }`}
                      >
                        <Icon className="mr-3 h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/60">
          v{NEXTPRESS_CONFIG.version}
        </div>
      </div>
    </div>
  );
}
