import { useState, type JSX } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { resolvePluginError, showErrorToast, showSuccessToast } from "@/lib/sonner-toast";
import {
	PLUGIN_RUNS_WHEN,
	PLUGIN_RUNS_WHEN_LABELS,
	type PluginRunsWhen,
} from "@shared/plugin-record";
import type { Plugin } from "@shared/schema-types";

type AddPluginDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type PluginFormState = {
	name: string;
	description: string;
	version: string;
	runsWhen: PluginRunsWhen;
};

const emptyForm: PluginFormState = {
	name: "",
	description: "",
	version: "1.0.0",
	runsWhen: "rendering",
};

function AddPluginForm({ onClose }: { onClose: () => void }): JSX.Element {
	const [form, setForm] = useState<PluginFormState>(emptyForm);
	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: async (payload: PluginFormState) => {
			const response = await apiRequest("POST", "/api/plugins", {
				name: payload.name.trim(),
				description: payload.description.trim() || undefined,
				version: payload.version.trim() || "1.0.0",
				runsWhen: payload.runsWhen,
			});
			return (await response.json()) as Plugin;
		},
		onSuccess: (created) => {
			showSuccessToast(`${created.name} was added. It is off until you turn it on.`);
			queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
			onClose();
		},
		onError: (error: unknown) => {
			showErrorToast(resolvePluginError(error));
		},
	});

	const submit = (): void => {
		if (!form.name.trim()) {
			showErrorToast("Please enter a name");
			return;
		}
		createMutation.mutate(form);
	};

	return (
		<DialogContent
			className="max-w-md"
			showCloseButton={!createMutation.isPending}
			onPointerDownOutside={(event) => {
				if (createMutation.isPending) event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				if (createMutation.isPending) event.preventDefault();
			}}
		>
			<form
				className="contents"
				aria-busy={createMutation.isPending || undefined}
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Plug className="h-5 w-5" />
						Add plugin
					</DialogTitle>
					<DialogDescription>
						The plugin starts off. Turn it on from the list.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 py-2">
					<div className="grid gap-2">
						<Label htmlFor="plugin-name">
							Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="plugin-name"
							value={form.name}
							onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
							autoFocus
							disabled={createMutation.isPending}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="plugin-description">Description</Label>
						<Textarea
							id="plugin-description"
							value={form.description}
							onChange={(event) =>
								setForm((current) => ({ ...current, description: event.target.value }))
							}
							disabled={createMutation.isPending}
							rows={3}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-2">
							<Label htmlFor="plugin-version">Version</Label>
							<Input
								id="plugin-version"
								value={form.version}
								onChange={(event) =>
									setForm((current) => ({ ...current, version: event.target.value }))
								}
								disabled={createMutation.isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="plugin-runs-when">Where it runs</Label>
							<Select
								value={form.runsWhen}
								onValueChange={(value) =>
									setForm((current) => ({ ...current, runsWhen: value as PluginRunsWhen }))
								}
								disabled={createMutation.isPending}
							>
								<SelectTrigger id="plugin-runs-when">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PLUGIN_RUNS_WHEN.map((value) => (
										<SelectItem key={value} value={value}>
											{PLUGIN_RUNS_WHEN_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={!form.name.trim() || createMutation.isPending}
						title={!form.name.trim() ? "Enter a name to add" : undefined}
					>
						{createMutation.isPending ? "Adding..." : !form.name.trim() ? "Enter a name" : "Add plugin"}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

/**
 * Name popup for a new plugin. Mounts a fresh form each time so fields start empty.
 */
export function AddPluginDialog({ open, onOpenChange }: AddPluginDialogProps): JSX.Element {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open ? <AddPluginForm key="add-plugin" onClose={() => onOpenChange(false)} /> : null}
		</Dialog>
	);
}
