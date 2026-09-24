import { useSyncExternalStore } from "react";
import {
	colorSwatchKey,
	type ColorSwatchItem,
} from "@shared/collect-canvas-colors";
import { readFill, type GradientFill } from "@shared/fill-model";
import { safeCssColor } from "@shared/css-safe";

const STORAGE_KEY = "npb:recent-colors";
const MAX_RECENT = 12;

const listeners = new Set<() => void>();
let cache: ColorSwatchItem[] = readStored();

function emit(): void {
	for (const listener of listeners) listener();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readItem(value: unknown): ColorSwatchItem | undefined {
	if (!isRecord(value)) return undefined;
	if (value.kind === "solid") {
		const color = safeCssColor(value.color);
		return color ? { kind: "solid", color } : undefined;
	}
	if (value.kind === "gradient") {
		const fill = readFill(value.fill);
		return fill?.kind === "gradient" ? { kind: "gradient", fill } : undefined;
	}
	return undefined;
}

function readStored(): ColorSwatchItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item) => {
			const read = readItem(item);
			return read ? [read] : [];
		}).slice(0, MAX_RECENT);
	} catch {
		return [];
	}
}

function persist(items: ColorSwatchItem[]): void {
	cache = items;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		// Private mode can refuse writes; the in-memory list still works this session.
	}
	emit();
}

/** Adds a picked colour or gradient to the front of Recent, dropping repeats. */
export function rememberRecentColor(item: ColorSwatchItem): void {
	const next = [item, ...cache.filter((row) => colorSwatchKey(row) !== colorSwatchKey(item))].slice(
		0,
		MAX_RECENT,
	);
	persist(next);
}

export function subscribeRecentColors(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getRecentColors(): ColorSwatchItem[] {
	return cache;
}

/** Recent colours for a component. Empty on the server so first paint matches. */
export function useRecentColors(): ColorSwatchItem[] {
	return useSyncExternalStore(subscribeRecentColors, getRecentColors, () => []);
}

/** Test helper: wipe memory so one test does not leak into the next. */
export function resetRecentColors(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
	cache = [];
	emit();
}

export type { ColorSwatchItem, GradientFill };
