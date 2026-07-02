import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

const hits = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limit for unauthenticated preview share fetches. */
export function previewShareRateLimit(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
	const now = Date.now();
	const entry = hits.get(key);

	if (!entry || entry.resetAt <= now) {
		hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
		next();
		return;
	}

	if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
		res.status(429).json({ message: "Too many preview requests. Try again shortly." });
		return;
	}

	entry.count += 1;
	next();
}
