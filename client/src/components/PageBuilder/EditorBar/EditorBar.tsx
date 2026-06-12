import { Settings, FileText, Pen, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteMenu } from './SiteMenu';
import { PagesMenu } from './PagesMenu';
import { BlogMenu } from './BlogMenu';
import { DesignMenu } from './DesignMenu';

interface EditorBarProps {
  currentPostId?: string;
  currentType?: 'post' | 'page' | 'template';
  currentBlogId?: string;
}

/**
 * EditorBar - Horizontal menu bar for quick access to site content and settings
 * Appears at the top of the PageBuilder in builder mode
 */
export function EditorBar({ currentPostId, currentType, currentBlogId }: EditorBarProps) {
  return (
    <div className="bg-npb-surface-base px-4 py-2 flex items-center gap-2">
      {/* Site Menu - Settings, Themes, Media */}
      <SiteMenu>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Site
        </Button>
      </SiteMenu>

      {/* Pages Menu - Browse and create pages */}
      <PagesMenu currentPageId={currentPostId}>
        <Button variant="ghost" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Pages
        </Button>
      </PagesMenu>

      {/* Blog Menu - Browse and create posts */}
      <BlogMenu currentPostId={currentPostId} blogId={currentBlogId}>
        <Button variant="ghost" size="sm" className="gap-2">
          <Pen className="w-4 h-4" />
          Blog
        </Button>
      </BlogMenu>

      {/* Design Menu - Apply templates and themes */}
      <DesignMenu currentPostId={currentPostId} currentType={currentType}>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Design
        </Button>
      </DesignMenu>
    </div>
  );
}
