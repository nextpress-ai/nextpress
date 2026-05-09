import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Globe, Database, Code, Shield, Bell, Upload, X, ImageIcon, Home } from 'lucide-react';
import AdminTopBar from '@/components/AdminTopBar';
import AdminSidebar from '@/components/AdminSidebar';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import MediaPickerDialog from '@/components/media/MediaPickerDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DomainInputWithVerify } from '@/components/domain';

/**
 * Settings structure matching server schema
 * Organized by category: general, writing, reading, discussion, system
 */
interface Settings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  writing: {
    richTextEnabled: boolean;
    autosaveEnabled: boolean;
    syntaxHighlighting: boolean;
  };
  reading: {
    postsPerPage: number;
    rssPosts: number;
    rssEnabled: boolean;
    discourageSearchIndexing: boolean;
  };
  discussion: {
    enableComments: boolean;
    moderateComments: boolean;
    emailNotifications: boolean;
    enableRegistration: boolean;
    defaultRole: string;
  };
  system: {
    cachingEnabled: boolean;
    compressionEnabled: boolean;
    securityHeadersEnabled: boolean;
    debugMode: boolean;
    restApiEnabled: boolean;
    graphqlEnabled: boolean;
    webhooksEnabled: boolean;
  };
}

interface HomepageOptionResponse {
  name: string;
  value: string;
}

interface PublishedPagesForHomeResponse {
  pages: Array<{ id: string; title: string; slug: string | null }>;
}

/**
 * Site info structure for logo, favicon, and theme
 * These are stored in the sites table directly (not in settings JSONB)
 */
interface SiteInfo {
  logoUrl: string | null;
  faviconUrl: string | null;
  activeThemeId: string | null;
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
}

/**
 * Common timezone options
 */
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Africa/Cairo', label: 'Cairo' },
  { value: 'Africa/Lagos', label: 'Lagos' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'Kolkata' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];

/**
 * Common date format options (date-fns format tokens)
 */
const DATE_FORMAT_OPTIONS = [
  { value: 'MMMM d, yyyy', label: 'January 1, 2025' },
  { value: 'MMM d, yyyy', label: 'Jan 1, 2025' },
  { value: 'MM/dd/yyyy', label: '01/01/2025' },
  { value: 'dd/MM/yyyy', label: '01/01/2025 (Day/Month/Year)' },
  { value: 'yyyy-MM-dd', label: '2025-01-01 (ISO)' },
  { value: 'EEEE, MMMM d, yyyy', label: 'Wednesday, January 1, 2025' },
  { value: 'd MMMM yyyy', label: '1 January 2025' },
];

/**
 * Common time format options (date-fns format tokens)
 */
const TIME_FORMAT_OPTIONS = [
  { value: 'h:mm a', label: '1:30 PM (12-hour)' },
  { value: 'h:mm:ss a', label: '1:30:45 PM (12-hour with seconds)' },
  { value: 'HH:mm', label: '13:30 (24-hour)' },
  { value: 'HH:mm:ss', label: '13:30:45 (24-hour with seconds)' },
];

