import { CALLOUT_BLOCK_NAME, DEFAULT_CALLOUT_CONTENT } from "../blocks/callout-model.js";
import { CODE_EXAMPLE_BLOCK_NAME, DEFAULT_CODE_EXAMPLE_CONTENT } from "../blocks/code-example-model.js";
import { CODE_GROUP_BLOCK_NAME, DEFAULT_CODE_GROUP_CONTENT } from "../blocks/code-group-model.js";
import { DEFAULT_DIAGRAM_CONTENT, DIAGRAM_BLOCK_NAME } from "../blocks/diagram-model.js";
import { DEFAULT_FILE_TREE_CONTENT, FILE_TREE_BLOCK_NAME } from "../blocks/file-tree-model.js";
import { DEFAULT_PARAMS_CONTENT, PARAMS_BLOCK_NAME } from "../blocks/params-model.js";
import { DEFAULT_UPDATE_CONTENT, UPDATE_BLOCK_NAME } from "../blocks/update-model.js";
import type { BlockConfig } from "../schema-types.js";
import { newBlockOther, structured } from "./content.js";
import { CODE_DEFAULT_CONTENT } from "./text-blocks.js";
import type { StartingChildrenParams, WrittenBlockEntry } from "./types.js";

/** A docs component's own box: a block's box, never padding pushed in from outside. */
const BOX_STYLES = { width: "100%", boxSizing: "border-box", margin: "0" } as const;

type CodeChild = { parentId: string; id: string; code: string; language: string; title: string };

/** A code block as it starts inside a code group or an example: no outer margin, the parent spaces it. */
const codeChild = ({ parentId, id, code, language, title }: CodeChild): BlockConfig => ({
	id,
	name: "core/code",
	label: "Code",
	type: "block",
	parentId,
	category: "advanced",
	content: structured({ ...CODE_DEFAULT_CONTENT, content: code, language, title }),
	styles: { margin: "0" },
	settings: {},
	other: newBlockOther(),
});

const paragraphChild = ({ parentId, id, value }: { parentId: string; id: string; value: string }): BlockConfig => ({
	id,
	name: "core/paragraph",
	label: "Paragraph",
	type: "block",
	parentId,
	category: "basic",
	content: { kind: "text", value },
	styles: { margin: "0", fontSize: "16px", lineHeight: "1.6" },
	settings: {},
	other: newBlockOther(),
});

const startingCalloutChildren = ({ parentId, newId }: StartingChildrenParams): BlockConfig[] => [
	paragraphChild({ parentId, id: newId(), value: "Something the reader should not miss." }),
];

const startingCodeGroup = ({ parentId, newId }: StartingChildrenParams): BlockConfig[] =>
	[
		{ title: "npm", code: "npm install nextpress" },
		{ title: "pnpm", code: "pnpm add nextpress" },
		{ title: "yarn", code: "yarn add nextpress" },
	].map(({ title, code }) => codeChild({ parentId, id: newId(), code, language: "bash", title }));

const startingUpdate = ({ parentId, newId }: StartingChildrenParams): BlockConfig[] => [
	paragraphChild({ parentId, id: newId(), value: "What changed in this entry." }),
];

const startingExample = ({ parentId, newId }: StartingChildrenParams): BlockConfig[] => [
	codeChild({ parentId, id: newId(), code: "pnpm add nextpress", language: "bash", title: "" }),
	paragraphChild({ parentId, id: newId(), value: "What the code makes: build the result here from ordinary blocks." }),
];

/**
 * Docs blocks (category `docs`, names `docs/…`): each is a block and an MDX tag with the same look.
 * Content shapes live in `shared/blocks/*-model.ts`; MDX tags in `shared/markdown/doc-component-props.ts`.
 */
export const DOCS_COMPONENT_BLOCKS: WrittenBlockEntry[] = [
	{
		name: CALLOUT_BLOCK_NAME,
		label: "Callout",
		description: "A highlighted note, tip or warning around other blocks",
		category: "docs",
		kind: "container",
		defaultContent: () => structured(DEFAULT_CALLOUT_CONTENT),
		defaultStyles: { ...BOX_STYLES },
		defaultChildren: startingCalloutChildren,
	},
	{
		name: CODE_GROUP_BLOCK_NAME,
		label: "Code group",
		description: "Code blocks in tabs, like npm, pnpm and yarn; the reader's choice is remembered",
		category: "docs",
		kind: "container",
		defaultContent: () => structured(DEFAULT_CODE_GROUP_CONTENT),
		defaultStyles: { ...BOX_STYLES },
		defaultChildren: startingCodeGroup,
	},
	{
		name: FILE_TREE_BLOCK_NAME,
		label: "File tree",
		description: "Folders and files drawn as a tree",
		category: "docs",
		kind: "block",
		defaultContent: () => structured(DEFAULT_FILE_TREE_CONTENT),
		defaultStyles: { ...BOX_STYLES },
	},
	{
		name: PARAMS_BLOCK_NAME,
		label: "Parameters",
		description: "Options or API fields with their type, default and what they do",
		category: "docs",
		kind: "block",
		defaultContent: () => structured({ items: DEFAULT_PARAMS_CONTENT.items.map((item) => ({ ...item })) }),
		defaultStyles: { ...BOX_STYLES },
	},
	{
		name: CODE_EXAMPLE_BLOCK_NAME,
		label: "Code example",
		description: "Code beside what it makes",
		category: "docs",
		kind: "container",
		defaultContent: () => structured(DEFAULT_CODE_EXAMPLE_CONTENT),
		defaultStyles: { ...BOX_STYLES },
		defaultChildren: startingExample,
	},
	{
		name: DIAGRAM_BLOCK_NAME,
		label: "Diagram",
		description: "A Mermaid diagram (flowchart, sequence, state) drawn as a picture, with an optional caption",
		category: "docs",
		kind: "block",
		defaultContent: () => structured(DEFAULT_DIAGRAM_CONTENT),
		defaultStyles: { ...BOX_STYLES },
	},
	{
		name: UPDATE_BLOCK_NAME,
		label: "Changelog entry",
		description: "One dated or versioned entry in a changelog: its label beside the notes under it",
		category: "docs",
		kind: "container",
		defaultContent: () => structured(DEFAULT_UPDATE_CONTENT),
		defaultStyles: { ...BOX_STYLES },
		defaultChildren: startingUpdate,
	},
];
