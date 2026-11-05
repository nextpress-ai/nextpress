import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** One page or group read from the docs folder. */
export type DocsFolderItem = {
	kind: "page" | "group";
	/** The address part: the file name without `.md`, or the folder name for a group. */
	slug: string;
	/** The group's folder name for a page inside a group; empty for a top-level page. */
	group: string;
	title: string;
	description: string;
	order: number;
	body: string;
};

export type DocsFolder = {
	/** The home page: `index.md`. */
	home: { title: string; description: string; body: string };
	items: DocsFolderItem[];
};

type FrontMatter = { title: string; description: string; order: number };

const unquote = (value: string): string => value.trim().replace(/^(["'])(.*)\1$/, "$2");

/** `key: value` lines between two `---` lines; the rest is the body. */
export function readFrontMatter(text: string): { meta: FrontMatter; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
	const fields = new Map<string, string>();
	for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
		const at = line.indexOf(":");
		if (at > 0) fields.set(line.slice(0, at).trim(), unquote(line.slice(at + 1)));
	}
	const order = Number(fields.get("order"));
	return { meta: { title: fields.get("title") ?? "", description: fields.get("description") ?? "", order: Number.isFinite(order) ? order : 1000 }, body: match?.[2] ?? text };
}

const isPageFile = (name: string): boolean => name.endsWith(".md") && !name.startsWith("_") && name !== "index.md";

/** Reads `index.md`, each folder's `_group.md` and every other page, skipping files that start with `_`. */
export function readDocsFolder(root: string): DocsFolder {
	const index = readFrontMatter(readFileSync(join(root, "index.md"), "utf8"));
	const items: DocsFolderItem[] = [];
	for (const name of readdirSync(root).sort()) {
		const path = join(root, name);
		if (statSync(path).isFile()) {
			if (!isPageFile(name)) continue;
			const { meta, body } = readFrontMatter(readFileSync(path, "utf8"));
			items.push({ kind: "page", slug: name.replace(/\.md$/, ""), group: "", ...meta, body });
			continue;
		}
		const groupFile = join(path, "_group.md");
		const group = readFrontMatter(readFileSync(groupFile, "utf8"));
		items.push({ kind: "group", slug: name, group: "", ...group.meta, body: group.body });
		for (const file of readdirSync(path).sort().filter(isPageFile)) {
			const { meta, body } = readFrontMatter(readFileSync(join(path, file), "utf8"));
			items.push({ kind: "page", slug: file.replace(/\.md$/, ""), group: name, ...meta, body });
		}
	}
	return { home: { title: index.meta.title, description: index.meta.description, body: index.body }, items };
}
