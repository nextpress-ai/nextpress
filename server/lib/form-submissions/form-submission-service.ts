import { sql } from "drizzle-orm";
import type { BlockConfig, FormSubmission } from "@shared/schema-types";
import { pages } from "@shared/schema";
import type { Filter, FindManyOptions } from "@shared/create-models";
import {
	checkFormSubmission,
	collectFormFields,
	findFormBlock,
	readFormContent,
	FORM_TRAP_FIELD,
	type SubmittedField,
} from "@shared/form-model";

type PageRow = typeof pages.$inferSelect;

type FormSubmissionDeps = {
	findPublishedPagesWithBlock: (blockId: string) => Promise<PageRow[]>;
	submissions: {
		create: (data: {
			siteId: string;
			pageId: string;
			formName: string;
			fields: SubmittedField[];
			status: string;
		}) => Promise<FormSubmission>;
		findManyWhere: (where: Filter[], options?: FindManyOptions) => Promise<FormSubmission[]>;
		count: (options: { where: Filter[] }) => Promise<number>;
		findById: (id: string) => Promise<FormSubmission | undefined>;
		update: (id: string, data: Partial<FormSubmission>) => Promise<FormSubmission>;
		delete: (id: string) => Promise<void>;
	};
};

export type SubmitResult =
	| { ok: true; message: string; stored: boolean }
	| { ok: false; status: 400 | 404; message: string; field?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Live pages whose blocks mention this id. The id is a checked UUID, so it is unique across pages;
 * `findFormBlock` then confirms it is a form. (Stored JSON reads back as `"id": "…"` with a space,
 * so the pattern is the id alone.)
 */
export const publishedPagesWithBlockQuery = (blockId: string) =>
	sql`${pages.status} = 'publish' and ${pages.blocks}::text like ${`%${blockId}%`}`;

/**
 * Form sends and the admin list. A send is checked against the form as it is on the live page,
 * so visitors can only fill the questions the owner asked, and nothing arrives for a form that
 * is not published.
 */
export function createFormSubmissionService(deps: FormSubmissionDeps) {
	const submit = async ({
		formId,
		values,
	}: {
		formId: string;
		values: Record<string, unknown>;
	}): Promise<SubmitResult> => {
		if (!UUID.test(formId)) return { ok: false, status: 404, message: "This form is no longer available." };

		const [page] = await deps.findPublishedPagesWithBlock(formId);
		const blocks = Array.isArray(page?.blocks) ? (page.blocks as BlockConfig[]) : [];
		const form = page ? findFormBlock(blocks, formId) : null;
		if (!page || !form) return { ok: false, status: 404, message: "This form is no longer available." };

		const content = readFormContent(form.content);
		// Filled by bots only. Say "sent" and keep nothing, so they learn nothing.
		const trap = values[FORM_TRAP_FIELD];
		if (typeof trap === "string" && trap.trim()) return { ok: true, message: content.successMessage, stored: false };

		const checked = checkFormSubmission({ specs: collectFormFields(form), values });
		if (!checked.ok) return { ok: false, status: 400, message: checked.message, field: checked.field };

		await deps.submissions.create({
			siteId: String(page.siteId),
			pageId: String(page.id),
			formName: content.name,
			fields: checked.fields,
			status: "new",
		});
		return { ok: true, message: content.successMessage, stored: true };
	};

	const listFilters = ({ siteId, formName, status }: { siteId: string; formName?: string; status?: string }): Filter[] => [
		{ where: "siteId", equals: siteId },
		...(formName ? [{ where: "formName", equals: formName }] : []),
		...(status === "new" || status === "read" ? [{ where: "status", equals: status }] : []),
	];

	const list = async ({
		siteId,
		formName,
		status,
		limit,
		offset,
	}: {
		siteId: string;
		formName?: string;
		status?: string;
		limit: number;
		offset: number;
	}) => {
		const where = listFilters({ siteId, formName, status });
		const [items, total, forAllNames] = await Promise.all([
			deps.submissions.findManyWhere(where, { limit, offset, orderBy: { property: "createdAt", order: "descending" } }),
			deps.submissions.count({ where }),
			deps.submissions.findManyWhere([{ where: "siteId", equals: siteId }]),
		]);
		const formNames = [...new Set(forAllNames.map((item) => item.formName))].sort();
		const unread = forAllNames.filter((item) => item.status === "new").length;
		return { items, total, formNames, unread };
	};

	const all = ({ siteId, formName }: { siteId: string; formName?: string }) =>
		deps.submissions.findManyWhere(listFilters({ siteId, formName }), {
			orderBy: { property: "createdAt", order: "descending" },
		});

	return {
		submit,
		list,
		all,
		findById: deps.submissions.findById,
		setStatus: (id: string, status: "new" | "read") => deps.submissions.update(id, { status }),
		remove: deps.submissions.delete,
	};
}

export type FormSubmissionService = ReturnType<typeof createFormSubmissionService>;
