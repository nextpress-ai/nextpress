# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm (11.x needs Node >= 22.13 for node:sqlite)
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy package files (workspace config authorizes native build scripts for pnpm 11)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build frontend and backend
RUN pnpm build

# Runtime stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm for running drizzle-kit (fallback until all CLIs use dist/migrate.js)
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy package files (workspace config authorizes native build scripts for pnpm 11)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only (lockfile; drizzle-kit is added next at a pinned version)
RUN pnpm install --frozen-lockfile --prod

# drizzle-kit is a devDependency; pin the lockfile version for the CLI fallback
RUN pnpm add drizzle-kit@0.31.10

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy files needed for drizzle migrations
COPY drizzle.config.ts ./
COPY migrations ./migrations
COPY shared ./shared
COPY nextpress.config.json ./

# Create uploads directory
RUN mkdir -p uploads

# Expose the application port
EXPOSE 5000

# Schema updates are applied by the nextpress CLI before app startup.
CMD ["node", "dist/index.js"]
