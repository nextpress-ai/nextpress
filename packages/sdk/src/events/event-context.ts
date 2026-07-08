/** Merge a partial patch or updater into the entity the event is about. */
export type EventSetFn<T> = (
	patch: Partial<T> | ((current: T) => Partial<T>),
) => void;

/** Domain entity passed to handlers with a contextual {@link EventSetFn}. */
export type EventEntity<T> = T & {
	/**
	 * Mutate only this entity for later handlers and return values.
	 * To change other resources, call SDK methods on the client instead.
	 */
	set: EventSetFn<T>;
};

/** Keys on event payloads that expose `.set()` on the subject entity. */
const MUTABLE_KEYS = new Set([
	"post",
	"page",
	"template",
	"blog",
	"comment",
	"media",
	"user",
	"site",
	"token",
	"theme",
	"settings",
	"data",
	"blocks",
	"content",
	"value",
]);

type MutableKey =
	| "post"
	| "page"
	| "template"
	| "blog"
	| "comment"
	| "media"
	| "user"
	| "site"
	| "token"
	| "theme"
	| "settings"
	| "data"
	| "blocks"
	| "content"
	| "value";

/** Handler context: subject entities are {@link EventEntity}; metadata fields stay plain. */
export type NextpressEventContext<T> = {
	[K in keyof T]: K extends MutableKey ? EventEntity<T[K]> : T[K];
};

const clonePayload = <T>(value: T): T => structuredClone(value);

const applyEntityPatch = <T>(current: T, patch: Partial<T> | ((current: T) => Partial<T>)): T => {
	const next = typeof patch === "function" ? patch(current) : patch;

	if (
		typeof current === "object" &&
		current !== null &&
		!Array.isArray(current) &&
		typeof next === "object" &&
		next !== null &&
		!Array.isArray(next)
	) {
		return { ...current, ...next };
	}

	return next as T;
};

const wrapMutableEntities = <T extends Record<string, unknown>>(
	state: T,
): NextpressEventContext<T> => {
	const ctx = { ...state } as NextpressEventContext<T>;

	for (const key of Object.keys(state)) {
		if (!MUTABLE_KEYS.has(key)) {
			continue;
		}

		const typedKey = key as keyof T & MutableKey;
		const value = state[typedKey];
		const entity = (
			typeof value === "object" && value !== null && !Array.isArray(value)
				? { ...value }
				: Array.isArray(value)
					? [...value]
					: value
		) as EventEntity<T[typeof typedKey]>;

		entity.set = (patch) => {
			const current = state[typedKey];
			const next = applyEntityPatch(current, patch);
			state[typedKey] = next;

			if (Array.isArray(next) && Array.isArray(entity)) {
				entity.splice(0, entity.length, ...next);
				return;
			}

			if (typeof next === "object" && next !== null && !Array.isArray(next)) {
				Object.assign(entity, next);
			}
		};

		(ctx as Record<string, unknown>)[key] = entity;
	}

	return ctx;
};

/**
 * Builds a mutable event context and runs handlers in registration order.
 * Returns the final plain payload after all entity `set` calls.
 */
export const runEventHandlers = <T extends Record<string, unknown>>(
	payload: T,
	handlers: Set<(ctx: NextpressEventContext<T>) => void>,
): T => {
	const state = clonePayload(payload) as T;

	for (const handler of handlers) {
		handler(wrapMutableEntities(state));
	}

	return state;
};

const entityKeys = [
	"post",
	"page",
	"template",
	"blog",
	"comment",
	"media",
	"user",
	"site",
	"token",
	"theme",
	"settings",
	"data",
] as const;

/**
 * Keeps chained events for one HTTP mutation aligned with handler mutations so far.
 */
export const syncPayloadWithResult = <T extends Record<string, unknown>>(
	payload: T,
	result: unknown,
): T => {
	for (const key of entityKeys) {
		if (key in payload) {
			return { ...payload, [key]: result };
		}
	}
	return payload;
};

/**
 * When handlers mutate entity fields on an event, prefer that entity as the HTTP result.
 */
export const pickMutatedEntityResult = (
	result: unknown,
	payload: Record<string, unknown>,
): unknown => {
	for (const key of entityKeys) {
		if (key in payload && payload[key] !== undefined) {
			return payload[key];
		}
	}

	return result;
};
