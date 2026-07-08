/** In-memory undo/redo stack mirroring the dashboard `useUndoRedo` hook. */
export type UndoStack<T> = {
	/** Read the current snapshot without mutating history. */
	getState: () => T;
	/** Record a new undo step after discrete editor actions. */
	pushState: (newState: T) => void;
	/** Merge rapid edits into the current step instead of flooding history. */
	replaceCurrentState: (newState: T) => void;
	/** Step back one snapshot when the user triggers undo. */
	undo: () => T | undefined;
	/** Step forward after undo without reloading content. */
	redo: () => T | undefined;
	/** Enable undo controls only when prior snapshots exist. */
	canUndo: () => boolean;
	/** Enable redo controls only after an undo. */
	canRedo: () => boolean;
	/** Discard history after load or version restore. */
	resetState: (nextState: T) => void;
};
