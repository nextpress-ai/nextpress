import { AdminLayout } from "@/components/AdminLayout";
import { WordPressImportFlow } from "@/components/import/WordPressImportFlow";
import { WordPressExperimentalBadge } from "@/components/import/WordPressExperimentalBadge";

/** Full-page WordPress import hub (Tools → Import WordPress). */
export default function ImportWordPress() {
	return (
		<AdminLayout
			title="Import WordPress"
			actions={<WordPressExperimentalBadge />}
		>
			<div className="space-y-6">
				<p className="text-sm text-npb-text-secondary">
					Bring published posts and pages from another WordPress site into NextPress.
				</p>
				<div className="rounded-[var(--npb-radius-surface)] bg-npb-surface-raised p-6 shadow-[var(--npb-shadow-surface)]">
					<WordPressImportFlow />
				</div>
			</div>
		</AdminLayout>
	);
}
