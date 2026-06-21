import type { ImportContext, MappedPost, WpPostRaw } from "./types";
import { mapWpPost } from "./map-wp-post";
import type { NewPage } from "../../schema-types";

export type MappedPage = Omit<NewPage, "id" | "createdAt" | "updatedAt">;

/**
 * Maps a WordPress REST page into a NextPress page insert/update payload.
 * Reuses post HTML→blocks parsing; pages omit blogId and use siteId instead.
 */
export const mapWpPage = async (params: {
	raw: WpPostRaw;
	ctx: Omit<ImportContext, "blogId"> & { siteId: string };
}): Promise<MappedPage> => {
	const mapped = await mapWpPost({
		raw: params.raw,
		ctx: {
			...params.ctx,
			blogId: params.ctx.siteId,
		},
	});

	const { blogId: _blog, settings: _settings, ...rest } = mapped;
	return {
		...rest,
		siteId: params.ctx.siteId,
		menuOrder: 0,
		version: 0,
		history: [],
	};
};
