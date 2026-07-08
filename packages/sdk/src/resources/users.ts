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

export type UsersResource = {
	/** Paginate team members for admin user management screens. */
	list: (params?: ListUsersQuery) => Promise<PaginatedResponse<User, "users">>;
	/** Load one user before role changes or profile edits. */
	get: (params: { id: string }) => Promise<User>;
	/** Invite or provision accounts with validated credentials at the boundary. */
	create: (input: CreateUserInput) => Promise<User>;
	/** Patch profile or role fields without replacing the whole user record. */
	update: (params: { id: string } & UpdateUserInput) => Promise<User>;
	/** Revoke access by removing the user from the install. */
	delete: (params: { id: string }) => Promise<DeleteMessage>;
};

export function createUsersResource({ http }: { http: HttpClient }): UsersResource {
	return {
		/** Paginate team members for admin user management screens. */
		list: async (params: ListUsersQuery = {}): Promise<PaginatedResponse<User, "users">> => {
			const query = parseInput({
				schema: listUsersQuerySchema,
				input: params,
				label: "users.list params",
			});
			return http.request("/api/users", { query });
		},

		/** Load one user before role changes or profile edits. */
		get: async ({ id }: { id: string }): Promise<User> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.get id" });
			return http.request(`/api/users/${id}`);
		},

		/** Invite or provision accounts with validated credentials at the boundary. */
		create: async (input: CreateUserInput): Promise<User> => {
			const body = parseInput({
				schema: createUserSchema,
				input,
				label: "users.create input",
			});
			return http.request("/api/users", { method: "POST", body });
		},

		/** Patch profile or role fields without replacing the whole user record. */
		update: async ({ id, ...input }: { id: string } & UpdateUserInput): Promise<User> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.update id" });
			const body = parseInput({
				schema: updateUserSchema,
				input,
				label: "users.update input",
			});
			return http.request(`/api/users/${id}`, { method: "PUT", body });
		},

		/** Revoke access by removing the user from the install. */
		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "users.delete id" });
			return http.request(`/api/users/${id}`, { method: "DELETE" });
		},
	};
}
