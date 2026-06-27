import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Globe, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest } from "@/lib/queryClient";
import { useActiveSite, type ActiveSiteItem } from "@/hooks/useActiveSite";
import { useToast } from "@/hooks/use-toast";

type SitesResponse = {
	sites: ActiveSiteItem[];
	total: number;
};

type SiteFormState = {
	name: string;
	siteUrl: string;
	description: string;
};

const emptyForm: SiteFormState = {
	name: "",
	siteUrl: "",
	description: "",
};

/**
 * Admin page for creating and managing multi-site installs.
 */
export default function Sites() {
	const { sites, activeSiteId, setActiveSiteId, formatSiteLabel: formatLabel } = useActiveSite();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingSite, setEditingSite] = useState<ActiveSiteItem | null>(null);
	const [form, setForm] = useState<SiteFormState>(emptyForm);

	const { isLoading } = useQuery<SitesResponse>({
		queryKey: ["/api/sites"],
	});

	const resetForm = () => {
		setForm(emptyForm);
		setEditingSite(null);
	};

	const createMutation = useMutation({
		mutationFn: async (payload: SiteFormState) => {
			const response = await apiRequest("POST", "/api/sites", {
				name: payload.name.trim(),
				siteUrl: payload.siteUrl.trim() || null,
				description: payload.description.trim() || null,
			});
			return response.json() as Promise<{ site: ActiveSiteItem }>;
		},
		onSuccess: ({ site }) => {
			toast({ title: "Site created", description: `"${formatLabel(site)}" is ready` });
			queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
			setActiveSiteId(site.id);
			setIsCreateOpen(false);
			resetForm();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to create site",
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (params: { id: string; data: Partial<SiteFormState & { isDefault: boolean }> }) => {
			const response = await apiRequest("PATCH", `/api/sites/${params.id}`, {
				...(params.data.name !== undefined ? { name: params.data.name.trim() } : {}),
				...(params.data.siteUrl !== undefined
					? { siteUrl: params.data.siteUrl.trim() || null }
					: {}),
				...(params.data.description !== undefined
					? { description: params.data.description.trim() || null }
					: {}),
				...(params.data.isDefault !== undefined ? { isDefault: params.data.isDefault } : {}),
			});
			return response.json() as Promise<{ site: ActiveSiteItem }>;
		},
		onSuccess: () => {
			toast({ title: "Site updated" });
			queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
			setEditingSite(null);
			resetForm();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to update site",
				variant: "destructive",
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (siteId: string) => apiRequest("DELETE", `/api/sites/${siteId}`),
		onSuccess: () => {
			toast({ title: "Site deleted" });
			queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to delete site",
				variant: "destructive",
			});
		},
	});

	const openCreate = () => {
		resetForm();
		setIsCreateOpen(true);
	};

	const openEdit = (site: ActiveSiteItem) => {
		setEditingSite(site);
		setForm({
			name: site.name ?? "",
			siteUrl: site.siteUrl ?? "",
			description: "",
		});
	};

	const handleSaveEdit = () => {
		if (!editingSite || !form.name.trim()) return;
		updateMutation.mutate({
			id: editingSite.id,
			data: form,
		});
	};

	const handleSetDefault = (site: ActiveSiteItem) => {
		updateMutation.mutate({ id: site.id, data: { isDefault: true } });
	};

	const handleDelete = (site: ActiveSiteItem) => {
		if (site.isDefault) return;
		if (!window.confirm(`Delete "${formatLabel(site)}"? This cannot be undone.`)) return;
		deleteMutation.mutate(site.id);
	};

	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<AdminLayout title="Sites">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<p className="text-sm text-npb-text-muted">
						Manage sites in this install. Each site has its own pages, settings, and optional domain.
					</p>
					<Button onClick={openCreate}>
						<Plus className="mr-2 h-4 w-4" />
						Add Site
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Globe className="h-4 w-4" />
							All Sites
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex items-center gap-2 py-8 text-sm text-npb-text-muted">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading sites...
							</div>
						) : sites.length === 0 ? (
							<p className="py-8 text-sm text-npb-text-muted">No sites found.</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Domain</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sites.map((site) => (
										<TableRow key={site.id}>
											<TableCell className="font-medium">{formatLabel(site)}</TableCell>
											<TableCell className="text-npb-text-muted">
												{site.siteUrl || "—"}
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-2">
													{site.isDefault && <Badge variant="secondary">Default</Badge>}
													{site.id === activeSiteId && (
														<Badge variant="outline">Active in admin</Badge>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setActiveSiteId(site.id)}
													>
														Switch
													</Button>
													<Button variant="outline" size="sm" onClick={() => openEdit(site)}>
														Edit
													</Button>
													{!site.isDefault && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleSetDefault(site)}
															disabled={updateMutation.isPending}
														>
															<Star className="mr-1 h-3 w-3" />
															Default
														</Button>
													)}
													{!site.isDefault && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleDelete(site)}
															disabled={deleteMutation.isPending}
														>
															<Trash2 className="h-3 w-3 text-destructive" />
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Site</DialogTitle>
						<DialogDescription>
							Add a new site. You can assign a domain later in Settings.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor="create-site-name">Name</Label>
							<Input
								id="create-site-name"
								value={form.name}
								onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
								placeholder="Marketing Site"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-site-url">Domain (optional)</Label>
							<Input
								id="create-site-url"
								value={form.siteUrl}
								onChange={(event) => setForm((current) => ({ ...current, siteUrl: event.target.value }))}
								placeholder="https://marketing.example.com"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-site-desc">Description (optional)</Label>
							<Textarea
								id="create-site-desc"
								value={form.description}
								onChange={(event) =>
									setForm((current) => ({ ...current, description: event.target.value }))
								}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => createMutation.mutate(form)}
							disabled={!form.name.trim() || isSaving}
						>
							{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Site
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={Boolean(editingSite)} onOpenChange={(open) => !open && setEditingSite(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Site</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor="edit-site-name">Name</Label>
							<Input
								id="edit-site-name"
								value={form.name}
								onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-site-url">Domain</Label>
							<Input
								id="edit-site-url"
								value={form.siteUrl}
								onChange={(event) => setForm((current) => ({ ...current, siteUrl: event.target.value }))}
								placeholder="https://example.com"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingSite(null)}>
							Cancel
						</Button>
						<Button onClick={handleSaveEdit} disabled={!form.name.trim() || isSaving}>
							{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AdminLayout>
	);
}
