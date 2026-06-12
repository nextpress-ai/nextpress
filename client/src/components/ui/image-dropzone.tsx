import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isImageFile } from '@/lib/is-image-asset';

interface ImageDropzoneProps {
  value?: string; // Image URL
  onChange?: (url: string | undefined) => void; // Called with URL after upload (if onUpload provided)
  onUpload?: (file: File) => Promise<string>; // Optional custom upload handler - if provided, uploads immediately
  onFileSelect?: (file: File) => void; // Called with file when selected (for deferred upload)
  disabled?: boolean;
  className?: string;
  maxSize?: number; // Max file size in bytes (default: 10MB)
  accept?: string; // Accepted file types (default: image/*)
}

/**
 * Image dropzone component with drag-and-drop support.
 * Handles file upload and displays preview.
 */
export function ImageDropzone({
  value,
  onChange,
  onUpload,
  onFileSelect,
  disabled = false,
  className,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept = 'image/*',
}: ImageDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file upload to backend
   */
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (onUpload) {
      return await onUpload(file);
    }

    // Default upload handler using /api/media endpoint
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/media', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to upload image');
    }

    const mediaItem = await response.json();
    return mediaItem.url;
  }, [onUpload]);

  /**
   * Validates and processes selected file
   */
  const handleFile = useCallback(async (file: File) => {
    // Validate file type (SVG often reports empty type; rely on extension)
    if (!isImageFile(file)) {
      throw new Error('Please select an image file');
    }

    // Validate file size
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // If onFileSelect is provided, create preview URL and call both callbacks
    if (onFileSelect) {
      const previewUrl = URL.createObjectURL(file);
      onChange?.(previewUrl); // Show preview
      onFileSelect(file); // Notify parent about file selection
      return;
    }

    // Otherwise, upload immediately
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange?.(url);
    } catch (error: any) {
      throw error; // Re-throw to be handled by caller
    } finally {
      setUploading(false);
    }
  }, [maxSize, uploadFile, onChange, onFileSelect]);

  /**
   * Handles file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleFile(firstFile).catch((error) => {
        console.error('Upload error:', error);
      });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  /**
   * Handles drag and drop events
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleFile(firstFile).catch((error) => {
        console.error('Upload error:', error);
      });
    }
  }, [disabled, uploading, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  /**
   * Removes the selected image
   */
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
  }, [onChange]);

  // Show preview if image URL is available
  if (value) {
    return (
      <div className={cn('relative group', className)}>
        <div className="relative h-48 w-full overflow-hidden rounded-[var(--npb-radius-surface)] border-2 border-npb-border-default bg-npb-surface-inset">
          <img
            src={value}
            alt="Featured image preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Change Image'}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>
    );
  }

  // Show dropzone when no image is selected
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          dragActive && 'border-npb-accent bg-npb-accent/10',
          !dragActive && 'border-npb-border-strong hover:border-npb-border-default',
          disabled && 'opacity-50 cursor-not-allowed',
          uploading && 'opacity-50 cursor-wait'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />
        {uploading ? (
          <>
            <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-npb-accent"></div>
            </div>
            <p className="text-lg font-medium mb-2">Uploading...</p>
          </>
        ) : (
          <>
            <ImageIcon
              className={cn(
                'mx-auto w-12 h-12 mb-4',
                dragActive ? 'text-npb-accent' : 'text-npb-text-muted'
              )}
            />
            <p className="text-lg font-medium mb-2">
              {dragActive ? 'Drop image here' : 'Drag & drop image here'}
            </p>
            <p className="mb-4 text-npb-text-muted">or</p>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || uploading}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Image
            </Button>
          </>
        )}
        <p className="mt-4 text-xs text-npb-text-muted">
          Supported: JPG, PNG, GIF, WebP, SVG (Max {Math.round(maxSize / 1024 / 1024)}MB)
        </p>
      </div>
    </div>
  );
}

