import type { EventBus } from "./event-bus.types.js";
import type { NextpressEventContext } from "./event-context.js";
import { runEventHandlers } from "./event-context.js";
import type { NextpressEventMap } from "./nextpress-events.js";

type AnyHandler = (ctx: unknown) => void;

/**
 * Creates a typed in-process event bus for SDK lifecycle hooks.
 * Handlers run synchronously in registration order after successful mutations.
 */
export function createEventBus(): EventBus<NextpressEventMap> {
	const listeners = new Map<string, Set<AnyHandler>>();

	const getSet = (event: string): Set<AnyHandler> => {
		let set = listeners.get(event);
		if (!set) {
			set = new Set();
			listeners.set(event, set);
		}
		return set;
	};

	const off = <K extends keyof NextpressEventMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<NextpressEventMap[K]>) => void,
	): void => {
		getSet(event).delete(handler as AnyHandler);
	};

	const on = <K extends keyof NextpressEventMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<NextpressEventMap[K]>) => void,
	): (() => void) => {
		getSet(event).add(handler as AnyHandler);
		return () => off(event, handler);
	};

	const once = <K extends keyof NextpressEventMap & string>(
		event: K,
		handler: (ctx: NextpressEventContext<NextpressEventMap[K]>) => void,
	): (() => void) => {
		const wrapper = (ctx: NextpressEventContext<NextpressEventMap[K]>) => {
			off(event, wrapper);
			handler(ctx);
		};
		return on(event, wrapper);
	};

	const emit = <K extends keyof NextpressEventMap & string>(
		event: K,
		payload: NextpressEventMap[K],
	): NextpressEventMap[K] => {
		return runEventHandlers(
			payload,
			getSet(event) as Set<(ctx: NextpressEventContext<NextpressEventMap[K]>) => void>,
		);
	};

	return { on, off, once, emit };
}
