import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { useLocation } from "wouter";
import {
  showErrorToast,
  showSuccessToast,
  resolveCreatePageError,
} from "@/lib/sonner-toast";
import { apiRequest } from "@/lib/queryClient";
import { useActiveSite } from "@/hooks/useActiveSite";
import { reIdTemplateBlocks } from "@/lib/re-id-template-blocks";
import { useContentLists } from "@/hooks/useContentLists";
import { FilePlus } from "lucide-react";
import type { Page, BlockConfig } from "@shared/schema-types";

interface CreatePageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
}

interface PageFormData {
  title: string;
  slug: string;
  featuredImage?: string;
  featuredImageFile?: File; // File to upload on submit
  allowComments: boolean;
  password?: string;
  parentId?: string;
  menuOrder: number;
  templateId?: string;
}

/**
 * Generates a URL-friendly slug from the title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Modal component for creating new pages.
 * Only handles page creation with page-specific fields from schema.
 */
export function CreatePageModal({
  open,
  onOpenChange,
  initialTitle = "",
}: CreatePageModalProps) {
  const [formData, setFormData] = useState<PageFormData>({
    title: initialTitle,
    slug: "",
    allowComments: true,
    menuOrder: 0,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { activeSiteId } = useActiveSite();
  const { pages, templates } = useContentLists();

  // Update title when initialTitle changes
  useEffect(() => {
    if (initialTitle && !formData.title) {
      setFormData((prev) => {
        const newTitle = initialTitle;
        return {
          ...prev,
          title: newTitle,
          slug: slugManuallyEdited ? prev.slug : generateSlug(newTitle),
        };
      });
    }
  }, [initialTitle, formData.title, slugManuallyEdited]);

  /**
   * Updates form field and auto-generates slug from title if slug hasn't been manually edited
   */
  const handleFieldChange = (
    field: keyof PageFormData,
    value: string | boolean | number | undefined
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug from title if slug hasn't been manually edited
      if (field === "title" && !slugManuallyEdited) {
        updated.slug = generateSlug(value as string);
      }

      return updated;
    });
  };

  /**
   * Handles slug field change and marks it as manually edited
   */
  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    handleFieldChange("slug", value);
  };

  /**
   * Uploads image file and returns the URL
   */
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/media", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to upload image");
    }

    const mediaItem = await response.json();
    return mediaItem.url;
  };

  /**
   * Mutation for creating a new page
   */
  const createMutation = useMutation({
    mutationFn: async (data: PageFormData) => {
      // Upload featured image first if a file is selected
      let featuredImageUrl = data.featuredImage;

      if (data.featuredImageFile) {
        try {
          featuredImageUrl = await uploadImage(data.featuredImageFile);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed to upload featured image: ${errorMessage}`);
        }
      }

      const selectedTemplate = data.templateId
        ? templates.find((template) => template.id === data.templateId)
        : undefined;
      const starterBlocks = selectedTemplate?.blocks
        ? reIdTemplateBlocks(selectedTemplate.blocks as BlockConfig[])
        : [];

      const payload = {
        title: data.title || "Untitled",
        slug: data.slug || generateSlug(data.title) || `untitled-${Date.now()}`,
        status: "draft", // Always draft on creation
        siteId: activeSiteId,
        blocks: starterBlocks,
        allowComments: data.allowComments,
        password: data.password || undefined,
        parentId: data.parentId || undefined,
        menuOrder: data.menuOrder || 0,
        templateId: data.templateId || undefined,
        featuredImage: featuredImageUrl || undefined,
      };

      const response = await apiRequest("POST", "/api/pages", payload);
      return await response.json();
    },
    onSuccess: (newPage: Page) => {
      showSuccessToast("Page created successfully");

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });

      // Navigate to the new page in editor
      setLocation(`/admin/page-builder/page/${newPage.id}?mode=builder`);

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      showErrorToast(resolveCreatePageError(error));
    },
  });

  /**
   * Handles form submission with validation
   */
  const handleSubmit = () => {
    // Validation
    if (!formData.title.trim()) {
      showErrorToast("Please enter a title");
      return;
    }

    // Validate slug format if provided
    const slugToValidate = formData.slug || generateSlug(formData.title);
    if (slugToValidate && !/^[a-z0-9-]+$/.test(slugToValidate)) {
      showErrorToast("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    createMutation.mutate(formData);
  };

  /**
   * Handles Enter key press in form fields
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && formData.title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /**
   * Resets form to initial state
   */
  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      allowComments: true,
      menuOrder: 0,
    });
    setSlugManuallyEdited(false);
  };

  /**
   * Handles image file selection (stores file, doesn't upload yet)
   */
  const handleImageSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select an image file");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showErrorToast(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Create preview URL for display
    const previewUrl = URL.createObjectURL(file);

    setFormData((prev) => ({
      ...prev,
      featuredImage: previewUrl,
      featuredImageFile: file,
    }));
  };

  /**
   * Removes selected image
   */
  const handleImageRemove = (url?: string) => {
    // If url is provided and it's a blob URL, revoke it
    const imageUrl = url || formData.featuredImage;
    if (imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }

    setFormData((prev) => ({
      ...prev,
      featuredImage: undefined,
      featuredImageFile: undefined,
    }));
  };

  /**
   * Handles dialog close with form reset
   */
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Clean up object URL if it exists
      if (formData.featuredImage?.startsWith("blob:")) {
        URL.revokeObjectURL(formData.featuredImage);
      }
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <FilePlus className="w-5 h-5 sm:w-6 sm:h-6" />
            Create New Page
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Create a new page with the page builder. You can start adding
            content immediately after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:gap-6">
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter page title..."
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-npb-text-muted">/page/</span>
              <Input
                id="slug"
                placeholder={generateSlug(formData.title) || "auto-generated"}
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-npb-text-muted">
              Leave empty to auto-generate from title
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="featuredImage">Featured Image</Label>
            <ImageDropzone
              value={formData.featuredImage}
              onChange={(url) => {
                // When image is removed via dropzone (url is undefined)
                if (!url) {
                  handleImageRemove(formData.featuredImage);
                }
              }}
              onFileSelect={handleImageSelect}
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-npb-text-muted">
              Optional: Select an image to use as the featured image (will be
              uploaded when you create the page)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowComments"
              checked={formData.allowComments}
              onCheckedChange={(checked) =>
                handleFieldChange("allowComments", checked === true)
              }
            />
            <Label htmlFor="allowComments" className="cursor-pointer">
              Allow Comments
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password to protect page"
              value={formData.password || ""}
              onChange={(e) => handleFieldChange("password", e.target.value)}
            />
            <p className="text-xs text-npb-text-muted">
              Optional: Password protect this page
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parentId">Parent Page</Label>
            <Select
              value={formData.parentId || "__none__"}
              onValueChange={(value) =>
                handleFieldChange(
                  "parentId",
                  value === "__none__" ? undefined : value
                )
              }
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (Top Level)</SelectItem>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="menuOrder">Menu Order</Label>
            <Input
              id="menuOrder"
              type="number"
              placeholder="0"
              value={formData.menuOrder}
              onChange={(e) =>
                handleFieldChange("menuOrder", parseInt(e.target.value) || 0)
              }
            />
            <p className="text-xs text-npb-text-muted">
              Lower numbers appear first in menus
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="templateId">Template</Label>
            {templates.length > 0 ? (
            <Select
              value={formData.templateId || "__none__"}
              onValueChange={(value) =>
                handleFieldChange(
                  "templateId",
                  value === "__none__" ? undefined : value
                )
              }
            >
              <SelectTrigger id="templateId">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            ) : (
              <p className="text-sm text-npb-text-muted">
                No templates yet. The page will start empty.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || createMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createMutation.isPending ? "Creating..." : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
