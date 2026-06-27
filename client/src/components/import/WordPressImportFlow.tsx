import { useState, useCallback, useEffect, useMemo } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Globe, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { appendSiteIdToUrl, formatSiteLabel } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useToast } from "@/hooks/use-toast";
import { WordPressImportLimitationsDialog } from "@/components/import/WordPressImportLimitationsDialog";
import type { Blog } from "@shared/schema-types";
import type {
	FeaturedImageMode,
	WordPressEntity,
	WpDiscoverResult,
	WpImportStatusResponse,
	WpPostPreview,
} from "@shared/import/wordpress/types";

type ImportEntity = Extract<WordPressEntity, "posts" | "pages">;

type BlogsResponse = { blogs: Blog[]; total: number };

type WpListResponse = {
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

const SUPPORTED_ENTITIES: ImportEntity[] = ["posts", "pages"];

const ENTITY_LABELS: Record<ImportEntity, { singular: string; plural: string }> = {
	posts: { singular: "post", plural: "posts" },
	pages: { singular: "page", plural: "pages" },
};

const isEntityImportable = (
	discoverResult: WpDiscoverResult | null,
	entity: ImportEntity,
): boolean => {
	const info = discoverResult?.entities?.[entity];
	return !!info?.supported && !!info?.reachable;
};

const pickDefaultEntity = (discoverResult: WpDiscoverResult): ImportEntity => {
	const postCount = discoverResult.entities.posts?.total ?? 0;
	const pageCount = discoverResult.entities.pages?.total ?? 0;

	if (postCount > 0) return "posts";
	if (pageCount > 0) return "pages";
	if (isEntityImportable(discoverResult, "posts")) return "posts";
	return "pages";
};

export type WordPressImportFlowProps = {
	/** Called when import completes successfully */
	onComplete?: () => void;
	/** Compact layout for dialog */
	compact?: boolean;
};

/**
 * Shared WordPress import UI: discover site → select posts or pages → import.
 */
export function WordPressImportFlow({ onComplete, compact = false }: WordPressImportFlowProps) {
	const { toast } = useToast();
	const { activeSiteId, sites, setActiveSiteId } = useActiveSite();
	const [siteUrl, setSiteUrl] = useState("");
	const [discoverResult, setDiscoverResult] = useState<WpDiscoverResult | null>(null);
	const [entityType, setEntityType] = useState<ImportEntity>("posts");
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [blogId, setBlogId] = useState("");
	const [targetSiteId, setTargetSiteId] = useState(activeSiteId);
	const [featuredImageMode, setFeaturedImageMode] = useState<FeaturedImageMode>("reference");
	const [listPage, setListPage] = useState(1);
	const [lastImportSummary, setLastImportSummary] = useState<ImportResponse | null>(null);

	const { data: blogsData } = useQuery<BlogsResponse>({
		queryKey: ["/api/blogs", { status: "any", siteId: activeSiteId }],
		enabled: !!activeSiteId,
	});

	useEffect(() => {
		if (entityType !== "posts" || !blogsData?.blogs?.length || blogId) return;
		if (blogsData.blogs.length === 1) {
			setBlogId(blogsData.blogs[0].id);
		}
	}, [entityType, blogsData, blogId]);

	useEffect(() => {
		if (activeSiteId) setTargetSiteId(activeSiteId);
	}, [activeSiteId]);

	const siteNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const site of sites) {
			map.set(site.id, formatSiteLabel(site));
		}
		return map;
	}, [sites]);

	const hasMultipleSites = sites.length > 1;

	const discoverMutation = useMutation({
		mutationFn: async (url: string) => {
			const res = await apiRequest("POST", "/api/import/wordpress/discover", { siteUrl: url });
			return (await res.json()) as WpDiscoverResult;
		},
		onSuccess: (data) => {
			setDiscoverResult(data);
			setSelectedIds(new Set());
			setListPage(1);
			setLastImportSummary(null);
			if (!data.ok) return;
			setEntityType(pickDefaultEntity(data));
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
	const importableEntities = SUPPORTED_ENTITIES.filter((entity) =>
		isEntityImportable(discoverResult, entity),
	);
	const showEntityTabs = importableEntities.length > 1;

	const listEndpoint =
		entityType === "posts" ? "/api/import/wordpress/posts" : "/api/import/wordpress/pages";

	const { data: itemsList, isLoading: isLoadingItems } = useQuery<WpListResponse>({
		queryKey: [listEndpoint, baseUrl, listPage],
		queryFn: async () => {
			const res = await apiRequest(
				"GET",
				`${listEndpoint}?baseUrl=${encodeURIComponent(baseUrl)}&page=${listPage}&per_page=20`,
			);
			return res.json();
		},
		enabled: !!discoverResult?.ok && !!baseUrl && isEntityImportable(discoverResult, entityType),
	});

	const { data: importStatus } = useQuery<WpImportStatusResponse>({
		queryKey: ["/api/import/wordpress/status", baseUrl, entityType],
		queryFn: async () => {
			const params = new URLSearchParams({
				baseUrl,
				entity: entityType,
			});
			const res = await apiRequest(
				"GET",
				`/api/import/wordpress/status?${params.toString()}`,
			);
			return res.json();
		},
		enabled: !!discoverResult?.ok && !!baseUrl && isEntityImportable(discoverResult, entityType),
	});

	const getImportedEntry = useCallback(
		(wpId: number) => importStatus?.imported[String(wpId)],
		[importStatus],
	);

	useEffect(() => {
		setSelectedIds(new Set());
		setListPage(1);
	}, [entityType]);

	const importMutation = useMutation({
		mutationFn: async () => {
			if (entityType === "posts") {
				const res = await apiRequest(
				"POST",
				appendSiteIdToUrl("/api/import/wordpress/posts", activeSiteId),
				{
					baseUrl,
					blogId,
					wpIds: Array.from(selectedIds),
					featuredImageMode,
				},
			);
				return (await res.json()) as ImportResponse;
			}

			const res = await apiRequest(
				"POST",
				appendSiteIdToUrl("/api/import/wordpress/pages", targetSiteId),
				{
					baseUrl,
					siteId: targetSiteId,
					wpIds: Array.from(selectedIds),
					featuredImageMode,
				},
			);
			return (await res.json()) as ImportResponse;
		},
		onSuccess: (data) => {
			setLastImportSummary(data);
			queryClient.invalidateQueries({
				queryKey: [entityType === "posts" ? "/api/posts" : "/api/pages"],
			});
			queryClient.invalidateQueries({
				queryKey: ["/api/import/wordpress/status", baseUrl, entityType],
			});
			const updated = data.updated?.length ?? 0;
			const label = ENTITY_LABELS[entityType].plural;
			const hasFailures = data.failed.length > 0;
			toast({
				title: hasFailures ? "Import finished with errors" : "Import complete",
				description: hasFailures
					? `${data.imported.length} imported, ${updated} updated, ${data.failed.length} failed — ${data.failed[0]?.reason ?? "see details below"}`
					: `${data.imported.length} ${label} imported, ${updated} updated, ${data.skipped.length} skipped`,
				variant: hasFailures ? "destructive" : "default",
			});
			if (!hasFailures) onComplete?.();
		},
		onError: () => {
			toast({
				title: "Import failed",
				description: `Could not import selected ${ENTITY_LABELS[entityType].plural}`,
				variant: "destructive",
			});
		},
	});

	const handleDiscover = useCallback(() => {
		if (!siteUrl.trim()) return;
		discoverMutation.mutate(siteUrl.trim());
	}, [siteUrl, discoverMutation]);

	const toggleAll = (checked: boolean) => {
		if (!itemsList?.items) return;
		setSelectedIds(
			checked ? new Set(itemsList.items.map((item) => item.wpId)) : new Set(),
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
		(itemsList?.items?.length ?? 0) > 0 &&
		itemsList?.items?.every((item) => selectedIds.has(item.wpId));

	const canImportPosts = selectedIds.size > 0 && !!blogId && !importMutation.isPending;
	const canImportPages = selectedIds.size > 0 && !!targetSiteId && !importMutation.isPending;
	const canImport = entityType === "posts" ? canImportPosts : canImportPages;

	const hasItemsToShow = (itemsList?.items?.length ?? 0) > 0;
	const itemsLoaded = !!itemsList && !isLoadingItems;
	const entityLabel = ENTITY_LABELS[entityType];
	const postCount = discoverResult?.entities.posts?.total ?? 0;
	const pageCount = discoverResult?.entities.pages?.total ?? 0;
	const alternateEntity: ImportEntity = entityType === "posts" ? "pages" : "posts";
	const alternateCount = entityType === "posts" ? pageCount : postCount;
	const alternateImportable = isEntityImportable(discoverResult, alternateEntity);
	const importedOnPageCount =
		itemsList?.items?.filter((item) => getImportedEntry(item.wpId)).length ?? 0;
	const editorBasePath =
		entityType === "posts" ? "/admin/page-builder/post" : "/admin/page-builder/page";

	return (
		<div className={compact ? "space-y-4" : "space-y-6 max-w-4xl"}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="text-sm text-muted-foreground max-w-xl">
					Connect to a public WordPress site, then import published posts or pages into
					NextPress.
				</p>
				<WordPressImportLimitationsDialog compact={compact} />
			</div>

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
						{discoverResult.siteName ?? "WordPress site connected"}
					</AlertTitle>
					<AlertDescription>
						Choose posts or pages below, then import them into NextPress. Re-importing
						updates content already brought in from this site.
					</AlertDescription>
				</Alert>
			)}

			{discoverResult?.ok && showEntityTabs && (
				<Tabs
					value={entityType}
					onValueChange={(value) => setEntityType(value as ImportEntity)}
				>
					<TabsList>
						{importableEntities.includes("posts") && (
							<TabsTrigger value="posts">
								Posts{postCount > 0 ? ` (${postCount})` : ""}
							</TabsTrigger>
						)}
						{importableEntities.includes("pages") && (
							<TabsTrigger value="pages">
								Pages{pageCount > 0 ? ` (${pageCount})` : ""}
							</TabsTrigger>
						)}
					</TabsList>
				</Tabs>
			)}

			{discoverResult?.ok && itemsLoaded && !hasItemsToShow && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>
						No published {entityLabel.plural} to import
					</AlertTitle>
					<AlertDescription>
						{alternateImportable && alternateCount > 0 ? (
							<>
								This site has {alternateCount} published{" "}
								{ENTITY_LABELS[alternateEntity].plural}, but no {entityLabel.plural}.
								{showEntityTabs ? " Switch tabs to import them." : ""}
							</>
						) : (
							<>
								No public {entityLabel.plural} were found. Publish at least one on
								WordPress, then run Discover again.
							</>
						)}
					</AlertDescription>
				</Alert>
			)}

			{discoverResult?.ok && isLoadingItems && (
				<div className="text-center py-6 text-muted-foreground">
					Loading {entityLabel.plural}…
				</div>
			)}

			{discoverResult?.ok && hasItemsToShow && (
				<>
					{importedOnPageCount > 0 && (
						<p className="text-sm text-muted-foreground">
							<span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
								<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
								{importedOnPageCount} on this page already in NextPress
							</span>
							{" · "}
							Re-importing updates existing content from this WordPress site.
						</p>
					)}

					<div className="border rounded-md">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">
										<Checkbox
											checked={allSelected}
											onCheckedChange={(v) => toggleAll(!!v)}
											aria-label={`Select all ${entityLabel.plural}`}
										/>
									</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>WP status</TableHead>
									<TableHead>NextPress</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{itemsList?.items?.map((item) => {
									const imported = getImportedEntry(item.wpId);
									return (
										<TableRow
											key={item.wpId}
											className={cn(
												imported &&
													"bg-emerald-50/60 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500",
											)}
										>
											<TableCell>
												<Checkbox
													checked={selectedIds.has(item.wpId)}
													onCheckedChange={(v) => toggleOne(item.wpId, !!v)}
													aria-label={`Select ${item.title}`}
												/>
											</TableCell>
											<TableCell className="font-medium">
												<div className="flex flex-wrap items-center gap-2">
													<span>{item.title}</span>
													{imported && (
														<Badge
															variant="outline"
															className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
														>
															<CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
															Imported
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="secondary">{item.status}</Badge>
											</TableCell>
											<TableCell>
												{imported ? (
													<Link
														href={`${editorBasePath}/${imported.nextpressId}`}
														className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
													>
														Open
														<ExternalLink className="h-3 w-3" aria-hidden />
													</Link>
												) : (
													<span className="text-sm text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{new Date(item.date).toLocaleDateString()}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{(itemsList?.total_pages ?? 0) > 1 && (
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
								Page {listPage} of {itemsList?.total_pages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={listPage >= (itemsList?.total_pages ?? 1)}
								onClick={() => setListPage((p) => p + 1)}
							>
								Next
							</Button>
						</div>
					)}

					<div className="grid gap-4 sm:grid-cols-2">
						{entityType === "posts" ? (
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
												{hasMultipleSites && blog.siteId
													? ` · ${siteNameById.get(blog.siteId) ?? ""}`
													: ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : (
							<div className="space-y-2">
								<Label>Target site</Label>
								<Select
									value={targetSiteId}
									onValueChange={(value) => {
										setTargetSiteId(value);
										setActiveSiteId(value);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a site" />
									</SelectTrigger>
									<SelectContent>
										{sites.map((site) => (
											<SelectItem key={site.id} value={site.id}>
												{formatSiteLabel(site)}
												{site.isDefault ? " (default)" : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Pages are imported into the selected NextPress site. Re-importing
									updates matching pages from this WordPress site.
								</p>
								{sites.length === 0 && (
									<p className="text-sm text-destructive">
										No sites available. Complete setup or ask an admin for site access.
									</p>
								)}
							</div>
						)}
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
							`Import ${selectedIds.size} ${selectedIds.size === 1 ? entityLabel.singular : entityLabel.plural}`
						)}
					</Button>

					{lastImportSummary && lastImportSummary.failed.length > 0 && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>
								{lastImportSummary.failed.length} item
								{lastImportSummary.failed.length === 1 ? "" : "s"} failed
							</AlertTitle>
							<AlertDescription>
								<ul className="mt-2 list-disc space-y-1 pl-4">
									{lastImportSummary.failed.map((item) => (
										<li key={item.wpId}>
											WP #{item.wpId}: {item.reason}
										</li>
									))}
								</ul>
							</AlertDescription>
						</Alert>
					)}
				</>
			)}
		</div>
	);
}
