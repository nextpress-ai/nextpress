import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Globe, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Blog } from "@shared/schema-types";
import type { FeaturedImageMode, WpDiscoverResult, WpPostPreview } from "@shared/import/wordpress/types";

type BlogsResponse = { blogs: Blog[]; total: number };

type WpPostsListResponse = {
	items: WpPostPreview[];
	total: number;
	page: number;
	per_page: number;
	total_pages: number;
};

type ImportResponse = {
	imported: Array<{ wpId: number; postId: string; title: string; status: "imported" }>;
	updated?: Array<{ wpId: number; postId: string; title: string; status: "updated" }>;
	skipped: Array<{ wpId: number; reason: string; status: "skipped" }>;
	failed: Array<{ wpId: number; reason: string; status: "failed" }>;
};

export type WordPressImportFlowProps = {
	/** Called when import completes successfully */
	onComplete?: () => void;
	/** Compact layout for dialog */
	compact?: boolean;
};

/**
 * Shared WordPress import UI: discover site → select posts → choose blog + image mode → import.
 */
export function WordPressImportFlow({ onComplete, compact = false }: WordPressImportFlowProps) {
	const { toast } = useToast();
	const [siteUrl, setSiteUrl] = useState("");
	const [discoverResult, setDiscoverResult] = useState<WpDiscoverResult | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [blogId, setBlogId] = useState("");
	const [featuredImageMode, setFeaturedImageMode] = useState<FeaturedImageMode>("reference");
	const [listPage, setListPage] = useState(1);

	const { data: blogsData } = useQuery<BlogsResponse>({
		queryKey: ["/api/blogs", { status: "any" }],
	});

	const discoverMutation = useMutation({
		mutationFn: async (url: string) => {
			const res = await apiRequest("POST", "/api/import/wordpress/discover", { siteUrl: url });
			return (await res.json()) as WpDiscoverResult;
		},
		onSuccess: (data) => {
			setDiscoverResult(data);
			setSelectedIds(new Set());
			setListPage(1);
			if (!data.ok) return;
			toast({ title: "Site found", description: data.siteName ?? data.baseUrl });
		},
		onError: () => {
			toast({
				title: "Discovery failed",
				description: "Could not reach the import service",
				variant: "destructive",
			});
		},
	});

	const baseUrl = discoverResult?.baseUrl ?? "";

	const { data: postsList, isLoading: isLoadingPosts } = useQuery<WpPostsListResponse>({
		queryKey: ["/api/import/wordpress/posts", baseUrl, listPage],
		queryFn: async () => {
			const res = await apiRequest(
				"GET",
				`/api/import/wordpress/posts?baseUrl=${encodeURIComponent(baseUrl)}&page=${listPage}&per_page=20`,
			);
			return res.json();
		},
		enabled: !!discoverResult?.ok && !!baseUrl,
	});

	const importMutation = useMutation({
		mutationFn: async () => {
			const res = await apiRequest("POST", "/api/import/wordpress/posts", {
				baseUrl,
				blogId,
				wpIds: Array.from(selectedIds),
				featuredImageMode,
			});
			return (await res.json()) as ImportResponse;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
			const updated = data.updated?.length ?? 0;
			toast({
				title: "Import complete",
				description: `${data.imported.length} imported, ${updated} updated, ${data.skipped.length} skipped, ${data.failed.length} failed`,
			});
			onComplete?.();
		},
		onError: () => {
			toast({
				title: "Import failed",
				description: "Could not import selected posts",
				variant: "destructive",
			});
		},
	});

	const handleDiscover = useCallback(() => {
		if (!siteUrl.trim()) return;
		discoverMutation.mutate(siteUrl.trim());
	}, [siteUrl, discoverMutation]);

	const toggleAll = (checked: boolean) => {
		if (!postsList?.items) return;
		setSelectedIds(
			checked ? new Set(postsList.items.map((item) => item.wpId)) : new Set(),
		);
	};

	const toggleOne = (wpId: number, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(wpId);
			else next.delete(wpId);
			return next;
		});
	};

	const allSelected =
		(postsList?.items?.length ?? 0) > 0 &&
		postsList?.items?.every((item) => selectedIds.has(item.wpId));

	const canImport = selectedIds.size > 0 && !!blogId && !importMutation.isPending;

	return (
		<div className={compact ? "space-y-4" : "space-y-6 max-w-4xl"}>
			{/* Step 1: Domain */}
			<div className="space-y-2">
				<Label htmlFor="wp-site-url">WordPress site URL</Label>
				<div className="flex gap-2">
					<Input
						id="wp-site-url"
						placeholder="example.com or https://example.com"
						value={siteUrl}
						onChange={(e) => setSiteUrl(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
					/>
					<Button
						onClick={handleDiscover}
						disabled={discoverMutation.isPending || !siteUrl.trim()}
					>
						{discoverMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Globe className="h-4 w-4" />
						)}
						<span className="ml-2">Discover</span>
					</Button>
				</div>
			</div>

			{discoverResult && !discoverResult.ok && discoverResult.error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{discoverResult.error.message}</AlertTitle>
					<AlertDescription>{discoverResult.error.hint}</AlertDescription>
				</Alert>
			)}

			{discoverResult?.ok && (
				<Alert>
					<CheckCircle2 className="h-4 w-4" />
					<AlertTitle>
						{discoverResult.siteName ?? "WordPress site"} —{" "}
						{discoverResult.entities.posts?.total ?? 0} posts
						{(discoverResult.entities.pages?.total ?? 0) > 0 &&
							`, ${discoverResult.entities.pages?.total} pages`}
					</AlertTitle>
					<AlertDescription>
						Select posts to import. Re-importing updates existing posts from the same site.
						Pages import is available via API (<code className="text-xs">POST /api/import/wordpress/pages</code>).
					</AlertDescription>
				</Alert>
			)}

			{discoverResult?.ok && (
				<>
					{/* Entity tabs stub */}
					<div className="flex gap-2 border-b pb-2">
						<Badge>Posts</Badge>
						<Badge variant="outline">
							Pages ({discoverResult.entities.pages?.total ?? 0}) — API
						</Badge>
						<Badge variant="outline" className="opacity-50">Media (soon)</Badge>
					</div>

					{/* Post picker */}
					{isLoadingPosts ? (
						<div className="text-center py-6 text-muted-foreground">Loading posts…</div>
					) : (
						<div className="border rounded-md">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-10">
											<Checkbox
												checked={allSelected}
												onCheckedChange={(v) => toggleAll(!!v)}
												aria-label="Select all posts"
											/>
										</TableHead>
										<TableHead>Title</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{postsList?.items?.map((item) => (
										<TableRow key={item.wpId}>
											<TableCell>
												<Checkbox
													checked={selectedIds.has(item.wpId)}
													onCheckedChange={(v) => toggleOne(item.wpId, !!v)}
													aria-label={`Select ${item.title}`}
												/>
											</TableCell>
											<TableCell className="font-medium">{item.title}</TableCell>
											<TableCell>
												<Badge variant="secondary">{item.status}</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{new Date(item.date).toLocaleDateString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					{(postsList?.total_pages ?? 0) > 1 && (
						<div className="flex justify-between items-center">
							<Button
								variant="outline"
								size="sm"
								disabled={listPage <= 1}
								onClick={() => setListPage((p) => p - 1)}
							>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {listPage} of {postsList?.total_pages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={listPage >= (postsList?.total_pages ?? 1)}
								onClick={() => setListPage((p) => p + 1)}
							>
								Next
							</Button>
						</div>
					)}

					{/* Import options */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Target blog</Label>
							<Select value={blogId} onValueChange={setBlogId}>
								<SelectTrigger>
									<SelectValue placeholder="Select a blog" />
								</SelectTrigger>
								<SelectContent>
									{blogsData?.blogs?.map((blog) => (
										<SelectItem key={blog.id} value={blog.id}>
											{blog.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Featured images</Label>
							<Select
								value={featuredImageMode}
								onValueChange={(v) => setFeaturedImageMode(v as FeaturedImageMode)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="reference">Reference external URL</SelectItem>
									<SelectItem value="copy">Copy to media library</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<Button
						className="bg-wp-blue hover:bg-wp-blue-dark text-white"
						disabled={!canImport}
						onClick={() => importMutation.mutate()}
					>
						{importMutation.isPending ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Importing…
							</>
						) : (
							`Import ${selectedIds.size} post${selectedIds.size === 1 ? "" : "s"}`
						)}
					</Button>
				</>
			)}
		</div>
	);
}
