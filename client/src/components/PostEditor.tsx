import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Post, NewPost } from '@shared/schema-types';

type PostFormData = Partial<NewPost> & { content?: string; type?: string };

interface PostEditorProps {
  postId?: number;
  type?: 'post' | 'page';
  onSave?: (post: Post) => void;
  onCancel?: () => void;
  noContainer?: boolean;
}

export default function PostEditor({
  postId,
  type = 'post',
  onSave,
  onCancel,
  noContainer = false,
}: PostEditorProps) {
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    status: 'draft',
    type,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing post if editing
  const { data: post, isLoading } = useQuery<Post>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId,
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title ?? '',
        excerpt: post.excerpt ?? '',
        slug: post.slug ?? '',
        status: post.status ?? 'draft',
        type,
      });
    }
  }, [post, type]);

  const saveMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      if (postId) {
        return await apiRequest('PUT', `/api/posts/${postId}`, data);
      } else {
        return await apiRequest('POST', '/api/posts', data);
      }
    },
    onSuccess: async (response) => {
      const savedPost = await response.json();
      toast({
        title: 'Success',
        description: `${type} ${postId ? 'updated' : 'created'} successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      if (postId) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
      }

      onSave?.(savedPost);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ${postId ? 'update' : 'create'} ${type}`,
        variant: 'destructive',
      });
    },
  });

  const handleSave = (status: string) => {
    const dataToSave = { ...formData, status };

    // Auto-generate slug if not provided
    if (!dataToSave.slug && dataToSave.title) {
      dataToSave.slug = dataToSave.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    saveMutation.mutate(dataToSave);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-npb-text-primary">
          {postId ? `Edit ${type}` : `Add New ${type}`}
        </h1>
        <div className="flex space-x-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saveMutation.isPending}>
            Save Draft
          </Button>
          <Button
            className="bg-npb-accent hover:bg-npb-accent-hover"
            onClick={() => handleSave('publish')}
            disabled={saveMutation.isPending}>
            {postId ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Input
                  placeholder={`Enter ${type} title here`}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-lg font-medium border-none shadow-none p-0 focus-visible:ring-0"
                />
              </div>

              <div>
                <Textarea
                  placeholder={`Write your ${type} content here...`}
                  value={formData.content || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="min-h-[400px] border-none shadow-none p-0 focus-visible:ring-0 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Excerpt */}
          <Card>
            <CardHeader>
              <CardTitle>Excerpt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Optional. Add a brief description..."
                value={formData.excerpt || ''}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish */}
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="publish">Published</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Permalink */}
          <Card>
            <CardHeader>
              <CardTitle>Permalink</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="url-slug"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (noContainer) {
    return content;
  }

  return <div className="max-w-4xl mx-auto p-6 space-y-6">{content}</div>;
}
