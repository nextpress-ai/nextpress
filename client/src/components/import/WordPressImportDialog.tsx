import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WordPressImportFlow } from "./WordPressImportFlow";

export type WordPressImportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Compact WordPress import from the Posts list. */
export function WordPressImportDialog({ open, onOpenChange }: WordPressImportDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Import from WordPress</DialogTitle>
					<DialogDescription>
						Connect to a WordPress site and import published posts.
					</DialogDescription>
				</DialogHeader>
				<WordPressImportFlow
					compact
					onComplete={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
