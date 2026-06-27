import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NEXTPRESS_CONFIG } from "../../../../config";
import { WhatsNewHighlightItem } from "@/components/admin/WhatsNewHighlightItem";
import type { ReleaseHighlight } from "@shared/release/release-highlight-meta";

type ReleaseResponse = {
	installedVersion: string;
	latestVersion: string;
	updateAvailable: boolean;
	releaseDate: string;
	highlights: ReleaseHighlight[];
	supportedUpgradeFrom: string[];
	updateCheck?: {
		source: string;
		ok: boolean;
		note: string;
		checkedAt?: string;
	};
};

type UpgradeAssessment = {
	updateAvailable: boolean;
	installedVersion: string;
	latestVersion: string;
	mode: "auto" | "manual";
	canAutoUpgrade: boolean;
	schema: {
		installed: string | null;
		target: string;
		previousRequired: string;
		compatible: boolean;
		hasSchemaChanges: boolean;
	};
	blockers: string[];
	instructions: string[];
	command: string;
};

type WhatsNewDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	release: ReleaseResponse | undefined;
};

/**
 * Release notes and upgrade guidance for admins.
 */
export function WhatsNewDialog({ open, onOpenChange, release }: WhatsNewDialogProps) {
	const [assessment, setAssessment] = useState<UpgradeAssessment | null>(null);
	const [upgradeOutput, setUpgradeOutput] = useState<string | null>(null);

	const checkMutation = useMutation({
		mutationFn: async () => {
			const res = await apiRequest("POST", "/api/system/upgrade/check");
			return (await res.json()) as UpgradeAssessment;
		},
		onSuccess: (data) => {
			setAssessment(data);
			setUpgradeOutput(null);
		},
	});

	const runMutation = useMutation({
		mutationFn: async () => {
			const res = await apiRequest("POST", "/api/system/upgrade/run");
			return res.json() as Promise<{ message: string; output?: string }>;
		},
		onSuccess: (data) => {
			setUpgradeOutput(data.output ?? data.message);
		},
		onError: async (error: Error) => {
			setUpgradeOutput(error.message);
		},
	});

	const updateAvailable = release?.updateAvailable ?? false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						What&apos;s new in v{release?.latestVersion ?? NEXTPRESS_CONFIG.version}
					</DialogTitle>
					<DialogDescription>
						Installed v{release?.installedVersion ?? NEXTPRESS_CONFIG.version}
						{release?.releaseDate ? ` · Released ${release.releaseDate}` : ""}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<ul className="space-y-3">
						{release?.highlights?.map((item) => (
							<WhatsNewHighlightItem key={item.title} item={item} />
						))}
					</ul>

					{updateAvailable && (
						<div className="space-y-3 rounded-md border border-npb-border-subtle p-4">
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									variant="outline"
									className="inline-flex items-center gap-1.5 rounded-full border-orange-500/50 bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-900 dark:text-orange-100"
								>
									<span
										className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"
										aria-hidden
									/>
									Update available
								</Badge>
								<span className="text-sm text-npb-text-secondary">
									v{release?.installedVersion} → v{release?.latestVersion}
								</span>
							</div>

							<p className="text-sm text-npb-text-secondary">
								You are on an older version. We can check whether your server can
								update automatically, or show you simple steps to update manually.
							</p>

							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={checkMutation.isPending}
									onClick={() => checkMutation.mutate()}
								>
									{checkMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Check update options
								</Button>
								{assessment?.canAutoUpgrade && (
									<Button
										size="sm"
										disabled={runMutation.isPending}
										onClick={() => runMutation.mutate()}
									>
										{runMutation.isPending && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										Run upgrade
									</Button>
								)}
							</div>

							{assessment && (
								<div className="space-y-2 text-sm">
									{assessment.canAutoUpgrade ? (
										<Alert>
											<CheckCircle2 className="h-4 w-4" />
											<AlertTitle>Your server can update automatically</AlertTitle>
											<AlertDescription>
												Everything looks ready. Choose Run upgrade to continue, or
												follow the steps below if you prefer to update manually.
											</AlertDescription>
										</Alert>
									) : (
										<Alert variant="destructive">
											<AlertCircle className="h-4 w-4" />
											<AlertTitle>Update on your server</AlertTitle>
											<AlertDescription>
												<ul className="mt-2 list-disc space-y-1 pl-4">
													{assessment.blockers.map((item) => (
														<li key={item}>{item}</li>
													))}
												</ul>
											</AlertDescription>
										</Alert>
									)}

									<div>
										<p className="font-medium text-npb-text-primary">Steps</p>
										<ol className="mt-1 list-decimal space-y-1 pl-5 text-npb-text-secondary">
											{assessment.instructions.map((step) => (
												<li key={step}>{step}</li>
											))}
										</ol>
										<p className="mt-2 font-mono text-xs text-npb-text-muted">
											{assessment.command}
										</p>
									</div>
								</div>
							)}

							{upgradeOutput && (
								<pre className="max-h-40 overflow-auto rounded-md border bg-muted p-3 text-xs">
									{upgradeOutput}
								</pre>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
