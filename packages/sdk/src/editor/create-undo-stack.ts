import type { UndoStack } from "./undo-stack.types.js";

/**
 * In-memory undo/redo stack mirroring the dashboard `useUndoRedo` hook.
 * Keeps up to 50 snapshots; supports coalesced replace for rapid edits.
 */
export function createUndoStack<T>(initialState: T, maxHistory = 50): UndoStack<T> {
	let history: T[] = [initialState];
	let currentIndex = 0;

	const canUndo = () => currentIndex > 0;
	const canRedo = () => currentIndex < history.length - 1;
	const getState = () => history[currentIndex];

	const pushState = (newState: T) => {
		if (history[currentIndex] === newState) {
			return;
		}

		const nextHistory = history.slice(0, currentIndex + 1);
		nextHistory.push(newState);

		if (nextHistory.length > maxHistory) {
			nextHistory.shift();
			currentIndex = nextHistory.length - 1;
		} else {
			currentIndex = nextHistory.length - 1;
		}

		history = nextHistory;
	};

	const replaceCurrentState = (newState: T) => {
		const nextHistory = [...history];
		nextHistory[currentIndex] = newState;
		history = nextHistory;
	};

	const undo = (): T | undefined => {
		if (!canUndo()) {
			return undefined;
		}
		currentIndex -= 1;
		return history[currentIndex];
	};

	const redo = (): T | undefined => {
		if (!canRedo()) {
			return undefined;
		}
		currentIndex += 1;
		return history[currentIndex];
	};

	const resetState = (nextState: T) => {
		history = [nextState];
		currentIndex = 0;
	};

	return {
		/** Read the current snapshot without mutating history. */
		getState,
		/** Record a new undo step after discrete editor actions. */
		pushState,
		/** Merge rapid edits into the current step instead of flooding history. */
		replaceCurrentState,
		/** Step back one snapshot when the user triggers undo. */
		undo,
		/** Step forward after undo without reloading content. */
		redo,
		/** Enable undo controls only when prior snapshots exist. */
		canUndo,
		/** Enable redo controls only after an undo. */
		canRedo,
		/** Discard history after load or version restore. */
		resetState,
	};
}

export type { UndoStack } from "./undo-stack.types.js";
