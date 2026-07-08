import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/better-auth";
import { verifyApiKey } from "./lib/sdk-auth";
import { readRequestSiteId } from "./routes/shared/resolve-request-site";
import { models } from "./storage";

export type RequestAuth = {
	userId: string;
	siteId?: string;
	apiKeyId?: string;
	scopes: string[];
	method: "session" | "apiKey";
};

type RequestWithAuth = Request & {
	authUserId?: string;
	authSiteId?: string;
	apiKeyId?: string;
	authScopes?: string[];
	authMethod?: RequestAuth["method"];
	currentUser?: Record<string, unknown>;
};

export type AuthService = {
	getCurrentUser: (
		req: Request,
	) => Promise<Record<string, unknown> | null>;
	isAuthenticated: (req: Request) => boolean;
	getCurrentUserId: (req: Request) => string | null;
};

/** Resolves session cookie or Bearer API key into an authenticated context. */
export async function resolveRequestAuth(req: Request): Promise<RequestAuth | null> {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	if (session?.user?.id) {
		return { userId: session.user.id, method: "session", scopes: [] };
	}

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice("Bearer ".length).trim();
		const apiKey = await verifyApiKey(token);
		if (apiKey) {
			return {
				userId: apiKey.userId,
				siteId: apiKey.siteId ?? undefined,
				apiKeyId: apiKey.id,
				scopes: apiKey.scopes,
				method: "apiKey",
			};
		}
	}

	return null;
}

/** Attaches auth fields on the request for downstream handlers. */
export function attachRequestAuth(req: Request, authContext: RequestAuth): void {
	const request = req as RequestWithAuth;
	request.authUserId = authContext.userId;
	request.authSiteId = authContext.siteId;
	request.apiKeyId = authContext.apiKeyId;
	request.authScopes = authContext.scopes;
	request.authMethod = authContext.method;
}

/**
 * Resolves the authenticated CMS user from a Better Auth session.
 */
export function createAuthService(): AuthService {
	return {
		async getCurrentUser(req) {
			try {
				const authContext = await resolveRequestAuth(req);
				if (!authContext) {
					return null;
				}

				const user = await models.users.findById(authContext.userId);
				if (!user) {
					return null;
				}

				const { password: _password, ...userResponse } = user;
				return userResponse;
			} catch (error) {
				console.error("Error getting current user:", error);
				return null;
			}
		},

		isAuthenticated(req) {
			return Boolean((req as RequestWithAuth).authUserId);
		},

		getCurrentUserId(req) {
			return (req as RequestWithAuth).authUserId ?? null;
		},
	};
}

export const authService = createAuthService();

/**
 * Requires a valid Better Auth session or SDK API key before continuing.
 */
export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if ((req as RequestWithAuth).authUserId && (req as RequestWithAuth).authMethod) {
			next();
			return;
		}

		const authContext = await resolveRequestAuth(req);

		if (!authContext) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		attachRequestAuth(req, authContext);

		if (authContext.method === "apiKey") {
			if (!authContext.siteId) {
				res.status(403).json({ message: "This API key is not bound to a site" });
				return;
			}

			const requestedSiteId = readRequestSiteId(req);
			if (requestedSiteId && requestedSiteId !== authContext.siteId) {
				res.status(403).json({ message: "This API key cannot access the requested site" });
				return;
			}
		}

		next();
	} catch (error) {
		console.error("Error in requireAuth middleware:", error);
		res.status(401).json({ message: "Unauthorized" });
	}
}

/**
 * Attaches the full CMS user record when a session exists.
 */
export async function getCurrentUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const user = await authService.getCurrentUser(req);
		if (user) {
			(req as RequestWithAuth).currentUser = user;
		}
		next();
	} catch (error) {
		console.error("Error in getCurrentUser middleware:", error);
		next();
	}
}

export function getRequestAuthSiteId(req: Request): string | undefined {
	return (req as RequestWithAuth).authSiteId;
}

export function getRequestAuthUserId(req: Request): string | undefined {
	return (req as RequestWithAuth).authUserId;
}

/**
 * Requires a dashboard session cookie. Rejects Bearer API keys.
 * Use for key management and other human-only admin actions.
 */
export async function requireSessionAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const authContext = await resolveRequestAuth(req);

		if (!authContext) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		if (authContext.method !== "session") {
			res.status(403).json({ message: "Dashboard session required" });
			return;
		}

		attachRequestAuth(req, authContext);
		next();
	} catch (error) {
		console.error("Error in requireSessionAuth middleware:", error);
		res.status(401).json({ message: "Unauthorized" });
	}
}
