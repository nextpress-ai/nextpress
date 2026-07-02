import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createUserSchema,
	idParamSchema,
	listUsersQuerySchema,
	updateUserSchema,
} from "../schemas/index.js";
import type { DeleteMessage, PaginatedResponse, User } from "../types/domain.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "../types/inputs.js";

export function createUsersResource({ http }: { http: HttpClient }) {
	return {
		list: async (params: ListUsersQuery = {}): Promise<PaginatedResponse<User, "users">> => {
			const query = parseInput({
				schema: listUsersQuerySchema,
				input: params,
				label: "users.list params",
			});
			return http.request("/api/users", { query });
		},

		get: async ({ id }: { id: string }): Promise<User> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.get id" });
			return http.request(`/api/users/${id}`);
		},

		create: async (input: CreateUserInput): Promise<User> => {
			const body = parseInput({
				schema: createUserSchema,
				input,
				label: "users.create input",
			});
			return http.request("/api/users", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdateUserInput): Promise<User> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.update id" });
			const body = parseInput({
				schema: updateUserSchema,
				input,
				label: "users.update input",
			});
			return http.request(`/api/users/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.delete id" });
			return http.request(`/api/users/${id}`, { method: "DELETE" });
		},
	};
}

export type UsersResource = ReturnType<typeof createUsersResource>;
