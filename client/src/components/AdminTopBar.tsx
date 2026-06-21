import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

export default function AdminTopBar() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="admin-top-bar fixed top-0 left-0 right-0 z-50 flex h-8 items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="text-sm font-semibold text-white">NextPress</div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-7 w-7 p-0 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <span className="text-xs text-zinc-400">
          {user?.firstName || user?.username || 'Admin'}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await authClient.signOut();
              window.location.href = '/';
            } catch {
              window.location.href = '/';
            }
          }}
          className="cursor-pointer text-xs text-zinc-400 hover:text-white"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
