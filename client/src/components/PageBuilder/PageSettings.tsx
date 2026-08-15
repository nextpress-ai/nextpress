import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus } from 'lucide-react';
import TokenColorPicker from './TokenColorPicker';
import { useContentLists } from '@/hooks/useContentLists';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { appendSiteIdToUrl, buildSiteOptionUrl } from '@/lib/site-api';
import { useActiveSite } from '@/hooks/useActiveSite';
import type {
  Page,
  Post,
  Template,
  TokenEntry,
  PageOther,
  MetaTagEntry,
} from '@shared/schema-types';
import { PAGE_FONT_CATALOG } from "@shared/font-catalog";
import {
  buildPageSettingsPayload,
  type PageSettingsFormValues,
} from '@/lib/page-settings-payload';

interface PageSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page | Post | Template | undefined;
  isTemplate?: boolean;
  onUpdate?: (updatedPage: Page | Post | Template) => void;
  onMetaChange?: (meta: Partial<{ title: string; slug: string; status: string }>) => void;
  contentType?: 'page' | 'post';
}

interface OptionApiResponse {
  name: string;
  value: string;
}

type EditablePageFields = {
  title?: string | null;
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  featuredImage?: string | null;
  allowComments?: boolean | null;
  password?: string | null;
  parentId?: string | null;
  menuOrder?: number | null;
  templateId?: string | null;
};

const CONTAINER_WIDTH_OPTIONS = [
  { value: '960px', label: '960px' },
  { value: '1024px', label: '1024px' },
  { value: '1200px', label: '1200px (Default)' },
  { value: '1440px', label: '1440px' },
  { value: '100%', label: 'Full Width' },
] as const;

/**
 * PageSettingsModal - Dialog-based page settings editor
 * Organized in three tabs: General, Design, and SEO
 */
