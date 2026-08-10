import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, Pencil, Copy, Layout } from "lucide-react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminListPaginationFooter } from "@/components/admin/admin-list-pagination-footer";
import { useAdminListPagination } from "@/hooks/use-admin-list-pagination";
import { TemplateModal } from "@/components/Templates";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema-types";

interface TemplatesApiResponse {
  templates: Template[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: templatesData, isLoading } = useQuery<TemplatesApiResponse>({
    queryKey: ['/api/templates', { type: typeFilter !== 'all' ? typeFilter : undefined, page, per_page: 10 }],
  });

  const visiblePage = useAdminListPagination({
    activeSiteId: typeFilter,
    page,
    setPage,
    totalPages: templatesData?.total_pages,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest('POST', `/api/templates/${id}/duplicate`, { name });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleEdit = (template: Template) => {
    setTemplateToEdit(template);
    setEditModalOpen(true);
  };

  const handleEditInBuilder = (template: Template) => {
    setLocation(`/admin/page-builder/template/${template.id}`);
  };

  const handleDuplicate = (template: Template) => {
    duplicateMutation.mutate({
      id: template.id,
      name: `Copy of ${template.name}`,
    });
  };

  const handleNewTemplate = () => {
    setCreateModalOpen(true);
  };

  const handleEditModalClose = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      setTemplateToEdit(undefined);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      header: "default",
      footer: "secondary",
      page: "outline",
      post: "default",
      popup: "destructive",
    };
    return <Badge variant={variants[type] || "secondary"}>{type}</Badge>;
  };

  const filteredTemplates = templatesData?.templates?.filter((template: Template) =>
    template.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminLayout
      title="Templates"
      actions={
        <Button
          className="npb-btn-accent"
          onClick={handleNewTemplate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Template
        </Button>
      }
    >
          <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Templates</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-npb-text-muted w-4 h-4" />
                    <Input
                      placeholder="Search templates..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="page">Page</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-npb-text-muted">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-npb-text-muted">
                  No templates found. <Button variant="link" onClick={handleNewTemplate}>Create your first template</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template: Template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="font-medium text-npb-text-primary">
                            {template.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(template.type)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-npb-text-muted max-w-xs truncate">
                            {template.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}</div>
                            <div className="text-npb-text-muted">
                              {template.createdAt ? new Date(template.createdAt).toLocaleTimeString() : 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditInBuilder(template)}
                              title="Edit in builder"
                            >
                              <Layout className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(template)}
                              title="Edit template"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDuplicate(template)}
                              disabled={duplicateMutation.isPending}
                              title="Duplicate template"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              disabled={deleteMutation.isPending}
                              title="Delete template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {templatesData ? (
                <AdminListPaginationFooter
                  page={visiblePage}
                  perPage={10}
                  total={templatesData.total}
                  totalPages={templatesData.total_pages}
                  itemLabel="templates"
                  onPageChange={setPage}
                />
              ) : null}
            </CardContent>
          </Card>

      {/* Create Template Modal */}
      <TemplateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {/* Edit Template Modal */}
      <TemplateModal
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
        initialData={templateToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setTemplateToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
