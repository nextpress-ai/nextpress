import { useMemo, useState, type ReactElement } from "react";
import { useLocation } from "wouter";
import { BookOpen, ChevronDown, FileText, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pageEditorPath } from "@/lib/admin-content-routes";
import { useSiteDocs } from "@/hooks/use-site-docs";
import { cn } from "@/lib/utils";
import { useDocsMode } from "./docs-mode-context";
import { flattenNavTree } from "./docs-nav-model";
import { useDocsTree } from "./use-docs-tree";

type Props = {
	pageId: string;
	/** The title as it is being edited, so the button never lags behind the Page tab. */
	pageTitle: string;
};

const depthOf = ({ path, homePath }: { path: string; homePath: string }): number => Math.max(0, path.split("/").filter(Boolean).length - homePath.split("/").filter(Boolean).length);

/**
 * "<docs name> / <page title> ▾": the editor's way between the pages of one docs, and to the other
 * docs of the site. A search box narrows the list, and choosing a page opens it in this editor
 * (what you changed here is kept as a draft, as for any page you leave).
 */
export function DocsPageSwitcher({ pageId, pageTitle }: Props): ReactElement {
	const { tree } = useDocsTree({ pageId });
	const siteId = useDocsMode()?.siteId ?? "";
	const otherDocs = (useSiteDocs({ siteId }).data ?? []).filter((entry) => entry.homeId !== tree?.home.id);
	const [open, setOpen] = useState(false);
	const [, navigate] = useLocation();
	const rows = useMemo(() => (tree ? flattenNavTree(tree.home) : []), [tree]);
	const docsName = tree ? tree.settings.title.trim() || tree.home.title : "Docs";

	const choose = (id: string): void => {
		setOpen(false);
		if (id !== pageId) navigate(pageEditorPath(id));
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="npb-chrome-outline min-w-0 max-w-[22rem] gap-2" aria-label={`${docsName}, ${pageTitle || "Untitled"}. Choose another page`}>
					<span className="truncate">{docsName}</span>
					<span className="text-npb-text-muted" aria-hidden>
						/
					</span>
					<span className="truncate">{pageTitle || "Untitled"}</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-96 p-0">
				<Command>
					<CommandInput placeholder="Find a page" aria-label="Find a page" />
					<CommandList>
						<CommandEmpty>No page matches.</CommandEmpty>
						<CommandGroup heading={docsName}>
							{rows.map((item) => {
								const Icon = item.kind === "group" ? Folder : FileText;
								return (
									<CommandItem key={item.id} value={`${item.title} ${item.path}`} onSelect={() => choose(item.id)} aria-current={item.id === pageId ? "page" : undefined}>
										<span className="flex min-w-0 flex-1 items-center gap-2" style={{ paddingLeft: `${depthOf({ path: item.path, homePath: tree?.home.path ?? "" }) * 12}px` }}>
											<Icon className="h-4 w-4 shrink-0 text-npb-text-muted" aria-hidden />
											<span className={cn("truncate", item.id === pageId && "font-semibold")}>{item.title}</span>
										</span>
										<span className="ml-2 max-w-[40%] shrink-0 truncate font-mono text-xs text-npb-text-muted">{item.path}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
						{otherDocs.length > 0 ? (
							<>
								<CommandSeparator />
								<CommandGroup heading="Other docs">
									{otherDocs.map((entry) => (
										<CommandItem key={entry.homeId} value={`${entry.name} ${entry.path}`} onSelect={() => choose(entry.homeId)}>
											<BookOpen className="h-4 w-4 shrink-0 text-npb-text-muted" aria-hidden />
											<span className="min-w-0 flex-1 truncate">{entry.name}</span>
											<span className="ml-2 shrink-0 font-mono text-xs text-npb-text-muted">{entry.path}</span>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						) : null}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
