import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import * as schema from "@shared/schema";
import { db } from "../db";
import { getAuthBaseUrl, getAuthSecret } from "../config";
import { resolveAuthTrustedOrigins } from "./auth-trusted-origins";
import { models } from "../storage";

/** Drizzle tables keyed for Better Auth modelName lookups (users, auth_sessions, …). */
const authSchema = {
	...schema,
	user: schema.users,
	users: schema.users,
	session: schema.authSessions,
	auth_sessions: schema.authSessions,
	account: schema.accounts,
	accounts: schema.accounts,
	verification: schema.verifications,
	verifications: schema.verifications,
};

/**
 * Better Auth instance for NextPress.
 * Reuses the existing `users` table and bcrypt hashes for backward compatibility.
 */
export const auth = betterAuth({
	baseURL: getAuthBaseUrl(),
	secret: getAuthSecret(),
	trustedOrigins: async (request?: Request) => resolveAuthTrustedOrigins(request),
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		password: {
			hash: async (password: string) => bcrypt.hash(password, 10),
			verify: async ({
				hash,
				password,
			}: {
				hash: string;
				password: string;
			}) => bcrypt.compare(password, hash),
		},
	},
	user: {
		modelName: "users",
		fields: {
			image: "profileImageUrl",
			emailVerified: "emailVerified",
		},
		additionalFields: {
			firstName: {
				type: "string",
				required: false,
				input: true,
			},
			lastName: {
				type: "string",
				required: false,
				input: true,
			},
			status: {
				type: "string",
				required: false,
				defaultValue: "active",
				input: false,
			},
			other: {
				type: "json",
				required: false,
				defaultValue: {},
				input: false,
			},
		},
	},
	session: {
		modelName: "auth_sessions",
	},
	account: {
		modelName: "accounts",
	},
	verification: {
		modelName: "verifications",
	},
	advanced: {
		database: {
			/** Auth tables use uuid columns; users.id is DB-generated via defaultRandom(). */
			generateId: ({ model }) => {
				if (model === "user" || model === "users") {
					return false;
				}
				return randomUUID();
			},
		},
	},
	plugins: [username()],
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					try {
						const defaultSite = await models.sites.findDefaultSite();
						const subscriberRole =
							await models.roles.findByName("subscriber");
						if (defaultSite && subscriberRole) {
							await models.userRoles.assignRole(
								user.id,
								subscriberRole.id,
								defaultSite.id,
							);
						}
					} catch (error) {
						console.error(
							"Better Auth: subscriber role assignment failed:",
							error,
						);
					}
				},
			},
		},
	},
});
