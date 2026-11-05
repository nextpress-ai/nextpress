import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Settings2, Palette, Image } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SiteMenuProps {
  children: ReactNode;
}

/**
 * SiteMenu - Dropdown for site-level settings and configuration
 * Provides navigation to Settings, Themes, and Media
 */
export function SiteMenu({ children }: SiteMenuProps) {
  const [, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => handleNavigation('/admin/settings')}>
          <Settings2 className="w-4 h-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/themes')}>
          <Palette className="w-4 h-4" />
          Themes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/admin/media')}>
          <Image className="w-4 h-4" />
          Media
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
