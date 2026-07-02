/**
 * In-memory undo/redo stack mirroring the dashboard `useUndoRedo` hook.
 * Keeps up to 50 snapshots; supports coalesced replace for rapid edits.
 */
export function createUndoStack<T>(initialState: T, maxHistory = 50) {
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
		getState,
		pushState,
		replaceCurrentState,
		undo,
		redo,
		canUndo,
		canRedo,
		resetState,
	};
}

export type UndoStack<T> = ReturnType<typeof createUndoStack<T>>;
