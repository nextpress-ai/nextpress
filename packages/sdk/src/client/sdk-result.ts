import type { NextpressError } from "./nextpress-error.js";

/** Optimistic concurrency error when remote version does not match expected. */
export const VERSION_STALE = "VERSION_STALE" as const;

/** Client omitted or sent invalid expectedVersion on PUT. */
export const VERSION_REQUIRED = "VERSION_REQUIRED" as const;

/** Page create slug collision. */
export const PAGE_SLUG_EXISTS = "PAGE_SLUG_EXISTS" as const;

export type SdkOk<T> = {
	readonly isOk: true;
	readonly isErr: false;
	/** Alias for agents expecting `isError` — always false on success. */
	readonly isError: false;
	readonly value: T;
};

export type SdkErr = {
	readonly isOk: false;
	readonly isErr: true;
	/** Alias for agents expecting `isError`. */
	readonly isError: true;
	readonly error: NextpressError;
};

/** SDK mutation result — check `isErr` or `isError` before using `value`. */
export type SdkResult<T> = SdkOk<T> | SdkErr;

/** Wraps a successful SDK mutation value. */
export const sdkOk = <T>(value: T): SdkOk<T> => ({
	isOk: true,
	isErr: false,
	isError: false,
	value,
});

/** Wraps a failed SDK mutation. */
export const sdkErr = (error: NextpressError): SdkErr => ({
	isOk: false,
	isErr: true,
	isError: true,
	error,
});
