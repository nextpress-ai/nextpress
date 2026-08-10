import type {
  MetaTagEntry,
  Page,
  PageDesignSettings,
  PageIconSettings,
  PageOther,
  PageSeoSettings,
  Post,
  Template,
  TokenEntry,
} from '@shared/schema-types';

export type PageSettingsFormValues = {
  title: string;
  slug: string;
  status: string;
  featuredImage: string;
  allowComments: boolean;
  password: string;
  parentId: string;
  menuOrder: number;
  templateId: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  customMetaTags: MetaTagEntry[];
  fontFamily: string;
  containerWidth: string;
  padding: string;
  backgroundColor?: TokenEntry;
  textColor?: TokenEntry;
  iconDefaultSet: PageIconSettings['defaultSet'];
  iconDefaultSize: number;
};

export type PageSettingsPayload =
  | { name: string }
  | {
      title: string;
      slug: string;
      status: string;
      featuredImage: string | null;
      allowComments: boolean;
      password: string | null;
      other: PageOther;
      parentId?: string | null;
      menuOrder?: number;
      templateId?: string | null;
      expectedVersion: number;
    };

const toNullableString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readPageOther = (page: Page | Post | Template): PageOther => {
  if (!('other' in page)) return {};
  return (page.other as PageOther | null | undefined) ?? {};
};

/**
 * Builds settings payload without dropping metadata outside visible tabs.
 * Null clears nullable database fields, while omitted keys preserve them.
 */
export function buildPageSettingsPayload({
  page,
  isTemplate,
  contentType,
  values,
}: {
  page: Page | Post | Template;
  isTemplate: boolean;
  contentType: 'page' | 'post';
  values: PageSettingsFormValues;
}): PageSettingsPayload {
  if (isTemplate) return { name: values.title };

  const existingOther = readPageOther(page);
  const seoSettings: PageSeoSettings = {
    ...existingOther.seo,
    metaTitle: values.metaTitle || undefined,
    metaDescription: values.metaDescription || undefined,
    canonicalUrl: values.canonicalUrl || undefined,
    noIndex: values.noIndex,
    customMeta:
      values.customMetaTags.length > 0 ? values.customMetaTags : undefined,
  };
  const designSettings: PageDesignSettings = {
    ...existingOther.design,
    fontFamily: values.fontFamily,
    containerWidth: values.containerWidth,
    padding: values.padding,
    backgroundColor: values.backgroundColor,
    textColor: values.textColor,
  };
  const iconSettings: PageIconSettings = {
    ...existingOther.icons,
    defaultSet: values.iconDefaultSet,
    defaultSize: values.iconDefaultSize,
  };
  const other: PageOther = {
    ...existingOther,
    seo: seoSettings,
    ...(contentType === 'page' && {
      design: designSettings,
      icons: iconSettings,
    }),
  };

  const payload: PageSettingsPayload = {
    title: values.title,
    slug: values.slug,
    status: values.status,
    featuredImage: toNullableString(values.featuredImage),
    allowComments: values.allowComments,
    password: toNullableString(values.password),
    other,
    expectedVersion: 'version' in page ? page.version ?? 0 : 0,
  };

  if (contentType === 'page') {
    payload.parentId = toNullableString(values.parentId);
    payload.menuOrder = values.menuOrder;
    payload.templateId = toNullableString(values.templateId);
  }

  return payload;
}
