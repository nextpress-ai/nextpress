import { NextpressError } from "../client/nextpress-error.js";
import { sdkErr, sdkOk, VERSION_STALE, type SdkResult } from "../client/sdk-result.js";
import type { BlockConfig } from "../types/domain.js";
import { patchBlockTree, type BlockPatchOp, type PatchBlockTreeOk } from "./patch-block-tree.js";

export type PatchBlocksParams = {
	id: string;
	expectedVersion: number;
	ops: BlockPatchOp[];
};

export type PatchBlocksSuccess<T> = {
	entity: T;
	summary: PatchBlockTreeOk["summary"];
};

type VersionedWithBlocks = {
	blocks?: BlockConfig[] | null;
	version?: number;
};

/**
 * Shared get→patch→validate→update flow for pages and posts.
 */
export async function runPatchBlocks<T extends VersionedWithBlocks>({
	id,
	expectedVersion,
	ops,
	get,
	update,
	label,
}: PatchBlocksParams & {
	get: (params: { id: string }) => Promise<T>;
	update: (params: {
		id: string;
		expectedVersion: number;
		blocks: BlockConfig[];
	}) => Promise<SdkResult<T>>;
	label: string;
}): Promise<SdkResult<PatchBlocksSuccess<T>>> {
	if (!ops.length) {
		return sdkErr(
			new NextpressError({
				message: `${label}: ops must include at least one patch operation`,
				status: 400,
				code: "PATCH_EMPTY",
			}),
		);
	}

	const current = await get({ id });
	const remoteVersion = current.version ?? 0;
	if (remoteVersion !== expectedVersion) {
		return sdkErr(
			new NextpressError({
				message: `Remote version ${remoteVersion} does not match expected ${expectedVersion}. Fetch latest and retry.`,
				status: 409,
				code: VERSION_STALE,
				body: { remoteVersion, expectedVersion },
			}),
		);
	}

	const patched = patchBlockTree({
		blocks: (current.blocks as BlockConfig[] | null | undefined) ?? [],
		ops,
		validate: true,
	});

	if (!patched.ok) {
		return sdkErr(
			new NextpressError({
				message: patched.error.message,
				status: 400,
				code: patched.error.code,
				body: patched.error,
			}),
		);
	}

	const saved = await update({
		id,
		expectedVersion,
		blocks: patched.blocks,
	});

	if (saved.isErr) {
		return saved;
	}

	return sdkOk({
		entity: saved.value,
		summary: patched.summary,
	});
}
