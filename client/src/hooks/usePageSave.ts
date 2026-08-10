import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { BlockConfig, Page, Post } from "@shared/schema-types";
import { VERSION_STALE } from "@shared/content-version";
import { savePageDraft } from "@/lib/pageDraftStorage";
import { saveEditorBlocks } from "@/lib/save-editor-blocks";

type SaveContentType = "page" | "post";

function getEntityLabel(isTemplate: boolean, contentType: SaveContentType) {
	if (isTemplate) return "Template";
	return contentType === "post" ? "Post" : "Page";
}

export function usePageSave({
	isTemplate,
	data,
	onSave,
	pageMeta,
	contentType = "page",
}: {
	isTemplate: boolean;
	data: Page | Post | undefined;
	onSave?: (updatedData: Page | Post) => void;
	pageMeta?: {
		title?: string;
		slug?: string;
		status?: string;
		version?: number;
		other?: Record<string, unknown>;
	};
	contentType?: SaveContentType;
}) {
	const toast = useToast();
	const queryClient = useQueryClient();

	const saveMutation = useMutation({
		mutationFn: async (builderData: BlockConfig[]) => {
			if (!data) return null;

			return saveEditorBlocks({
				contentType,
				id: data.id,
				expectedVersion: pageMeta?.version,
				title: pageMeta?.title ?? data.title,
				slug: pageMeta?.slug ?? data.slug,
				status: pageMeta?.status ?? data.status ?? "draft",
				blocks: builderData,
				other: pageMeta?.other,
			});
		},
		onSuccess: (updatedData) => {
			const isPage = !isTemplate && contentType === "page";
			if (isPage && updatedData?.id) {
				savePageDraft(updatedData.id, updatedData as Page);
			}

			toast.toast({
				title: "Success",
				description: `${getEntityLabel(isTemplate, contentType)} saved successfully`,
			});
			onSave?.(updatedData as Page | Post);

			if (isTemplate) {
				queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
				queryClient.invalidateQueries({ queryKey: [`/api/templates/${data?.id}`] });
			} else if (isPage) {
				queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
				queryClient.invalidateQueries({ queryKey: [`/api/pages/${data?.id}`] });
			} else {
				queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
				queryClient.invalidateQueries({ queryKey: [`/api/posts/${data?.id}`] });
			}
		},
		onError: (error: Error & { code?: string }) => {
			if (error.code === VERSION_STALE) {
				const label = contentType === "post" ? "Post" : "Page";
				toast.toast({
					title: `${label} changed elsewhere`,
					description: "Reload and try again before saving.",
					variant: "destructive",
				});
				return;
			}
			toast.toast({
				title: "Error",
				description: `Failed to save ${getEntityLabel(isTemplate, contentType).toLowerCase()}`,
				variant: "destructive",
			});
		},
	});

	return saveMutation;
}
