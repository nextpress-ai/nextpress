import { accessSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);
const distEntry = path.join(packageRoot, "dist/index.js");
const distSegment = `${path.sep}dist${path.sep}`;

export type ShippedSdkModule = typeof import("@nextpress-org/sdk");

/** Resolves the on-disk path for the shipped SDK entry (must live under dist/). */
export const resolveShippedSdkPath = (): string => {
	accessSync(distEntry);
	if (!distEntry.includes(distSegment)) {
		throw new Error(`Integration tests must import from dist, got: ${distEntry}`);
	}
	return distEntry;
};

/** Loads the built SDK bundle — same entry consumers get from npm. */
export const loadShippedSdk = async (): Promise<{
	sdk: ShippedSdkModule;
	modulePath: string;
}> => {
	const modulePath = resolveShippedSdkPath();
	const sdk = await import("@nextpress-org/sdk");
	return { sdk, modulePath };
};
