import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FORM_CONTENT, readFormContent, type FormContent } from "@shared/form-model";
import { SettingsLabel, SettingsSection } from "../../shared";
import { useSettingsState } from "../useSettingsState";

type FormSettingsProps = {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
};

/** Name the form (it labels each submission in admin) and write what visitors see once it is sent. */
export function FormSettings({ block, onUpdate }: FormSettingsProps): JSX.Element {
	const { content, updateContent } = useSettingsState<FormContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_FORM_CONTENT,
		parseContent: readFormContent,
	});

	return (
		<SettingsSection>
			<div>
				<SettingsLabel htmlFor="form-name">Form name</SettingsLabel>
				<Input
					id="form-name"
					value={content.name}
					onChange={(event) => updateContent({ name: event.target.value })}
					placeholder="e.g. Waitlist"
					className="h-9"
				/>
				<p className="npb-settings-hint-muted mt-1.5 text-xs">
					Each submission in Forms is labelled with this name.
				</p>
			</div>
			<div>
				<SettingsLabel htmlFor="form-success">Message after sending</SettingsLabel>
				<Textarea
					id="form-success"
					value={content.successMessage}
					onChange={(event) => updateContent({ successMessage: event.target.value })}
					rows={3}
				/>
			</div>
			<p className="npb-settings-hint-muted text-xs">
				Add fields and a button from "Form fields" in the block list. Turn on "Sends the form" on the button
				that should send it. Spacing and direction are in the Style tab under Layout.
			</p>
		</SettingsSection>
	);
}
