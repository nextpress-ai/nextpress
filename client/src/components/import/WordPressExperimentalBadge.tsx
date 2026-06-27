import { Badge } from "@/components/ui/badge";

/** Marks WordPress import as an in-progress, experimental feature. */
export function WordPressExperimentalBadge() {
	return (
		<Badge
			variant="outline"
			className="text-xs font-normal text-amber-800 border-amber-300 bg-amber-50 dark:text-amber-200 dark:border-amber-700 dark:bg-amber-950/50"
		>
			Experimental
		</Badge>
	);
}
