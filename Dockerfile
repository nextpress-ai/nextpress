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

# Install pnpm for running drizzle-kit
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy package files (workspace config authorizes native build scripts for pnpm 11)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod

# Install drizzle-kit for migrations (needed at runtime)
RUN pnpm add drizzle-kit

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
