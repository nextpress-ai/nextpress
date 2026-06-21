import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';

/**
 * Creates user management routes for CRUD operations.
 * All routes require authentication.
 * 
 * Routes:
 * - GET / - List users with pagination and optional role filter
 * - GET /:id - Get single user by ID
 * - POST / - Create new user
 * - PUT /:id - Update existing user
 * - DELETE /:id - Delete user (prevents self-deletion)
 * 
 * @param deps - Injected dependencies (models, schemas, requireAuth, CONFIG)
 * @returns Express router with mounted user routes
 */
export function createUsersRoutes(deps: Deps): Router {
  const router = Router();

  /**
   * GET /
   * Lists all users with pagination support.
   */
  router.get('/', deps.requireAuth, asyncHandler(async (req, res) => {
    const { page, limit, offset } = deps.parsePaginationParams(
      req.query,
      deps.CONFIG.PAGINATION.DEFAULT_PAGE_SIZE
    );

    const users = await deps.models.users.findMany({
      limit,
      offset,
    });

    const total = await deps.models.users.count({});

    res.json({
      users,
      total,
      page,
      per_page: limit,
      total_pages: Math.ceil(total / limit),
    });
  }));

  /**
   * GET /:id
   * Retrieves a single user by ID.
   */
  router.get('/:id', deps.requireAuth, asyncHandler(async (req, res) => {
    const user = await deps.models.users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  }));

  /**
   * POST /
   * Creates a new user with hashed password.
   * Validates input with Zod schema.
   */
  router.post('/', deps.requireAuth, asyncHandler(async (req, res) => {
    const userData: any = deps.schemas.users.insert.parse(req.body);

    // Hash password if provided
    if (userData.password) {
      const bcrypt = await import('bcrypt');
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = await deps.models.users.create(userData);

    // Remove password from response
    const { password: _password, ...userResponse } = user;
    res.status(201).json(userResponse);
  }));

  /**
   * PUT /:id
   * Updates an existing user.
   * Hashes password if included in update.
   */
  router.put('/:id', deps.requireAuth, asyncHandler(async (req, res) => {
    const userData: any = deps.schemas.users.update.parse(req.body);

    // Hash password if provided
    if (userData.password) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;
      console.log('Password updated and hashed for user:', req.params.id);
    }

    const user = await deps.models.users.update(req.params.id, userData);

    // Remove password from response
    const { password: _password, ...userResponse } = user;
    res.json(userResponse);
  }));

  /**
   * DELETE /:id
   * Deletes a user by ID.
   * Prevents users from deleting their own account.
   */
  router.delete('/:id', deps.requireAuth, asyncHandler(async (req, res) => {
    // Prevent deletion of current user
    const currentUserId = deps.authService.getCurrentUserId(req);
    if (req.params.id === currentUserId) {
      return res
        .status(400)
        .json({ message: 'Cannot delete your own account' });
    }

    await deps.models.users.delete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  }));

  return router;
}
