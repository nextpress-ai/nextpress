import { useQuery } from "@tanstack/react-query";
import type { Post, Template, Theme } from "@shared/schema-types";
import { useActiveSite } from "@/hooks/useActiveSite";

type UseContentListsOptions = {
	blogId?: string | null;
};

type ListEnvelope<T> = {
	pages?: T[];
	posts?: T[];
	templates?: T[];
	siteId?: string | null;
};

type ListKey = "pages" | "posts" | "templates";

type ContentListResponse<T> = T[] | ListEnvelope<T>;

const CONTENT_LIST_PAGE_SIZE = 50;

const normalizeScopedList = <T>(
	data: ContentListResponse<T> | undefined,
	key: ListKey,
	activeSiteId: string,
): T[] => {
	if (!data) return [];
	if (Array.isArray(data)) return data;
	if (data.siteId && data.siteId !== activeSiteId) return [];
	return data[key] ?? [];
};

/**
 * Centralized hook for fetching content lists used in EditorBar
 * Provides data for Pages, Blog Posts, Templates, and Themes menus
 *
 * @param options.blogId - Optional blog ID to filter posts by specific blog
 */
export function useContentLists(options: UseContentListsOptions = {}) {
	const { blogId } = options;
	const {
		activeSiteId,
		isLoading: activeSiteLoading,
		error: activeSiteError,
	} = useActiveSite();

	// Fetch all pages (posts with type='page')
	const {
		data: pages,
		isLoading: pagesLoading,
		error: pagesError,
	} = useQuery<ContentListResponse<Post>, Error, Post[]>({
		queryKey: [
			"/api/pages",
			{ status: "any", per_page: CONTENT_LIST_PAGE_SIZE, siteId: activeSiteId },
		],
		enabled: !!activeSiteId,
		select: (data) => normalizeScopedList(data, "pages", activeSiteId),
	});

	// Fetch posts with optional blog filtering
	const {
		data: posts,
		isLoading: postsLoading,
		error: postsError,
	} = useQuery<ContentListResponse<Post>, Error, Post[]>({
		queryKey: [
			"/api/posts",
			{
				status: "any",
				per_page: CONTENT_LIST_PAGE_SIZE,
				...(blogId ? { blog_id: blogId } : {}),
				siteId: activeSiteId,
			},
		],
		enabled: !!activeSiteId,
		// Normalize API shape and apply client-side filtering if needed
		select: (data) => {
			const list = normalizeScopedList(data, "posts", activeSiteId);
			if (!blogId) return list;
			return list.filter((post) => post.blogId === blogId);
		},
	});

	// Fetch all templates
	const {
		data: templates,
		isLoading: templatesLoading,
		error: templatesError,
	} = useQuery<ContentListResponse<Template>, Error, Template[]>({
		queryKey: ["/api/templates", { siteId: activeSiteId }],
		enabled: !!activeSiteId,
		select: (data) => normalizeScopedList(data, "templates", activeSiteId),
	});

	// Fetch all themes
	const {
		data: themes,
		isLoading: themesLoading,
		error: themesError,
	} = useQuery<Theme[]>({
		queryKey: ["/api/themes"],
	});

	return {
		// Pages data
		pages: pages || [],
		pagesLoading,
		pagesError,

		// Posts data
		posts: posts || [],
		postsLoading,
		postsError,

		// Templates data
		templates: templates || [],
		templatesLoading,
		templatesError,

		// Themes data
		themes: themes || [],
		themesLoading,
		themesError,

		// Combined loading state
		isLoading:
			activeSiteLoading ||
			pagesLoading ||
			postsLoading ||
			templatesLoading ||
			themesLoading,

		// Combined error state
		hasError: !!(
			activeSiteError ||
			pagesError ||
			postsError ||
			templatesError ||
			themesError
		),
		activeSiteLoading,
		activeSiteError,
	};
}
