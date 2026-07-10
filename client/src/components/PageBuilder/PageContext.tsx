import React, { createContext, useContext } from 'react';
import type { PageOther, PageIconSettings } from '@shared/schema-types';
import { DEFAULT_PAGE_ICONS } from '@shared/page-other';

export interface PageContextValue {
  /** Full page.other object */
  pageOther?: PageOther;

  /** Icon settings with defaults applied */
  iconSettings: PageIconSettings;
}

const DEFAULT_ICON_SETTINGS: PageIconSettings = DEFAULT_PAGE_ICONS;

const PageContext = createContext<PageContextValue>({
  iconSettings: DEFAULT_ICON_SETTINGS,
});

/**
 * Hook to access page-level settings from any block component.
 */
export function usePageContext(): PageContextValue {
  return useContext(PageContext);
}

/**
 * Hook to access icon settings with defaults.
 */
export function useIconSettings(): PageIconSettings {
  return useContext(PageContext).iconSettings;
}

export function PageProvider({
  pageOther,
  children,
}: {
  pageOther?: PageOther;
  children: React.ReactNode;
}) {
  const iconSettings: PageIconSettings = {
    ...DEFAULT_ICON_SETTINGS,
    ...pageOther?.icons,
  };

  return (
    <PageContext.Provider value={{ pageOther, iconSettings }}>
      {children}
    </PageContext.Provider>
  );
}
