import { defineConfig } from 'tsup';
import path from 'path';
import { TsconfigPathsPlugin } from '@esbuild-plugins/tsconfig-paths';

const projectRoot = import.meta.dirname;
const nodeResolveConfigShim = path.join(
  projectRoot,
  'shared/tailwind-resolve-config.node.ts',
);

export default defineConfig({
  entry: [
    'server/index.ts',
    'server/seed-default-content.ts',
    'server/migrate.ts',
    'server/setup-vite.ts',
    'server/transfer-cli.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  clean: false, // Don't clean dist folder - vite builds to dist/public first
  splitting: false,
  skipNodeModulesBundle: true,
  tsconfig: 'tsconfig.server.json',
  esbuildOptions(options) {
    // Server tsconfig inherits jsx: preserve; without this, tsup emits
    // React.createElement and MarkdownSsrBlock throws in production.
    options.jsx = 'automatic';
  },
  esbuildPlugins: [
    TsconfigPathsPlugin({
      tsconfig: 'tsconfig.server.json',
    }),
    {
      name: 'node-tailwind-resolve-config',
      setup(build) {
        build.onResolve({ filter: /tailwind-resolve-config\.browser/ }, () => ({
          path: nodeResolveConfigShim,
        }));
      },
    },
  ],
  // Externalize packages that should not be bundled
  external: [
    'pg',
    'bcrypt',
    '@electric-sql/pglite',
    '@neondatabase/serverless',
    'express',
    'passport',
    'multer',
  ],
});
