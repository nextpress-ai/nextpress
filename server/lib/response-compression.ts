import compression from "compression";
import type { Request, Response } from "express";

/**
 * The System setting "Enable Compression" is per site, and this process serves every site.
 * The flag starts on, then follows the default site at boot and the site that was just saved.
 */
let enabled = true;

export function setResponseCompressionEnabled(value: boolean): void {
	enabled = value;
}

export function isResponseCompressionEnabled(): boolean {
	return enabled;
}

/** Gzip or Brotli for text responses, when the browser asks and the setting is on. */
export function responseCompression() {
	return compression({
		filter(req: Request, res: Response): boolean {
			if (!enabled) return false;
			return compression.filter(req, res);
		},
	});
}
