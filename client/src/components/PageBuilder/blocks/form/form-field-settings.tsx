import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from "../../shared";
import { Settings, Type } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import type { FormFieldBase, InputFieldType } from "@shared/form-field-model";

type FormFieldSettingsProps<T extends FormFieldBase> = {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
	defaultContent: T;
	extraFields?: (ctx: {
		content: T;
		updateContent: (patch: Partial<T>) => void;
	}) => React.ReactNode;
};

/** Content-tab settings shared by input, textarea, and select blocks. */
export function FormFieldSettings<T extends FormFieldBase>({
	block,
	onUpdate,
	defaultContent,
	extraFields,
}: FormFieldSettingsProps<T>) {
	const { content, updateContent } = useSettingsState<T>({
		block,
		onUpdate,
		defaultContent,
	});

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Content" icon={Type} defaultOpen>
				<div className="space-y-4">
					<div>
						<SettingsLabel htmlFor="form-field-name">Field name</SettingsLabel>
						<Input
							id="form-field-name"
							value={content?.name ?? ""}
							onChange={(e) => updateContent({ name: e.target.value } as Partial<T>)}
							placeholder="search"
							className="h-9 rounded-none"
						/>
					</div>
					<div>
						<SettingsLabel htmlFor="form-field-placeholder">Placeholder</SettingsLabel>
						<Input
							id="form-field-placeholder"
							value={content?.placeholder ?? ""}
							onChange={(e) =>
								updateContent({ placeholder: e.target.value } as Partial<T>)
							}
							className="h-9 rounded-none"
						/>
					</div>
					<div>
						<SettingsLabel htmlFor="form-field-default">Default value</SettingsLabel>
						<Input
							id="form-field-default"
							value={content?.defaultValue ?? ""}
							onChange={(e) =>
								updateContent({ defaultValue: e.target.value } as Partial<T>)
							}
							className="h-9 rounded-none"
						/>
					</div>
					<div>
						<SettingsLabel htmlFor="form-field-aria">Accessible label</SettingsLabel>
						<Input
							id="form-field-aria"
							value={content?.ariaLabel ?? ""}
							onChange={(e) =>
								updateContent({ ariaLabel: e.target.value } as Partial<T>)
							}
							placeholder="Optional label for screen readers"
							className="h-9 rounded-none"
						/>
					</div>
					{extraFields?.({ content, updateContent })}
					<div className="flex items-center justify-between gap-3">
						<SettingsLabel htmlFor="form-field-required">Required</SettingsLabel>
						<Switch
							id="form-field-required"
							checked={content?.required ?? false}
							onCheckedChange={(checked) =>
								updateContent({ required: checked } as Partial<T>)
							}
						/>
					</div>
					<div className="flex items-center justify-between gap-3">
						<SettingsLabel htmlFor="form-field-disabled">Disabled</SettingsLabel>
						<Switch
							id="form-field-disabled"
							checked={content?.disabled ?? false}
							onCheckedChange={(checked) =>
								updateContent({ disabled: checked } as Partial<T>)
							}
						/>
					</div>
				</div>
			</CollapsibleCard>
			<CollapsibleCard title="Settings" icon={Settings} defaultOpen>
				<p className="text-xs text-npb-text-muted">
					Width, colors, and borders are in the Style tab.
				</p>
			</CollapsibleCard>
		</div>
	);
}

type InputTypeSelectProps = {
	value: InputFieldType;
	onChange: (value: InputFieldType) => void;
};

export function InputTypeSelect({ value, onChange }: InputTypeSelectProps) {
	return (
		<div>
			<SettingsLabel htmlFor="input-field-type">Input type</SettingsLabel>
			<Select value={value} onValueChange={(v) => onChange(v as InputFieldType)}>
				<SelectTrigger id="input-field-type" className="mt-1 h-9 rounded-none">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="text">Text</SelectItem>
					<SelectItem value="search">Search</SelectItem>
					<SelectItem value="email">Email</SelectItem>
					<SelectItem value="password">Password</SelectItem>
					<SelectItem value="number">Number</SelectItem>
					<SelectItem value="tel">Phone</SelectItem>
					<SelectItem value="url">URL</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
