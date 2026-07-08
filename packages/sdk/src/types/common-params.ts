/** Single resource lookup by UUID. */
export type ResourceIdParams = {
	id: string;
};

/** Page version restore input. */
export type RestorePageVersionParams = ResourceIdParams & {
	version: number;
};

/** Preview share token mint input. */
export type PreviewContentType = "page" | "post" | "template";

export type CreatePreviewShareTokenInput = {
	contentType: PreviewContentType;
	contentId: string;
	expiresInSeconds?: number;
	siteId?: string;
};

export type PreviewShareUrlParams = {
	contentType: PreviewContentType;
	contentId: string;
	token: string;
};

export type PreviewSharedContentParams = PreviewShareUrlParams;

export type PublicSlugParams = {
	slug: string;
};

export type VerifyDomainParams = {
	q: string;
};

export type EditorSessionOptions = {
	coalesceMs?: number;
};

export type EditorLoadParams = {
	type: PreviewContentType;
	id: string;
};

export type EditorSaveParams = {
	title?: string;
	slug?: string;
	status?: string;
};

export type EditorPreviewLinkParams = {
	expiresInSeconds?: number;
};
