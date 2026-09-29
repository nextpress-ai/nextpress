import type { FormSubmission } from "@shared/schema-types";
import type { SubmittedField } from "@shared/form-model";

const readFields = (item: FormSubmission): SubmittedField[] =>
	Array.isArray(item.fields) ? (item.fields as SubmittedField[]) : [];

/**
 * One cell. Visitors typed these values, so a leading `=`, `+`, `-` or `@` is neutralised: opened
 * in a spreadsheet it would otherwise run as a formula.
 */
const cell = (value: string): string => {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return `"${safe.replace(/"/g, '""')}"`;
};

/** Submissions as CSV: date, form, status, then one column per question (in first-seen order). */
export function submissionsToCsv({
	items,
	pageTitles,
}: {
	items: readonly FormSubmission[];
	pageTitles: Record<string, string>;
}): string {
	const labels: string[] = [];
	items.forEach((item) =>
		readFields(item).forEach((field) => {
			if (!labels.includes(field.label)) labels.push(field.label);
		}),
	);
	const header = ["Sent", "Form", "Page", "Status", ...labels].map(cell).join(",");
	const rows = items.map((item) => {
		const byLabel = new Map(readFields(item).map((field) => [field.label, field.value]));
		return [
			item.createdAt ? new Date(item.createdAt).toISOString() : "",
			item.formName,
			item.pageId ? (pageTitles[item.pageId] ?? "") : "",
			item.status,
			...labels.map((label) => byLabel.get(label) ?? ""),
		]
			.map(cell)
			.join(",");
	});
	// Byte order mark so Excel opens accents and non-Latin text correctly.
	return `﻿${[header, ...rows].join("\r\n")}\r\n`;
}
