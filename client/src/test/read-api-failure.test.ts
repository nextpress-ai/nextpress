import { describe, expect, it } from 'vitest';
import { readApiFailure } from '@/lib/queryClient';

describe('readApiFailure', () => {
  it('keeps the remote version on a stale save', () => {
    expect(
      readApiFailure(
        JSON.stringify({
          code: 'VERSION_STALE',
          message: 'Remote version 5 does not match expected 3.',
          remoteVersion: 5,
        }),
      ),
    ).toEqual({
      message: 'Remote version 5 does not match expected 3.',
      code: 'VERSION_STALE',
      remoteVersion: 5,
    });
  });

  it('keeps a plain text body', () => {
    expect(readApiFailure('nope')).toEqual({ message: 'nope' });
  });
});
