import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/better-auth";
import { models } from "./storage";

type RequestWithAuth = Request & {
	authUserId?: string;
	currentUser?: Record<string, unknown>;
};

export type AuthService = {
	getCurrentUser: (
		req: Request,
	) => Promise<Record<string, unknown> | null>;
	isAuthenticated: (req: Request) => boolean;
	getCurrentUserId: (req: Request) => string | null;
};

/**
 * Resolves the authenticated CMS user from a Better Auth session.
 */
export function createAuthService(): AuthService {
	return {
		async getCurrentUser(req) {
			try {
				const session = await auth.api.getSession({
					headers: fromNodeHeaders(req.headers),
				});
				if (!session?.user?.id) {
					return null;
				}

				const user = await models.users.findById(session.user.id);
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
 * Requires a valid Better Auth session before continuing.
 */
export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session?.user?.id) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		(req as RequestWithAuth).authUserId = session.user.id;
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
