import { Router } from 'express';
import type { Deps } from './shared/deps';
import { asyncHandler } from './shared/async-handler';
import { auth } from '../lib/better-auth';
import { updateCaddyConfig } from '../utils/caddy';
import {
  getCaddyTlsHostnames,
  validateDomain,
} from '../utils/validate-domain';
import { normalizeSetupSiteUrl } from '../utils/normalize-setup-site-url';
import { collectErrorText } from '../utils';
import { verifyDomainReadiness } from '../utils/verify-domain-readiness';
import { seedDefaultContent } from '../seed-default-content';

/**
 * Password validation: minimum 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Creates setup routes for initial system configuration.
 * 
 * Routes:
 * - GET /api/setup/status - Check if system is configured
 * - GET /api/setup/verify-domain - DNS / IP / Caddy readiness (no auth; used by setup + settings UI)
 * - POST /api/setup - Complete initial setup (create admin + site)
 * 
 * @param deps - Injected dependencies (models, schemas)
 * @returns Express router with setup routes
 */
export function createSetupRoutes(deps: Deps): Router {
  const router = Router();

  /**
   * GET /api/setup/status
   * Returns whether the system has been configured (has at least one site)
   */
  router.get('/status', asyncHandler(async (_req, res) => {
    const sites = await deps.models.sites.findMany();
    res.json({ isSetup: sites.length > 0 });
  }));

  /**
   * GET /api/setup/verify-domain?q=
   * Debounced domain checker for the UI (DNS A, optional PUBLIC_IPV4 match, optional Caddy Host probe).
   */
  router.get('/verify-domain', asyncHandler(async (req, res) => {
    const raw = typeof req.query.q === 'string' ? req.query.q : '';
    const result = await verifyDomainReadiness(raw);
    if (!result.status) {
      return res.status(400).json({ status: false, message: result.message });
    }
    res.json({ status: true, data: result.data });
  }));

  /**
   * POST /api/setup
   * Initial system setup - creates admin user and default site.
   * Also updates Caddy configuration with the provided domain.
   */
  router.post('/', asyncHandler(async (req, res) => {
    const { email, password, username, siteName, domain } = req.body;

    try {
    // Validate required fields
    if (!email || !password || !siteName || !domain) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide email, password, siteName, and domain',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordCheck.message,
      });
    }

    // Validate every hostname Caddy will serve (apex + www for public DNS names)
    const tlsHosts = getCaddyTlsHostnames(domain);
    for (const host of tlsHosts) {
      const domainCheck = await validateDomain(host);
      if (!domainCheck.valid) {
        return res.status(400).json({
          error: 'Domain validation failed',
          message: `${domainCheck.message} (host: ${host})`,
        });
      }
    }

    // Check if already setup
    const existingSites = await deps.models.sites.findMany();
    if (existingSites.length > 0) {
      return res.status(400).json({
        error: 'Already configured',
        message: 'System has already been configured',
      });
    }

    // Generate username from email if not provided
    const finalUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

    const existingEmailUser = await deps.models.users.findByEmail(email);
    let adminUser = existingEmailUser;

    if (adminUser) {
      try {
        await auth.api.signInEmail({
          body: { email, password },
        });
      } catch {
        return res.status(400).json({
          error: 'Email taken',
          message: 'An account with this email already exists',
        });
      }
    } else {
      const existingUser = await deps.models.users.findByUsername(finalUsername);
      if (existingUser) {
        return res.status(400).json({
          error: 'Username taken',
          message: 'Please choose a different username',
        });
      }

      const signUpResult = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: 'Admin',
          username: finalUsername,
          firstName: 'Admin',
        },
      });

      if (!signUpResult?.user?.id) {
        return res.status(500).json({
          error: 'Setup failed',
          message: 'Could not create admin account',
        });
      }

      adminUser = await deps.models.users.findById(signUpResult.user.id);
      if (!adminUser) {
        return res.status(500).json({
          error: 'Setup failed',
          message: 'Admin account was created but could not be loaded',
        });
      }
    }

    // Get admin role
    const adminRole = await deps.models.roles.findByName('admin');

    const siteUrl = normalizeSetupSiteUrl(domain);
    const siteBase = siteUrl.replace(/\/+$/, '');
    const loginUrl = `${siteBase}/admin/login`;

    // Create site (marked as default)
    const site = await deps.models.sites.create({
      name: siteName,
      description: `${siteName} - Powered by NextPress`,
      siteUrl,
      ownerId: adminUser.id,
      isDefault: true,
      settings: {
        general: {
          siteName,
          siteUrl,
          adminEmail: email,
        },
      },
    });

    // Assign admin role to user for this site
    if (adminRole) {
      await deps.models.userRoles.assignRole(
        adminUser.id,
        adminRole.id,
        site.id
      );
    }

    await seedDefaultContent();

    // Update Caddyfile
    const caddyResult = await updateCaddyConfig(domain, { acmeEmail: email });
    console.log('Caddy update:', caddyResult.message);

    res.json({
      success: true,
      message: 'Setup complete! You can now log in.',
      redirect: '/admin/login',
      loginUrl,
      caddySuccess: caddyResult.success,
      caddyStatus: caddyResult.message,
    });
    } catch (error: unknown) {
      console.error('Setup failed:', collectErrorText(error));
      return res.status(500).json({
        error: 'Setup failed',
        message: collectErrorText(error),
      });
    }
  }));

  return router;
}
