import AdminTopBar from "@/components/AdminTopBar";
import AdminSidebar from "@/components/AdminSidebar";
import { WordPressImportFlow } from "@/components/import/WordPressImportFlow";
import { WordPressExperimentalBadge } from "@/components/import/WordPressExperimentalBadge";

/** Full-page WordPress import hub (Tools → Import WordPress). */
export default function ImportWordPress() {
	return (
		<div className="min-h-screen bg-wp-gray-light">
			<AdminTopBar />
			<AdminSidebar />

			<div className="ml-40 pt-8">
				<div className="bg-white border-b border-gray-200 px-6 py-4">
					<h1 className="text-2xl font-semibold text-wp-gray flex items-center gap-2">
						Import WordPress
						<WordPressExperimentalBadge />
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Bring published posts and pages from another WordPress site into NextPress.
					</p>
				</div>

				<div className="p-6">
					<div className="bg-white rounded-lg border p-6">
						<WordPressImportFlow />
					</div>
				</div>
			</div>
		</div>
	);
}
