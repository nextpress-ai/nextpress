import { models } from '../../storage';
import hooks from '../../hooks';
import { authService, requireAuth } from '../../auth';
import {
  CONFIG,
  parsePaginationParams,
  parseStatusParam,
  getSiteSettings,
} from '../../config';
import { getZodSchema } from '../../../shared/zod-schema';
import multer from 'multer';
import path from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Zod validation schemas for all content types
 */
export type Schemas = {
  posts: ReturnType<typeof getZodSchema>;
  pages: ReturnType<typeof getZodSchema>;
  comments: ReturnType<typeof getZodSchema>;
  media: ReturnType<typeof getZodSchema>;
  templates: ReturnType<typeof getZodSchema>;
  users: ReturnType<typeof getZodSchema>;
  blogs: ReturnType<typeof getZodSchema>;
};

/**
 * Dependencies injected into all route modules.
 * Enables testing by allowing mock implementations.
 */
export interface Deps {
  models: typeof models;
  hooks: typeof hooks;
  authService: typeof authService;
  requireAuth: typeof requireAuth;
  CONFIG: Readonly<typeof CONFIG>;
  parsePaginationParams: typeof parsePaginationParams;
  parseStatusParam: typeof parseStatusParam;
  getSiteSettings: typeof getSiteSettings;
  schemas: Schemas;
  upload: multer.Multer;
  uploadDir: string;
}

/**
 * Configures multer for file uploads with security restrictions
 */
async function buildUpload(configObj: Readonly<typeof CONFIG>) {
  const uploadDir = path.join(process.cwd(), 'uploads');

  // Ensure upload directory exists
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: configObj.UPLOAD.LIMIT },
    fileFilter: (_req, file, cb) => {
      if (configObj.UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    },
  });

  return { upload, uploadDir };
}

/**
 * Builds the dependency injection container.
 * Call once at app startup before registering routes.
 * 
 * @returns Complete dependencies object for all route modules
 */
export async function buildDeps(): Promise<Deps> {
  const schemas: Schemas = {
    posts: getZodSchema('posts'),
    pages: getZodSchema('pages'),
    comments: getZodSchema('comments'),
    media: getZodSchema('media'),
    templates: getZodSchema('templates'),
    users: getZodSchema('users'),
    blogs: getZodSchema('blogs'),
  };

  const { upload, uploadDir } = await buildUpload(CONFIG);

  return {
    models,
    hooks,
    authService,
    requireAuth,
    CONFIG,
    parsePaginationParams,
    parseStatusParam,
    getSiteSettings,
    schemas,
    upload,
    uploadDir,
  };
}
