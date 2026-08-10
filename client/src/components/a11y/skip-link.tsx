import type { ReactNode } from 'react';

type SkipLinkProps = {
  href: string;
  children: ReactNode;
};

/**
 * Visually hidden until focused so keyboard users can bypass repeated chrome.
 */
export function SkipLink({ href, children }: SkipLinkProps): JSX.Element {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  );
}
