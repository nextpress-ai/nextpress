import { useEffect, useRef } from 'react';

type KeyboardShortcutOptions = {
  key: string;
  enabled?: boolean;
  onTrigger: (event: KeyboardEvent) => void;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
};

/**
 * Subscribes to one Ctrl/Cmd keyboard shortcut without stale callback captures.
 */
export function useKeyboardShortcut({
  key,
  enabled = true,
  onTrigger,
}: KeyboardShortcutOptions): void {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      onTriggerRef.current(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, key]);
}