export default function Settings() {
  const [formData, setFormData] = useState<Settings | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'logo' | 'favicon' | null>(null);
  
  // File preview states
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [faviconDragActive, setFaviconDragActive] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();

  /**
   * Safely format a date with the given format string
   */
  const safeFormatDate = useCallback((formatString: string): string => {
    try {
      return format(new Date(), formatString);
    } catch (error) {
      return 'Invalid format';
    }
  }, []);

  // Fetch current settings from new consolidated API
  const { data: settingsResponse, isLoading } = useQuery<{
    status: boolean;
    data: Settings;
  }>({
    queryKey: ['/api/settings'],
  });

  // Fetch site info (logo, favicon, theme)
  const { data: siteInfoResponse, isLoading: isSiteInfoLoading, error: siteInfoError } = useQuery<{
    status: boolean;
    data: SiteInfo;
  }>({
    queryKey: ['/api/site'],
    retry: 1, // Only retry once
  });

  // Log any errors
  if (siteInfoError) {
    console.error('Site info error:', siteInfoError);
  }

  // Fetch available themes
  const { data: themesData, isLoading: isThemesLoading, error: themesError } = useQuery<Theme[]>({
    queryKey: ['/api/themes'],
    retry: 1,
  });

  // Log any errors
  if (themesError) {
    console.error('Themes error:', themesError);
  }

  const { data: homepageOption } = useQuery<HomepageOptionResponse | null>({
    queryKey: ['/api/options/homepage_page_slug'],
    queryFn: async () => {
      const response = await fetch('/api/options/homepage_page_slug');
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to load homepage setting');
      return response.json() as Promise<HomepageOptionResponse>;
    },
  });

  const { data: publishedPagesForHome } = useQuery<PublishedPagesForHomeResponse>({
    queryKey: ['/api/pages', { status: 'publish', page: 1, per_page: 100 }],
  });

  const homepageSelectMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await apiRequest('POST', '/api/options', {
        name: 'homepage_page_slug',
        value: slug,
      });
      return response.json() as Promise<HomepageOptionResponse>;
    },
    onSuccess: (_data, slug) => {
      toast.success(
        slug
          ? 'Homepage updated.'
          : 'Homepage cleared — the site will use the default landing page.'
      );
      queryClient.invalidateQueries({ queryKey: ['/api/options/homepage_page_slug'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/homepage'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update homepage');
    },
  });

  // Extract settings from response
  const settings = settingsResponse?.data;
  const themes = themesData || [];

  console.log('Loading states:', { isLoading, isSiteInfoLoading, isThemesLoading });
  console.log('Data states:', { hasSettings: !!settings, hasFormData: !!formData, hasSiteInfo: !!siteInfo, themesCount: themes.length });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  // Initialize site info when loaded
  useEffect(() => {
    console.log('Site info response:', siteInfoResponse);
    if (siteInfoResponse?.data && !siteInfo) {
      setSiteInfo(siteInfoResponse.data);
    }
    // If there's an error or no response after loading completes, set empty defaults
    if (!isSiteInfoLoading && !siteInfoResponse && !siteInfo) {
      console.log('Setting default site info due to failed load');
      setSiteInfo({
        logoUrl: null,
        faviconUrl: null,
        activeThemeId: null,
      });
    }
  }, [siteInfoResponse, siteInfo, isSiteInfoLoading]);

  // Save mutation - sends entire nested structure via PATCH
  const saveMutation = useMutation({
    mutationFn: async (data: Settings) => {
      const response = await apiRequest('PATCH', '/api/settings', data);
      return response.json();
    },
    onSuccess: () => {
      setValidationErrors({});
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      console.error('Save error:', error);
      
      // Parse error message - apiRequest throws Error with message like "400: {...}"
      try {
        const errorMessage = error.message || '';
        const jsonStart = errorMessage.indexOf('{');
        
        if (jsonStart !== -1) {
          const jsonPart = errorMessage.substring(jsonStart);
          const errorData = JSON.parse(jsonPart);

          // Domain validation or Caddy config failure
          if (errorData.message && !errorData.errors) {
            toast.error(errorData.message);
            return;
          }
          
          if (errorData.errors) {
            const errorMap: Record<string, string> = {};
            
            errorData.errors.forEach((err: any) => {
              // Convert path array to dot notation: ['general', 'siteUrl'] -> 'general.siteUrl'
              const fieldPath = err.path.join('.');
              errorMap[fieldPath] = err.message;
            });
            
            setValidationErrors(errorMap);
            toast.error('Please fix the validation errors highlighted below');
            return;
          }
        }
      } catch (parseError) {
        console.error('Error parsing validation errors:', parseError);
      }
      
      toast.error('Failed to save settings');
    },
  });

  // Save site info mutation (logo, favicon, theme)
  const saveSiteInfoMutation = useMutation({
    mutationFn: async (data: Partial<SiteInfo>) => {
      const response = await apiRequest('PATCH', '/api/site', data);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Site information updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/site'] });
    },
    onError: (error: any) => {
      console.error('Save site info error:', error);
      toast.error('Failed to update site information');
    },
  });

  const handleSave = () => {
    if (formData) {
      console.log('Saving settings:', JSON.stringify(formData, null, 2));
      saveMutation.mutate(formData);
    }
  };

  /**
   * Handle media selection from MediaPickerDialog
   */
  const handleMediaSelect = (media: any) => {
    if (!siteInfo || !mediaPickerTarget) return;

    const updatedSiteInfo = {
      ...siteInfo,
      [mediaPickerTarget === 'logo' ? 'logoUrl' : 'faviconUrl']: media.url,
    };

    setSiteInfo(updatedSiteInfo);
    saveSiteInfoMutation.mutate({
      [mediaPickerTarget === 'logo' ? 'logoUrl' : 'faviconUrl']: media.url,
    });
  };

  /**
   * Handle file selection and preview
   */
  const handleFileSelect = useCallback((file: File, type: 'logo' | 'favicon') => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoPreview(reader.result as string);
        setLogoFile(file);
      } else {
        setFaviconPreview(reader.result as string);
        setFaviconFile(file);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Upload file to media library and update site info
   */
  const handleFileUpload = useCallback(async (type: 'logo' | 'favicon') => {
    const file = type === 'logo' ? logoFile : faviconFile;
    if (!file || !siteInfo) return;

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    try {
      // Upload to media library
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest('POST', '/api/media/upload', formData);
      const mediaData = await response.json();

      if (!mediaData || !mediaData.url) {
        throw new Error('Failed to upload file');
      }

      // Update site info with the new URL
      const updatedSiteInfo = {
        ...siteInfo,
        [type === 'logo' ? 'logoUrl' : 'faviconUrl']: mediaData.url,
      };

      setSiteInfo(updatedSiteInfo);
      await saveSiteInfoMutation.mutateAsync({
        [type === 'logo' ? 'logoUrl' : 'faviconUrl']: mediaData.url,
      });

      // Clear preview
      if (type === 'logo') {
        setLogoPreview(null);
        setLogoFile(null);
      } else {
        setFaviconPreview(null);
        setFaviconFile(null);
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type === 'logo' ? 'logo' : 'favicon'}`);
    } finally {
      setUploading(false);
    }
  }, [logoFile, faviconFile, siteInfo, saveSiteInfoMutation]);

  /**
   * Cancel file preview
   */
  const handleCancelPreview = useCallback((type: 'logo' | 'favicon') => {
    if (type === 'logo') {
      setLogoPreview(null);
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      setFaviconPreview(null);
      setFaviconFile(null);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  }, []);

  /**
   * Drag and drop handlers
   */
  const handleDragOver = useCallback((e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    if (type === 'logo') {
      setLogoDragActive(true);
    } else {
      setFaviconDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    if (type === 'logo') {
      setLogoDragActive(false);
    } else {
      setFaviconDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    if (type === 'logo') {
      setLogoDragActive(false);
    } else {
      setFaviconDragActive(false);
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], type);
    }
  }, [handleFileSelect]);

  /**
   * Handle theme selection change
   */
  const handleThemeChange = (themeId: string) => {
    if (!siteInfo) return;

    const updatedSiteInfo = {
      ...siteInfo,
      activeThemeId: themeId,
    };

    setSiteInfo(updatedSiteInfo);
    saveSiteInfoMutation.mutate({ activeThemeId: themeId });
  };

  /**
   * Handle removing logo or favicon
   */
  const handleRemoveImage = (type: 'logo' | 'favicon') => {
    if (!siteInfo) return;

    const updatedSiteInfo = {
      ...siteInfo,
      [type === 'logo' ? 'logoUrl' : 'faviconUrl']: null,
    };

    setSiteInfo(updatedSiteInfo);
    saveSiteInfoMutation.mutate({
      [type === 'logo' ? 'logoUrl' : 'faviconUrl']: null,
    });
  };

  // Helper to update nested settings
  const updateGeneralField = <K extends keyof Settings['general']>(
    field: K,
    value: Settings['general'][K]
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        general: { ...formData.general, [field]: value },
      });
    }
  };

  const updateWritingField = <K extends keyof Settings['writing']>(
    field: K,
    value: Settings['writing'][K]
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        writing: { ...formData.writing, [field]: value },
      });
    }
  };

  const updateReadingField = <K extends keyof Settings['reading']>(
    field: K,
    value: Settings['reading'][K]
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        reading: { ...formData.reading, [field]: value },
      });
    }
  };

  const updateDiscussionField = <K extends keyof Settings['discussion']>(
    field: K,
    value: Settings['discussion'][K]
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        discussion: { ...formData.discussion, [field]: value },
      });
    }
  };

  const updateSystemField = <K extends keyof Settings['system']>(
    field: K,
    value: Settings['system'][K]
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        system: { ...formData.system, [field]: value },
      });
    }
  };

  /**
   * Helper to get validation error for a specific field path
   * @param path - Dot-notation field path (e.g., 'general.siteUrl')
   * @returns Error message if exists, undefined otherwise
   */
  const getFieldError = (path: string): string | undefined => {
    return validationErrors[path];
  };

  /**
   * Clear validation error when user edits a field
   * @param path - Dot-notation field path to clear
   */
  const clearFieldError = (path: string) => {
    if (validationErrors[path]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[path];
        return updated;
      });
    }
  };

  const systemInfo = [
    { label: 'NextPress Version', value: '1.0.0' },
    { label: 'Node.js Version', value: '20.x' },
    { label: 'Database', value: 'PostgreSQL' },
    { label: 'WordPress API', value: 'Compatible' },
    { label: 'Hook System', value: 'Active' },
    { label: 'Theme Engine', value: 'Multi-Renderer' },
  ];

  if (isLoading || (isSiteInfoLoading && !siteInfoError) || (isThemesLoading && !themesError) || !formData) {
    return (
      <div className="min-h-screen bg-wp-gray-light">
        <AdminTopBar />
        <AdminSidebar />
        <div className="ml-40 pt-8">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-semibold text-wp-gray">Settings</h1>
          </div>
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Spinner className="w-8 h-8 text-wp-blue mx-auto mb-4" />
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wp-gray-light">
      <AdminTopBar />
      <AdminSidebar />

      <div className="ml-40 pt-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-wp-gray">Settings</h1>
            <Button
              className="bg-wp-blue hover:bg-wp-blue-dark text-white"
              onClick={handleSave}
              disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="writing">Writing</TabsTrigger>
              <TabsTrigger value="reading">Reading</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-wp-blue" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Title</Label>
                      <Input
                        id="siteName"
                        value={formData.general.siteName}
                        onChange={(e) => {
                          updateGeneralField('siteName', e.target.value);
                          clearFieldError('general.siteName');
                        }}
                        placeholder="Your site title"
                        className={getFieldError('general.siteName') ? 'border-red-500' : ''}
                      />
                      {getFieldError('general.siteName') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('general.siteName')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Admin Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={formData.general.adminEmail}
                        onChange={(e) => {
                          updateGeneralField('adminEmail', e.target.value);
                          clearFieldError('general.adminEmail');
                        }}
                        placeholder="admin@example.com"
                        className={getFieldError('general.adminEmail') ? 'border-red-500' : ''}
                      />
                      {getFieldError('general.adminEmail') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('general.adminEmail')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={formData.general.siteDescription}
                      onChange={(e) => {
                        updateGeneralField('siteDescription', e.target.value);
                        clearFieldError('general.siteDescription');
                      }}
                      placeholder="Brief description of your site"
                      rows={3}
                      className={getFieldError('general.siteDescription') ? 'border-red-500' : ''}
                    />
                    {getFieldError('general.siteDescription') && (
                      <p className="text-sm text-red-500">
                        {getFieldError('general.siteDescription')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <DomainInputWithVerify
                      id="siteUrl"
                      label="Site URL"
                      inputMode="siteUrl"
                      value={formData.general.siteUrl}
                      onChange={(v) => {
                        updateGeneralField('siteUrl', v);
                        clearFieldError('general.siteUrl');
                      }}
                      placeholder="https://example.com"
                      className={getFieldError('general.siteUrl') ? '[&_input]:border-red-500' : ''}
                    />
                    {getFieldError('general.siteUrl') && (
                      <p className="text-sm text-red-500">
                        {getFieldError('general.siteUrl')}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={formData.general.timezone}
                        onValueChange={(value) => {
                          updateGeneralField('timezone', value);
                          clearFieldError('general.timezone');
                        }}
                      >
                        <SelectTrigger className={getFieldError('general.timezone') ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Your site's timezone for date and time display
                      </p>
                      {getFieldError('general.timezone') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('general.timezone')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select
                        value={formData.general.dateFormat}
                        onValueChange={(value) => {
                          updateGeneralField('dateFormat', value);
                          clearFieldError('general.dateFormat');
                        }}
                      >
                        <SelectTrigger className={getFieldError('general.dateFormat') ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value}>
                              {fmt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Preview: {safeFormatDate(formData.general.dateFormat)}
                      </p>
                      {getFieldError('general.dateFormat') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('general.dateFormat')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeFormat">Time Format</Label>
                      <Select
                        value={formData.general.timeFormat}
                        onValueChange={(value) => {
                          updateGeneralField('timeFormat', value);
                          clearFieldError('general.timeFormat');
                        }}
                      >
                        <SelectTrigger className={getFieldError('general.timeFormat') ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select time format" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_FORMAT_OPTIONS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value}>
                              {fmt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Preview: {safeFormatDate(formData.general.timeFormat)}
                      </p>
                      {getFieldError('general.timeFormat') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('general.timeFormat')}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Site Branding Section */}
                  {siteInfo && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Site Branding</h3>
                      
                      {/* Logo Upload */}
                      <div className="space-y-2">
                        <Label>Site Logo</Label>
                        
                        {/* Show current logo if exists and no preview */}
                        {siteInfo.logoUrl && !logoPreview ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <img
                                src={siteInfo.logoUrl}
                                alt="Site logo"
                                className="h-16 w-auto object-contain border rounded p-2"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => logoInputRef.current?.click()}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Change
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveImage('logo')}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : logoPreview ? (
                          /* Show preview with upload/cancel buttons */
                          <div className="space-y-3">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="h-32 w-auto object-contain mx-auto"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => handleFileUpload('logo')}
                                disabled={uploadingLogo}
                                className="bg-wp-blue hover:bg-wp-blue-dark text-white"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCancelPreview('logo')}
                                disabled={uploadingLogo}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Show dropzone */
                          <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                              logoDragActive ? 'border-wp-blue bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDrop={(e) => handleDrop(e, 'logo')}
                            onDragOver={(e) => handleDragOver(e, 'logo')}
                            onDragLeave={(e) => handleDragLeave(e, 'logo')}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <input
                              type="file"
                              ref={logoInputRef}
                              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'logo')}
                              className="hidden"
                              accept="image/*"
                            />
                            <ImageIcon className={`mx-auto w-12 h-12 mb-4 ${logoDragActive ? 'text-wp-blue' : 'text-gray-400'}`} />
                            <p className="text-lg font-medium mb-2">
                              {logoDragActive ? 'Drop logo here' : 'Drag & drop logo here'}
                            </p>
                            <p className="text-gray-500 mb-4">or click to browse</p>
                            <p className="text-xs text-gray-500">
                              Supported: PNG, JPG, SVG (Max 5MB)
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          Recommended size: 200x60px or similar aspect ratio
                        </p>
                      </div>

                    {/* Favicon Upload */}
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      
                      {/* Show current favicon if exists and no preview */}
                      {siteInfo.faviconUrl && !faviconPreview ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <img
                              src={siteInfo.faviconUrl}
                              alt="Favicon"
                              className="h-8 w-8 object-contain border rounded"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => faviconInputRef.current?.click()}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Change
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveImage('favicon')}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : faviconPreview ? (
                        /* Show preview with upload/cancel buttons */
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                            <img
                              src={faviconPreview}
                              alt="Favicon preview"
                              className="h-16 w-16 object-contain mx-auto"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => handleFileUpload('favicon')}
                              disabled={uploadingFavicon}
                              className="bg-wp-blue hover:bg-wp-blue-dark text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleCancelPreview('favicon')}
                              disabled={uploadingFavicon}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Show dropzone */
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                            faviconDragActive ? 'border-wp-blue bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDrop={(e) => handleDrop(e, 'favicon')}
                          onDragOver={(e) => handleDragOver(e, 'favicon')}
                          onDragLeave={(e) => handleDragLeave(e, 'favicon')}
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={faviconInputRef}
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'favicon')}
                            className="hidden"
                            accept="image/*,.ico"
                          />
                          <ImageIcon className={`mx-auto w-12 h-12 mb-4 ${faviconDragActive ? 'text-wp-blue' : 'text-gray-400'}`} />
                          <p className="text-lg font-medium mb-2">
                            {faviconDragActive ? 'Drop favicon here' : 'Drag & drop favicon here'}
                          </p>
                          <p className="text-gray-500 mb-4">or click to browse</p>
                          <p className="text-xs text-gray-500">
                            Supported: PNG, ICO (Max 5MB)
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Recommended: 32x32px or 16x16px .ico or .png file
                      </p>
                    </div>

                    {/* Theme Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="activeTheme">Active Theme</Label>
                      <Select
                        value={siteInfo.activeThemeId || ''}
                        onValueChange={handleThemeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          {themes.map((theme) => (
                            <SelectItem key={theme.id} value={theme.id}>
                              {theme.name} {theme.version && `(v${theme.version})`}
                            </SelectItem>
                          ))}
                          {themes.length === 0 && (
                            <SelectItem value="" disabled>
                              No themes available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Choose the theme for your site's frontend
                      </p>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Writing Settings */}
            <TabsContent value="writing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="w-5 h-5 mr-2 text-wp-blue" />
                    Writing Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Rich Text Editor</Label>
                        <p className="text-sm text-gray-600">
                          Use visual editor for posts and pages
                        </p>
                      </div>
                      <Switch
                        checked={formData.writing.richTextEnabled}
                        onCheckedChange={(checked) =>
                          updateWritingField('richTextEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-save Posts</Label>
                        <p className="text-sm text-gray-600">
                          Automatically save drafts while writing
                        </p>
                      </div>
                      <Switch
                        checked={formData.writing.autosaveEnabled}
                        onCheckedChange={(checked) =>
                          updateWritingField('autosaveEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Code Syntax Highlighting</Label>
                        <p className="text-sm text-gray-600">
                          Highlight code blocks in posts
                        </p>
                      </div>
                      <Switch
                        checked={formData.writing.syntaxHighlighting}
                        onCheckedChange={(checked) =>
                          updateWritingField('syntaxHighlighting', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reading Settings */}
            <TabsContent value="reading">
              <Card>
                <CardHeader>
                  <CardTitle>Reading Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <Home className="mt-0.5 h-5 w-5 shrink-0 text-wp-blue" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor="site-homepage-select">Site homepage</Label>
                        <p className="text-sm text-gray-600">
                          Published page shown at the site root (<span className="font-mono text-xs">/</span>
                          ). Choose &quot;Default landing page&quot; to show the built-in landing until you select a page.
                        </p>
                        <Select
                          disabled={homepageSelectMutation.isPending}
                          onValueChange={(value) => {
                            const slug = value === '__none__' ? '' : value;
                            homepageSelectMutation.mutate(slug);
                          }}
                          value={
                            homepageOption?.value && homepageOption.value.length > 0
                              ? homepageOption.value
                              : '__none__'
                          }
                        >
                          <SelectTrigger id="site-homepage-select" className="max-w-md bg-white">
                            <SelectValue placeholder="Select homepage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Default landing page</SelectItem>
                            {homepageOption?.value &&
                              homepageOption.value.length > 0 &&
                              !(publishedPagesForHome?.pages ?? []).some(
                                (p) => p.slug === homepageOption.value
                              ) && (
                                <SelectItem value={homepageOption.value}>
                                  {homepageOption.value} (page missing or not in list)
                                </SelectItem>
                              )}
                            {(publishedPagesForHome?.pages ?? [])
                              .filter((p) => Boolean(p.slug?.trim()))
                              .map((p) => (
                                <SelectItem key={p.id} value={p.slug as string}>
                                  {p.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="postsPerPage">Posts per Page</Label>
                      <Input
                        id="postsPerPage"
                        type="number"
                        value={formData.reading.postsPerPage}
                        onChange={(e) => {
                          updateReadingField(
                            'postsPerPage',
                            parseInt(e.target.value) || 10
                          );
                          clearFieldError('reading.postsPerPage');
                        }}
                        min={1}
                        max={100}
                        className={getFieldError('reading.postsPerPage') ? 'border-red-500' : ''}
                      />
                      {getFieldError('reading.postsPerPage') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('reading.postsPerPage')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rssPosts">RSS Feed Posts</Label>
                      <Input
                        id="rssPosts"
                        type="number"
                        value={formData.reading.rssPosts}
                        onChange={(e) => {
                          updateReadingField(
                            'rssPosts',
                            parseInt(e.target.value) || 10
                          );
                          clearFieldError('reading.rssPosts');
                        }}
                        min={1}
                        max={100}
                        className={getFieldError('reading.rssPosts') ? 'border-red-500' : ''}
                      />
                      {getFieldError('reading.rssPosts') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('reading.rssPosts')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable RSS Feeds</Label>
                        <p className="text-sm text-gray-600">
                          Allow RSS feed generation
                        </p>
                      </div>
                      <Switch
                        checked={formData.reading.rssEnabled}
                        onCheckedChange={(checked) =>
                          updateReadingField('rssEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Search Engine Visibility</Label>
                        <p className="text-sm text-gray-600">
                          Discourage search engines from indexing this site
                        </p>
                      </div>
                      <Switch
                        checked={formData.reading.discourageSearchIndexing}
                        onCheckedChange={(checked) =>
                          updateReadingField(
                            'discourageSearchIndexing',
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Discussion Settings */}
            <TabsContent value="discussion">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-wp-blue" />
                    Discussion Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Comments</Label>
                        <p className="text-sm text-gray-600">
                          Enable comments on posts and pages
                        </p>
                      </div>
                      <Switch
                        checked={formData.discussion.enableComments}
                        onCheckedChange={(checked) =>
                          updateDiscussionField('enableComments', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Moderate Comments</Label>
                        <p className="text-sm text-gray-600">
                          Comments must be approved before appearing
                        </p>
                      </div>
                      <Switch
                        checked={formData.discussion.moderateComments}
                        onCheckedChange={(checked) =>
                          updateDiscussionField('moderateComments', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-600">
                          Send email when new comments are posted
                        </p>
                      </div>
                      <Switch
                        checked={formData.discussion.emailNotifications}
                        onCheckedChange={(checked) =>
                          updateDiscussionField('emailNotifications', checked)
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>User Registration</Label>
                        <p className="text-sm text-gray-600">
                          Allow new user registration
                        </p>
                      </div>
                      <Switch
                        checked={formData.discussion.enableRegistration}
                        onCheckedChange={(checked) =>
                          updateDiscussionField('enableRegistration', checked)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultRole">Default User Role</Label>
                      <Input
                        id="defaultRole"
                        value={formData.discussion.defaultRole}
                        onChange={(e) => {
                          updateDiscussionField('defaultRole', e.target.value);
                          clearFieldError('discussion.defaultRole');
                        }}
                        placeholder="subscriber"
                        className={getFieldError('discussion.defaultRole') ? 'border-red-500' : ''}
                      />
                      {getFieldError('discussion.defaultRole') && (
                        <p className="text-sm text-red-500">
                          {getFieldError('discussion.defaultRole')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="system">
              <div className="space-y-6">
                {/* System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-wp-blue" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {systemInfo.map((info, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-700">
                            {info.label}
                          </span>
                          <Badge variant="outline">{info.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-wp-blue" />
                      Performance & Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Caching</Label>
                        <p className="text-sm text-gray-600">
                          Cache rendered pages for better performance
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.cachingEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('cachingEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Compression</Label>
                        <p className="text-sm text-gray-600">
                          Compress responses to reduce bandwidth
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.compressionEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('compressionEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Security Headers</Label>
                        <p className="text-sm text-gray-600">
                          Add security headers to responses
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.securityHeadersEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('securityHeadersEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Debug Mode</Label>
                        <p className="text-sm text-gray-600">
                          Enable debug logging and error details
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.debugMode}
                        onCheckedChange={(checked) =>
                          updateSystemField('debugMode', checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* API Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>API Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>REST API</Label>
                        <p className="text-sm text-gray-600">
                          Enable WordPress-compatible REST API
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.restApiEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('restApiEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>GraphQL API</Label>
                        <p className="text-sm text-gray-600">
                          Enable GraphQL endpoint for modern applications
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.graphqlEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('graphqlEnabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Webhooks</Label>
                        <p className="text-sm text-gray-600">
                          Enable webhook notifications for content changes
                        </p>
                      </div>
                      <Switch
                        checked={formData.system.webhooksEnabled}
                        onCheckedChange={(checked) =>
                          updateSystemField('webhooksEnabled', checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
