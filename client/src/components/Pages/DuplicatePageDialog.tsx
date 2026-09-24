import { useState, type JSX } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Copy } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { pageEditorPath } from "@/lib/admin-content-routes";
import { resolveDuplicatePageError, showErrorToast, showSuccessToast } from "@/lib/sonner-toast";
import type { Page } from "@shared/schema-types";

type DuplicatePageDialogProps = {
	page: Pick<Page, "id" | "title"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Suggested name for a copy so the person can keep it or change it. */
export function copyPageTitle(title: string): string {
	const trimmed = title.trim() || "Untitled";
	return `Copy of ${trimmed}`;
}

function DuplicatePageForm({
	page,
	onClose,
}: {
	page: Pick<Page, "id" | "title">;
	onClose: () => void;
}): JSX.Element {
	const [title, setTitle] = useState(() => copyPageTitle(page.title));
	const [, setLocation] = useLocation();
	const queryClient = useQueryClient();

	const duplicateMutation = useMutation({
		mutationFn: async (nextTitle: string) => {
			const response = await apiRequest("POST", `/api/pages/${page.id}/duplicate`, {
				title: nextTitle,
			});
			return (await response.json()) as Page;
		},
		onSuccess: (created) => {
			showSuccessToast("Page duplicated");
			queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
			onClose();
			if (!created.id) return;
			setLocation(`${pageEditorPath(created.id)}?mode=builder`);
		},
		onError: (error: unknown) => {
			showErrorToast(resolveDuplicatePageError(error));
		},
	});

	const submit = (): void => {
		const nextTitle = title.trim();
		if (!nextTitle) {
			showErrorToast("Please enter a name");
			return;
		}
		duplicateMutation.mutate(nextTitle);
	};

	return (
		<DialogContent
			className="max-w-md"
			showCloseButton={!duplicateMutation.isPending}
			onPointerDownOutside={(event) => {
				if (duplicateMutation.isPending) event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				if (duplicateMutation.isPending) event.preventDefault();
			}}
		>
			<form
				className="contents"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Copy className="h-5 w-5" />
						Duplicate page
					</DialogTitle>
					<DialogDescription>
						The copy starts as a draft. You can change the name before it is created.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 py-2">
					<Label htmlFor="duplicate-page-title">
						Name <span className="text-red-500">*</span>
					</Label>
					<Input
						id="duplicate-page-title"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						autoFocus
						disabled={duplicateMutation.isPending}
					/>
					<p className="text-xs text-npb-text-muted">
						The copy uses this name. The URL is made from it.
					</p>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={duplicateMutation.isPending}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={!title.trim() || duplicateMutation.isPending}
						title={!title.trim() ? "Enter a name to duplicate" : undefined}
					>
						{duplicateMutation.isPending
							? "Duplicating..."
							: !title.trim()
								? "Enter a name"
								: "Duplicate"}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

/**
 * Name popup for copying a page. Mounts a fresh form each time so the suggested name is current.
 */
export function DuplicatePageDialog({ page, open, onOpenChange }: DuplicatePageDialogProps): JSX.Element {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{page && open ? (
				<DuplicatePageForm key={page.id} page={page} onClose={() => onOpenChange(false)} />
			) : null}
		</Dialog>
	);
}
