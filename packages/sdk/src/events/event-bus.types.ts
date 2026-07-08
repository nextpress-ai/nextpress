import type { EventEntity, EventSetFn, NextpressEventContext } from "./event-context.js";

/** Typed pub/sub surface exposed on {@link NextpressClient}. */
export type EventBus<TMap extends Record<string, unknown>> = {
	/** Subscribe to an SDK event. Returns an unsubscribe function. */
	on: <K extends keyof TMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<TMap[K]>) => void,
	) => () => void;
	/** Remove a handler previously registered with `on` or `once`. */
	off: <K extends keyof TMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<TMap[K]>) => void,
	) => void;
	/** Subscribe once; the handler is removed after the first emission. */
	once: <K extends keyof TMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<TMap[K]>) => void,
	) => () => void;
	/** Emit an event (used internally by the SDK). Returns the payload after handler mutations. */
	emit: <K extends keyof TMap & string>(event: K, payload: TMap[K]) => TMap[K];
};

export type { EventEntity, EventSetFn, NextpressEventContext };
