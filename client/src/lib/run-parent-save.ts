export type ParentSaveRequest = () => void | Promise<boolean>;

/**
 * Starts one parent-owned save and releases its gate on either outcome.
 * This keeps repeated keyboard shortcuts from sending stale-version PUTs.
 */
export function runParentOwnedSave({
  inFlight,
  request,
}: {
  inFlight: { current: boolean };
  request: ParentSaveRequest;
}): boolean {
  if (inFlight.current) return false;

  inFlight.current = true;
  const release = () => {
    inFlight.current = false;
  };

  try {
    const result = request();
    if (result) {
      void result.then(release, release);
    } else {
      release();
    }
    return true;
  } catch (error) {
    release();
    throw error;
  }
}
