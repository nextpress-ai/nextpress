import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { AddPluginDialog } from "@/components/Plugins/AddPluginDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { resolvePluginError, showErrorToast, showSuccessToast } from "@/lib/sonner-toast";
import { describePluginRunsWhen } from "@shared/plugin-record";
import type { Plugin } from "@shared/schema-types";

function sortPlugins(plugins: readonly Plugin[]): Plugin[] {
	return [...plugins].sort((left, right) => {
		if (left.status === "active" && right.status !== "active") return -1;
		if (right.status === "active" && left.status !== "active") return 1;
		return left.name.localeCompare(right.name);
	});
}

function isOn(plugin: Plugin): boolean {
	return plugin.status === "active";
}

/**
 * Inventory of extras on this install. People add a name, then turn the extra on or off.
 */
export default function Plugins(): JSX.Element {
	const queryClient = useQueryClient();
	const [addOpen, setAddOpen] = useState(false);
	const [removeTarget, setRemoveTarget] = useState<Plugin | null>(null);

	const { data, isLoading } = useQuery<Plugin[]>({
		queryKey: ["/api/plugins"],
	});
	const plugins = useMemo(() => sortPlugins(data ?? []), [data]);

	const toggleMutation = useMutation({
		mutationFn: async ({ id, next }: { id: string; next: "active" | "inactive" }) => {
			const path = next === "active" ? "activate" : "deactivate";
			const response = await apiRequest("POST", `/api/plugins/${id}/${path}`);
			return (await response.json()) as Plugin;
		},
		onSuccess: (updated) => {
			showSuccessToast(isOn(updated) ? `${updated.name} is on` : `${updated.name} is off`);
			queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
		},
		onError: (error: unknown) => {
			showErrorToast(resolvePluginError(error));
		},
	});

	const removeMutation = useMutation({
		mutationFn: async (plugin: Plugin) => {
			await apiRequest("DELETE", `/api/plugins/${plugin.id}`);
			return plugin;
		},
		onSuccess: (plugin) => {
			showSuccessToast(`${plugin.name} was removed`);
			setRemoveTarget(null);
			queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
		},
		onError: (error: unknown) => {
			showErrorToast(resolvePluginError(error));
		},
	});

	const busyId = toggleMutation.isPending ? toggleMutation.variables?.id : undefined;

	return (
		<AdminLayout
			title="Plugins"
			actions={
				<Button className="npb-btn-accent" onClick={() => setAddOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add plugin
				</Button>
			}
		>
			<Card className="admin-surface">
				<CardContent className="pt-4">
					{isLoading ? (
						<div role="status" className="py-12 text-center text-npb-text-muted">
							Loading plugins...
						</div>
					) : plugins.length === 0 ? (
						<div className="py-12 text-center">
							<Plug className="mx-auto mb-3 h-8 w-8 text-npb-text-muted" aria-hidden />
							<p className="text-npb-text-primary">No plugins yet.</p>
							<p className="mt-1 text-sm text-npb-text-muted">
								Add a plugin when you have an extra you want to turn on.
							</p>
							<Button className="mt-4 npb-btn-accent" onClick={() => setAddOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Add plugin
							</Button>
						</div>
					) : (
						<Table className="admin-list-table">
							<TableHeader>
								<TableRow>
									<TableHead>Plugin</TableHead>
									<TableHead className="w-40">Where it runs</TableHead>
									<TableHead className="w-20">Version</TableHead>
									<TableHead className="w-36">Status</TableHead>
									<TableHead className="w-14 text-right">
										<span className="sr-only">Remove</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{plugins.map((plugin) => {
									const on = isOn(plugin);
									const rowBusy = busyId === plugin.id || removeMutation.isPending;
									return (
										<TableRow key={plugin.id} data-state={on ? "selected" : undefined}>
											<TableCell className="max-w-0 whitespace-normal">
												<div className="min-w-0">
													<div className="truncate font-medium text-npb-text-primary">{plugin.name}</div>
													{plugin.description ? (
														<div className="mt-0.5 line-clamp-2 text-sm text-npb-text-secondary">
															{plugin.description}
														</div>
													) : null}
												</div>
											</TableCell>
											<TableCell className="text-sm text-npb-text-secondary">
												{describePluginRunsWhen(plugin.runsWhen)}
											</TableCell>
											<TableCell className="text-sm tabular-nums text-npb-text-secondary">
												{plugin.version}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Switch
														checked={on}
														disabled={rowBusy}
														onCheckedChange={(checked) =>
															toggleMutation.mutate({
																id: plugin.id,
																next: checked ? "active" : "inactive",
															})
														}
														aria-label={on ? `Turn ${plugin.name} off` : `Turn ${plugin.name} on`}
													/>
													{on ? (
														<Badge className="bg-npb-status-success/15 text-npb-status-success">On</Badge>
													) : (
														<span className="text-sm text-npb-text-muted">Off</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-9 w-9 p-0"
													disabled={rowBusy}
													aria-label={`Remove ${plugin.name}`}
													onClick={() => setRemoveTarget(plugin)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<AddPluginDialog open={addOpen} onOpenChange={setAddOpen} />

			<AlertDialog
				open={removeTarget !== null}
				onOpenChange={(open) => {
					if (!open && !removeMutation.isPending) setRemoveTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{removeTarget ? `Remove ${removeTarget.name}?` : "Remove this plugin?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							This plugin will be removed from the list. You cannot undo this.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={removeMutation.isPending || !removeTarget}
							className="bg-red-600 hover:bg-red-700"
							onClick={(event) => {
								event.preventDefault();
								if (removeTarget) removeMutation.mutate(removeTarget);
							}}
						>
							{removeMutation.isPending ? "Removing..." : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</AdminLayout>
	);
}
