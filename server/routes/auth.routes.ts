import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';

/**
 * Compatibility auth routes layered before the Better Auth catch-all handler.
 * Login, register, and logout are handled by Better Auth at /api/auth/*.
 */
export function createAuthRoutes(deps: Deps): Router {
  const router = Router();

  /**
   * GET /user
   * Returns the CMS user record for the current Better Auth session.
   */
  router.get('/user', asyncHandler(async (req, res) => {
    const user = await deps.authService.getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json(user);
  }));

  return router;
}
