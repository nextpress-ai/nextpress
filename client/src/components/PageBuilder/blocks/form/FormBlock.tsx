import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Send } from "lucide-react";
import { DEFAULT_FORM_CONTENT, FORM_BLOCK_NAME, readFormContent, type FormContent } from "@shared/form-model";
import { FormHiddenFields } from "@shared/form-hidden-fields";
import { ContainerChildren } from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import { FormSettings } from "./form-settings";

const UNITS = { spacing: "px", font: "rem", dimension: "px", border: "px" } as const;

/** A new form asks for a name, an email and a message, with a Send button that submits it. */
function buildStarterFormChildren({ parentId, newId }: { parentId: string; newId: () => string }): BlockConfig[] {
	const base = { parentId, type: "block" as const, settings: {}, other: { tokenMap: {}, units: { ...UNITS } } };
	const field = (name: string, blockName: string, label: string, data: Record<string, unknown>): BlockConfig => ({
		...base,
		id: newId(),
		name: blockName,
		label,
		category: "form",
		content: { kind: "structured", data: { name, label, ...data } },
		styles: {},
	});
	// Same shape the button block reads: text plus what the button does.
	const sendContent: BlockContent & { action: "submit"; url: string } = { kind: "text", value: "Send", action: "submit", url: "" };
	return [
		field("name", "core/input", "Text field", { label: "Your name", type: "text", placeholder: "e.g. John Doe" }),
		field("email", "core/input", "Text field", {
			label: "Your email",
			type: "email",
			placeholder: "e.g. john@acme.com",
			required: true,
		}),
		field("message", "core/textarea", "Text area", { label: "Message", placeholder: "Text here", rows: 4 }),
		{
			...base,
			id: newId(),
			name: "core/button",
			label: "Button",
			category: "basic",
			content: sendContent,
			styles: {},
		},
	];
}

type FormCanvasProps = {
	hostBlock: BlockConfig;
	content: FormContent;
	isPreview?: boolean;
	onNestedBlockChange?: (updated: BlockConfig) => void;
};

/**
 * The same `<form>` on the canvas and in preview. On the canvas a thin caption names the form and
 * sending is off; in preview and on the live site the form runtime sends it.
 */
function FormCanvas({ hostBlock, content, isPreview, onNestedBlockChange }: FormCanvasProps) {
	return (
		<form
			className="wp-block-form"
			data-np-form={isPreview ? hostBlock.id : undefined}
			action="/api/forms/submit"
			method="post"
			noValidate={!isPreview}
			onSubmit={isPreview ? undefined : (event) => event.preventDefault()}
		>
			{isPreview ? null : (
				<p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-npb-text-muted">
					<Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
					Form · {content.name}
					<span className="font-normal">— what visitors send appears in Forms.</span>
				</p>
			)}
			<ContainerChildren block={hostBlock} isPreview={isPreview ?? false} onBlockChange={onNestedBlockChange} />
			<FormHiddenFields formId={hostBlock.id} />
		</form>
	);
}

const FormBlock = createBlockDefinition<FormContent>({
	id: FORM_BLOCK_NAME,
	label: "Form",
	icon: Send,
	description: "Collect sign-ups and messages; they appear in Forms",
	category: "form",
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_FORM_CONTENT,
	defaultStyles: { gap: "12px", margin: "0" },
	defaultChildren: buildStarterFormChildren,
	parseContent: (raw) => readFormContent(raw),
	settings: FormSettings,
	hasSettings: true,
	render: ({ value, content, isPreview, onNestedBlockChange }) => (
		<FormCanvas hostBlock={value} content={content} isPreview={isPreview} onNestedBlockChange={onNestedBlockChange} />
	),
});

export default FormBlock;
