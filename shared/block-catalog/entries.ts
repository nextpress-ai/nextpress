import { BLOCK_AGENT_NOTES } from "./agent-notes.js";
import { BLOCK_NAMES, type BlockName } from "./block-names.js";
import { DOCS_BLOCKS } from "./docs-blocks.js";
import { DOCS_COMPONENT_BLOCKS } from "./docs-component-blocks.js";
import { DESIGN_BLOCKS } from "./design-blocks.js";
import { FORM_BLOCKS } from "./form-blocks.js";
import { LAYOUT_BLOCKS } from "./layout-blocks.js";
import { MEDIA_BLOCKS } from "./media-blocks.js";
import { POST_BLOCKS } from "./post-blocks.js";
import { SEARCH_BLOCKS } from "./search-blocks.js";
import { TEXT_BLOCKS } from "./text-blocks.js";
import type { BlockCatalogEntry, WrittenBlockEntry } from "./types.js";

const WRITTEN_ENTRIES: readonly WrittenBlockEntry[] = [
	...TEXT_BLOCKS,
	...LAYOUT_BLOCKS,
	...FORM_BLOCKS,
	...MEDIA_BLOCKS,
	...POST_BLOCKS,
	...DESIGN_BLOCKS,
	...SEARCH_BLOCKS,
	...DOCS_BLOCKS,
	...DOCS_COMPONENT_BLOCKS,
];

const ALL_ENTRIES: readonly BlockCatalogEntry[] = WRITTEN_ENTRIES.map((entry) => ({
	...entry,
	agentNote: BLOCK_AGENT_NOTES[entry.name],
}));

const BY_NAME = new Map<string, BlockCatalogEntry>(ALL_ENTRIES.map((entry) => [entry.name, entry]));

/** Every entry, in `BLOCK_NAMES` order. */
export const BLOCK_CATALOG: readonly BlockCatalogEntry[] = BLOCK_NAMES.flatMap((name) => {
	const entry = BY_NAME.get(name);
	return entry ? [entry] : [];
});

/** All entries as written, before ordering (the catalog test checks for doubles here). */
export const RAW_BLOCK_ENTRIES = ALL_ENTRIES;

/** The entry for a name, or undefined for a name NextPress does not know. */
export const findBlockEntry = (name: string): BlockCatalogEntry | undefined => BY_NAME.get(name);

/**
 * The entry for a known block. Throws when it is missing: every name in
 * `BLOCK_NAMES` must have an entry, so a miss is a programming error.
 */
export const getBlockEntry = (name: BlockName): BlockCatalogEntry => {
	const entry = BY_NAME.get(name);
	if (!entry) {
		throw new Error(`Block catalog has no entry for "${name}". Add it to shared/block-catalog/.`);
	}
	return entry;
};
