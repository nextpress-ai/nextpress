import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Check, Trash2, AlertTriangle, MessageCircle, Edit } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Comment } from "@shared/schema-types";

export default function CommentsPage() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get comments query parameters
  const getQueryParams = () => {
    const params: any = { per_page: 20, page };
    if (selectedStatus !== "all") {
      params.status = selectedStatus;
    }
    return params;
  };

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['/api/comments', getQueryParams()],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/comments/${id}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Comment approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve comment",
        variant: "destructive",
      });
    },
  });

  const spamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/comments/${id}/spam`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Comment marked as spam",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark comment as spam",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/comments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/comments/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comments'] });
      setIsEditOpen(false);
      setEditingComment(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleSpam = (id: string) => {
    if (confirm("Are you sure you want to mark this comment as spam?")) {
      spamMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this comment permanently?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingComment) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      content: formData.get('content') as string,
      authorName: formData.get('authorName') as string,
      authorEmail: formData.get('authorEmail') as string,
      status: formData.get('status') as string,
    };

    updateMutation.mutate({ id: editingComment.id, data });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'spam':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Spam</Badge>;
      case 'trash':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Trash</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredComments = (commentsData as any)?.comments?.filter((comment: Comment) =>
    comment.content.toLowerCase().includes(search.toLowerCase()) ||
    comment.authorName?.toLowerCase().includes(search.toLowerCase()) ||
    comment.authorEmail?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminLayout
      title="Comments"
      actions={
        <div className="flex items-center gap-2 text-npb-text-muted">
          <MessageCircle className="h-5 w-5 text-npb-accent" />
          <span className="text-sm">
            {(commentsData as { total?: number })?.total ?? 0} total comments
          </span>
        </div>
      }
    >
          {/* Filters and Search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search comments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Comments</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="trash">Trash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-wp-blue" />
                Manage Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading comments...</div>
              ) : filteredComments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No comments found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Author</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComments.map((comment: Comment) => (
                      <TableRow key={comment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-wp-gray">
                              {comment.authorName || 'Anonymous'}
                            </div>
                            {comment.authorEmail && (
                              <div className="text-sm text-gray-500">
                                {comment.authorEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm line-clamp-3">
                              {comment.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            Post #{comment.postId}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(comment.status || 'pending')}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(comment.createdAt || '').toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(comment.createdAt || '').toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {comment.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleApprove(comment.id)}
                                disabled={approveMutation.isPending}
                                title="Approve Comment"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(comment)}
                              title="Edit Comment"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSpam(comment.id)}
                              disabled={spamMutation.isPending}
                              title="Mark as Spam"
                            >
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(comment.id)}
                              disabled={deleteMutation.isPending}
                              title="Delete Comment"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {(commentsData && (commentsData as any).total_pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, (commentsData as any).total)} of {(commentsData as any).total} comments
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page >= (commentsData as any).total_pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )) as React.ReactNode}
            </CardContent>
          </Card>

      {/* Edit Comment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
          </DialogHeader>
          {editingComment && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="authorName" className="block text-sm font-medium mb-1">
                  Author Name
                </label>
                <Input
                  id="authorName"
                  name="authorName"
                  defaultValue={editingComment.authorName || ''}
                />
              </div>
              <div>
                <label htmlFor="authorEmail" className="block text-sm font-medium mb-1">
                  Author Email
                </label>
                <Input
                  id="authorEmail"
                  name="authorEmail"
                  type="email"
                  defaultValue={editingComment.authorEmail || ''}
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium mb-1">
                  Comment Content
                </label>
                <Textarea
                  id="content"
                  name="content"
                  defaultValue={editingComment.content}
                  rows={4}
                  required
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Status
                </label>
                <Select name="status" defaultValue={editingComment.status || 'pending'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="trash">Trash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}