/**
 * Default site-wide settings structure
 * 
 * Used as fallback when sites.settings is empty or incomplete.
 * Date/time formats use date-fns tokens.
 * Timezone uses IANA standard identifiers.
 */
export const DEFAULT_SETTINGS = {
  general: {
    siteName: 'NextPress Site',
    siteDescription: 'WordPress-Compatible CMS',
    siteUrl: '',
    adminEmail: '',
    timezone: 'UTC',
    dateFormat: 'LLLL d, yyyy',  // September 21, 2025
    timeFormat: 'h:mm a',        // 3:45 pm
  },
  writing: {
    richTextEnabled: true,
    autosaveEnabled: true,
    syntaxHighlighting: true,
  },
  reading: {
    postsPerPage: 10,
    rssPosts: 10,
    rssEnabled: true,
    discourageSearchIndexing: false,
    descriptionFrom: 'auto',
  },
  discussion: {
    enableComments: true,
    moderateComments: true,
    emailNotifications: true,
    enableRegistration: false,
    defaultRole: 'subscriber',
  },
  system: {
    cachingEnabled: true,
    compressionEnabled: true,
    securityHeadersEnabled: true,
    debugMode: false,
    restApiEnabled: true,
    graphqlEnabled: false,
    webhooksEnabled: false,
  },
} as const;

export type SiteSettings = typeof DEFAULT_SETTINGS;
