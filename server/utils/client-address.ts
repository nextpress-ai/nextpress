import type { Request } from "express";

/** Loopback and private ranges: where the bundled Caddy (or any reverse proxy on the box) connects from. */
const FROM_LOCAL_PROXY = /^(?:::ffff:)?(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|^::1$|^f[cd][0-9a-f]{2}:/i;

/**
 * The visitor's address for rate limiting. Behind the bundled proxy every request arrives from the
 * proxy, so one shared limit would throttle all visitors together; the proxy appends the real
 * address as the last `X-Forwarded-For` entry. That header is only believed when the connection
 * itself comes from a local proxy, so a visitor cannot pick their own address. Never stored.
 */
export function clientAddress(req: Request): string {
	const direct = req.socket.remoteAddress ?? "unknown";
	if (!FROM_LOCAL_PROXY.test(direct)) return direct;
	const forwarded = req.get("x-forwarded-for");
	const last = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop();
	return last || direct;
}
