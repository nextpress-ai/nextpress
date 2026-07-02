import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createTemplateSchema,
	duplicateTemplateSchema,
	idParamSchema,
	listTemplatesQuerySchema,
	updateTemplateSchema,
} from "../schemas/index.js";
import type { DeleteMessage, PaginatedResponse, Template } from "../types/domain.js";
import type {
	CreateTemplateInput,
	DuplicateTemplateInput,
	ListTemplatesQuery,
	UpdateTemplateInput,
} from "../types/inputs.js";

/** Templates for headers, footers, pages, posts, and popups. */
export function createTemplatesResource({ http }: { http: HttpClient }) {
	return {
		list: async (
			params: ListTemplatesQuery = {},
		): Promise<PaginatedResponse<Template, "templates">> => {
			const query = parseInput({
				schema: listTemplatesQuerySchema,
				input: params,
				label: "templates.list params",
			});
			return http.request("/api/templates", { query });
		},

		get: async ({ id }: { id: string }): Promise<Template> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "templates.get id" });
			return http.request(`/api/templates/${id}`);
		},

		create: async (input: CreateTemplateInput): Promise<Template> => {
			const body = parseInput({
				schema: createTemplateSchema,
				input,
				label: "templates.create input",
			});
			return http.request("/api/templates", { method: "POST", body });
		},

		duplicate: async ({
			id,
			...input
		}: { id: string } & DuplicateTemplateInput): Promise<Template> => {
			parseInput({
				schema: idParamSchema,
				input: { id },
				label: "templates.duplicate id",
			});
			const body = parseInput({
				schema: duplicateTemplateSchema,
				input,
				label: "templates.duplicate input",
			});
			return http.request(`/api/templates/${id}/duplicate`, { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdateTemplateInput): Promise<Template> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "templates.update id" });
			const body = parseInput({
				schema: updateTemplateSchema,
				input,
				label: "templates.update input",
			});
			return http.request(`/api/templates/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "templates.delete id" });
			return http.request(`/api/templates/${id}`, { method: "DELETE" });
		},
	};
}

export type TemplatesResource = ReturnType<typeof createTemplatesResource>;