export default function PageSettingsModal({
  open,
  onOpenChange,
  page,
  isTemplate = false,
  onUpdate,
  onMetaChange,
  contentType = 'page',
}: PageSettingsModalProps) {
  const { pages, templates } = useContentLists();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeSiteId } = useActiveSite();
  const editablePage = page as (Page | Post | Template) & EditablePageFields;

  const { data: homepageOption } = useQuery<OptionApiResponse | null>({
    queryKey: ['/api/options/homepage_page_slug', { siteId: activeSiteId }],
    queryFn: async () => {
      const response = await fetch(
        buildSiteOptionUrl({ name: 'homepage_page_slug', siteId: activeSiteId }),
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to load homepage setting');
      return response.json() as Promise<OptionApiResponse>;
    },
    enabled: open && contentType === 'page' && !isTemplate && Boolean(activeSiteId),
  });

  // Extract current other field data
  const pageOther = (page as { other?: PageOther })?.other;
  const currentSeo = pageOther?.seo;
  const currentDesign = pageOther?.design;
  const currentIcons = pageOther?.icons;

  // General tab state
  const [title, setTitle] = useState(editablePage?.title ?? editablePage?.name ?? '');
  const [slug, setSlug] = useState(editablePage?.slug ?? '');
  const [status, setStatus] = useState(editablePage?.status ?? 'draft');
  const [featuredImage, setFeaturedImage] = useState(editablePage?.featuredImage ?? '');
  const [allowComments, setAllowComments] = useState(editablePage?.allowComments ?? false);
  const [password, setPassword] = useState(editablePage?.password ?? '');
  const [parentId, setParentId] = useState(editablePage?.parentId ?? '');
  const [menuOrder, setMenuOrder] = useState(editablePage?.menuOrder ?? 0);
  const [templateId, setTemplateId] = useState(editablePage?.templateId ?? '');
  const [setAsHomepage, setSetAsHomepage] = useState(false);

  // SEO tab state
  const [metaTitle, setMetaTitle] = useState(currentSeo?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(currentSeo?.metaDescription ?? '');
  const [canonicalUrl, setCanonicalUrl] = useState(currentSeo?.canonicalUrl ?? '');
  const [noIndex, setNoIndex] = useState(currentSeo?.noIndex ?? false);
  const [customMetaTags, setCustomMetaTags] = useState<MetaTagEntry[]>(
    currentSeo?.customMeta ?? []
  );

  // Design tab state (pages only)
  const [fontFamily, setFontFamily] = useState(currentDesign?.fontFamily ?? 'system-ui');
  const [containerWidth, setContainerWidth] = useState(currentDesign?.containerWidth ?? '1200px');
  const [padding, setPadding] = useState(currentDesign?.padding ?? '2rem 1rem');
  const [backgroundColor, setBackgroundColor] = useState<TokenEntry | undefined>(
    currentDesign?.backgroundColor
  );
  const [textColor, setTextColor] = useState<TokenEntry | undefined>(currentDesign?.textColor);

  // Icon settings state (pages only)
  const [iconDefaultSet, setIconDefaultSet] = useState(currentIcons?.defaultSet ?? 'lucide');
  const [iconDefaultSize, setIconDefaultSize] = useState<number>(currentIcons?.defaultSize ?? 24);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!page?.id) throw new Error('Page ID is required');
      if ((setAsHomepage || isCurrentHomepage) && status !== 'publish') {
        throw new Error('Publish this page before setting it as the homepage');
      }

      const values: PageSettingsFormValues = {
        title,
        slug,
        status,
        featuredImage,
        allowComments,
        password,
        parentId,
        menuOrder,
        templateId,
        metaTitle,
        metaDescription,
        canonicalUrl,
        noIndex,
        customMetaTags,
        fontFamily,
        containerWidth,
        padding,
        backgroundColor,
        textColor,
        iconDefaultSet,
        iconDefaultSize,
      };
      const payload = buildPageSettingsPayload({
        page,
        isTemplate,
        contentType,
        values,
      });

      const endpoint = isTemplate
        ? `/api/templates/${page.id}`
        : contentType === 'post'
          ? `/api/posts/${page.id}`
          : `/api/pages/${page.id}`;

      const response = await apiRequest('PUT', endpoint, payload);
      const updatedPage = (await response.json()) as Page | Post | Template;

      if (contentType === 'page' && (setAsHomepage || isCurrentHomepage) && slug) {
        await apiRequest('POST', appendSiteIdToUrl('/api/options', activeSiteId), {
          name: 'homepage_page_slug',
          value: slug,
        });
      }

      return updatedPage;
    },
    onSuccess: (data: Page | Post | Template) => {
      // Notify parent of meta changes for main save button
      if (onMetaChange) {
        if (isTemplate) {
          onMetaChange({ title: (data as Template).name });
        } else {
          const updated = data as Page | Post;
          onMetaChange({
            title: updated.title ?? '',
            slug: updated.slug ?? '',
            status: updated.status ?? 'draft',
          });
        }
      }

      // Notify parent of full update
      if (onUpdate) {
        onUpdate(data);
      }

      // Invalidate queries
      const queryKey = isTemplate
        ? ['/api/templates']
        : contentType === 'post'
          ? ['/api/posts']
          : ['/api/pages'];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: ['/api/options/homepage_page_slug', { siteId: activeSiteId }],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/public/homepage'] });

      toast({
        title: 'Success',
        description: `${isTemplate ? 'Template' : contentType === 'page' ? 'Page' : 'Post'} settings saved successfully`,
      });

      // Close modal
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    },
  });

  const originalSlug = (page as { slug?: string } | undefined)?.slug ?? '';
  const homepageSlug = homepageOption?.value;
  const isCurrentHomepage =
    contentType === 'page' && Boolean(originalSlug) && originalSlug === homepageSlug;

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleAddMetaTag = () => {
    setCustomMetaTags([...customMetaTags, { name: '', content: '' }]);
  };

  const handleRemoveMetaTag = (index: number) => {
    setCustomMetaTags(customMetaTags.filter((_, i) => i !== index));
  };

  const handleUpdateMetaTag = (index: number, field: 'name' | 'content', value: string) => {
    const updated = [...customMetaTags];
    updated[index] = { ...updated[index], [field]: value };
    setCustomMetaTags(updated);
  };

  const handleBackgroundChange = (entry: TokenEntry) => {
    setBackgroundColor(entry);
  };

  const handleTextColorChange = (entry: TokenEntry) => {
    setTextColor(entry);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1">
          <TabsList className={`grid w-full ${contentType === 'page' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="general">General</TabsTrigger>
            {contentType === 'page' && <TabsTrigger value="design">Design</TabsTrigger>}
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="page-slug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="publish">Publish</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="trash">Trash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contentType === 'page' && !isTemplate && (
                <div className="flex items-center justify-between rounded-md border border-npb-border-default p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="setAsHomepage">Homepage</Label>
<p className="text-xs text-npb-text-muted">
                    Prevent search engines from indexing this page
                  </p>
                  </div>
                  <Switch
                    id="setAsHomepage"
                    checked={isCurrentHomepage || setAsHomepage}
                    disabled={isCurrentHomepage}
                    onCheckedChange={setSetAsHomepage}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image URL</Label>
                <Input
                  id="featuredImage"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowComments"
                  checked={allowComments}
                  onCheckedChange={(checked) => setAllowComments(checked === true)}
                />
                <Label htmlFor="allowComments" className="cursor-pointer">
                  Allow Comments
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password Protection</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for no protection"
                />
              </div>

              {contentType === 'page' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Page</Label>
                    <Select value={parentId || '__none__'} onValueChange={(val) => setParentId(val === '__none__' ? '' : val)}>
                      <SelectTrigger id="parentId">
                        <SelectValue placeholder="None (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (Top Level)</SelectItem>
                        {pages
                          ?.filter((p) => p.id !== page?.id)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="menuOrder">Menu Order</Label>
                    <Input
                      id="menuOrder"
                      type="number"
                      value={menuOrder}
                      onChange={(e) => setMenuOrder(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateId">Template</Label>
                    {templates.length > 0 ? (
                    <Select value={templateId || '__none__'} onValueChange={(val) => setTemplateId(val === '__none__' ? '' : val)}>
                      <SelectTrigger id="templateId">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    ) : (
                      <p className="text-sm text-npb-text-muted">
                        No templates yet.{' '}
                        <a href="/admin/templates" className="text-npb-accent hover:underline">
                          Create one
                        </a>
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Design Tab - Pages Only */}
            {contentType === 'page' && (
              <TabsContent value="design" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger id="fontFamily">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_FONT_CATALOG.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="containerWidth">Container Width</Label>
                  <Select value={containerWidth} onValueChange={setContainerWidth}>
                    <SelectTrigger id="containerWidth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINER_WIDTH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="padding">Padding</Label>
                  <Input
                    id="padding"
                    value={padding}
                    onChange={(e) => setPadding(e.target.value)}
                    placeholder="2rem 1rem"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <TokenColorPicker
                    property="backgroundColor"
                    currentEntry={backgroundColor}
                    currentStyleValue={backgroundColor?.style}
                    onChange={handleBackgroundChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <TokenColorPicker
                    property="color"
                    currentEntry={textColor}
                    currentStyleValue={textColor?.style}
                    onChange={handleTextColorChange}
                  />
                </div>

                {/* Icon Settings */}
                <div className="pt-4 border-t border-npb-border-default">
                  <h4 className="text-sm font-semibold text-npb-text-primary mb-3">Icons</h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="iconDefaultSet">Default Icon Set</Label>
                      <Select value={iconDefaultSet} onValueChange={(v) => setIconDefaultSet(v as typeof iconDefaultSet)}>
                        <SelectTrigger id="iconDefaultSet">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lucide">Lucide</SelectItem>
                          <SelectItem value="all">All Sets</SelectItem>
                        </SelectContent>
                      </Select>
<p className="text-xs text-npb-text-muted">
                        Default icon set for new Icon and Button blocks on this page
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="iconDefaultSize">Default Icon Size</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="iconDefaultSize"
                          type="number"
                          value={iconDefaultSize}
                          onChange={(e) => setIconDefaultSize(Number(e.target.value) || 24)}
                          min={8}
                          max={200}
                          className="w-24 h-9"
                        />
                        <span className="text-xs text-npb-text-muted">px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Override page title for search engines"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description for search results"
                  rows={3}
                />
                <p className="text-xs text-npb-text-muted">
                  {metaDescription.length} / 160 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="Custom canonical URL"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="noIndex">Hide from Search Engines</Label>
<p className="text-xs text-npb-text-muted">
                      Default icon set for new Icon and Button blocks on this page
                    </p>
                </div>
                <Switch id="noIndex" checked={noIndex} onCheckedChange={setNoIndex} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Custom Meta Tags</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMetaTag}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Tag
                  </Button>
                </div>

                {customMetaTags.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {customMetaTags.map((tag, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          placeholder="name"
                          value={tag.name}
                          onChange={(e) => handleUpdateMetaTag(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="content"
                          value={tag.content}
                          onChange={(e) => handleUpdateMetaTag(index, 'content', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMetaTag(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
