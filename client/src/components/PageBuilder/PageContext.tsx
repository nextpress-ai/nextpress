import React, { createContext, useContext } from 'react';
import type { PageOther, PageIconSettings } from '@shared/schema-types';
import { DEFAULT_PAGE_ICONS } from '@shared/page-other';
import type { AuthorDisplay } from '@shared/author-display';

export type PostDocumentFields = {
  title?: string;
  excerpt?: string;
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
};

export type PostDocumentValue = {
  contentType: 'post' | 'page' | 'template';
  postId?: string;
  authorId?: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  categories: string[];
  tags: string[];
  publishedAt?: string | null;
  createdAt?: string | null;
  author?: AuthorDisplay | null;
  updateDocument: (patch: PostDocumentFields) => void;
};

export interface PageContextValue {
  /** Full page.other object */
  pageOther?: PageOther;

  /** Icon settings with defaults applied */
  iconSettings: PageIconSettings;

  /** Live post document for post-* blocks. Null when editing a page or template. */
  postDocument: PostDocumentValue | null;
}

const DEFAULT_ICON_SETTINGS: PageIconSettings = DEFAULT_PAGE_ICONS;

const PageContext = createContext<PageContextValue>({
  iconSettings: DEFAULT_ICON_SETTINGS,
  postDocument: null,
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

/** Post document for title, excerpt, image, author, and taxonomy blocks. */
export function usePostDocument(): PostDocumentValue | null {
  return useContext(PageContext).postDocument;
}

export function PageProvider({
  pageOther,
  postDocument = null,
  children,
}: {
  pageOther?: PageOther;
  postDocument?: PostDocumentValue | null;
  children: React.ReactNode;
}) {
  const iconSettings: PageIconSettings = {
    ...DEFAULT_ICON_SETTINGS,
    ...pageOther?.icons,
  };

  return (
    <PageContext.Provider value={{ pageOther, iconSettings, postDocument }}>
      {children}
    </PageContext.Provider>
  );
}
