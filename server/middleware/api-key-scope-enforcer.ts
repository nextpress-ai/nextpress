import type { NextFunction, Request, Response } from "express";
import {
	apiKeyScopesAllow,
	resolveRequiredApiKeyScopes,
} from "@shared/api-key-scopes";
import {
	attachRequestAuth,
	getRequestAuthUserId,
	resolveRequestAuth,
} from "../auth";
import { readRequestSiteId } from "../routes/shared/resolve-request-site";

const API_KEY_PREFIX = "npk_live_";

/**
 * When a request uses a Bearer API key, resolves auth, enforces scopes,
 * and attaches the user to the request before route handlers run.
 */
export async function apiKeyScopeEnforcer(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		next();
		return;
	}

	const token = authHeader.slice("Bearer ".length).trim();
	if (!token.startsWith(API_KEY_PREFIX)) {
		next();
		return;
	}

	if (getRequestAuthUserId(req)) {
		next();
		return;
	}

	const requiredScopes = resolveRequiredApiKeyScopes({
		method: req.method,
		path: req.path,
	});

	if (requiredScopes === null) {
		next();
		return;
	}

	const authContext = await resolveRequestAuth(req);
	if (!authContext || authContext.method !== "apiKey") {
		next();
		return;
	}

	if (!apiKeyScopesAllow({ granted: authContext.scopes, required: requiredScopes })) {
		res.status(403).json({
			message: "This API key does not have permission for this action",
			code: "API_KEY_SCOPE_DENIED",
			requiredScopes,
		});
		return;
	}

	if (!authContext.siteId) {
		res.status(403).json({ message: "This API key is not bound to a site" });
		return;
	}

	const requestedSiteId = readRequestSiteId(req);
	if (requestedSiteId && requestedSiteId !== authContext.siteId) {
		res.status(403).json({ message: "This API key cannot access the requested site" });
		return;
	}

	attachRequestAuth(req, authContext);
	next();
}
