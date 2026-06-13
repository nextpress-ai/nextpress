# NextPress Upgrade Flow

**Type:** Guide  
**Date:** April 28, 2026  
**Author:** NextPress maintainers

## 1. Intent

The upgrade flow preserves site data by default while allowing a controlled reset when an instance cannot move through the normal schema chain.

The `nextpress upgrade` command owns schema application. The application container does not apply schema changes during startup.

## 2. Release Metadata

Each production image includes `nextpress.config.json` at `/app/nextpress.config.json`.

```json
{
  "schemaVersion": "2026.04.28.001",
  "previousSchemaVersion": "legacy",
  "schemaPath": "shared/schema.ts",
  "hasSchemaChanges": true
}
```

Fields:

- `schemaVersion`: schema state expected by the release.
- `previousSchemaVersion`: schema state accepted for a direct upgrade.
- `schemaPath`: schema source path inside the release.
- `hasSchemaChanges`: whether upgrade needs the migration flow.

The installed copy lives at `<install-dir>/nextpress.config.json`.

## 3. Standard Upgrade

Run:

```bash
nextpress upgrade
```

Or choose a specific image tag:

```bash
nextpress upgrade --version beta-v1.0.2
```

The command does this:

1. Self-updates the `nextpress` CLI from the release URL when a newer script is published.
2. Stops app and Caddy before database work (avoids query traffic during Postgres recovery).
3. Refreshes `docker-compose.prod.yml` from the canonical compose URL.
4. Prunes stale Docker images and old SQL backups (keeps the 3 newest).
5. Verifies free disk space (≥1 GB install dir, ≥2 GB Docker data root) before continuing.
6. Reads the installed schema config.
7. Pulls the target image.
8. Reads the target image schema config.
9. Compares `schemaVersion` with `previousSchemaVersion`.
10. Starts PostgreSQL if needed and waits until it accepts queries (`SELECT 1`).
11. Creates a database backup under `<install-dir>/backups` when schema changes are declared.
12. Runs `pnpm drizzle-kit migrate` from the target app image when schema changes are declared.
13. Seeds default templates and themes if missing (`node dist/seed-default-content.js`).
14. Writes the target schema config into the install directory.
15. Starts the full stack and waits for `/api/health` before reporting success.

If the installed schema already matches the target schema, the command updates the image version, seeds defaults if missing, and restarts the stack without running migrations.

## 3.1 Disk space

Upgrades refuse to continue when disk is too low for image pull, backup, and Postgres checkpoint I/O:

- **Install directory:** at least **1 GB** free (`/opt/nextpress` by default).
- **Docker data root:** at least **2 GB** free (usually `/var/lib/docker`).

The command prunes dangling Docker layers and old `nextpress-db-*.sql` backups (keeps 3) before checking. If space is still insufficient, free disk on the host and rerun `nextpress upgrade`.

## 3.2 Service readiness

Postgres health uses a real query, not `pg_isready` alone. The app is not started until Postgres accepts connections and `/api/health` returns OK.

## 4. Incompatible Schema Chain

If the installed schema does not match the target release `previousSchemaVersion`, the command stops before changing the database.

Example:

```text
Error: Schema upgrade expects incompatible-test but this install is on 2026.04.28.002.
```

Use an intermediate release first, or use override mode if preserving old database data is not required.

## 5. Override Mode

Run:

```bash
nextpress upgrade --version beta-v1.0.2 --override
```

For non-interactive use:

```bash
nextpress upgrade --version beta-v1.0.2 --override --yes
```

Override mode:

1. Starts PostgreSQL if needed.
2. Creates a database backup.
3. Requires confirmation unless `--yes` is present.
4. Stops the compose stack.
5. Removes the PostgreSQL data volume.
6. Starts PostgreSQL with a fresh volume.
7. Runs target image migrations.
8. Writes the target schema config.
9. Restarts the compose stack.

Override mode resets database data. It does not intentionally remove uploads or Caddy data.

## 6. Backups

Backups are SQL dumps created by `pg_dump`.

Path format:

```text
<install-dir>/backups/nextpress-db-YYYYMMDDHHMMSS.sql
```

The command refuses to continue if the backup cannot be created.

## 7. Responsibilities

The command is responsible for:

- Schema version checks.
- Database backups before schema changes.
- Running Drizzle migrations.
- Restarting services after a successful upgrade.
- Refusing incompatible upgrades unless override mode is used.

The command is not responsible for:

- Restoring a backup automatically.
- Running down migrations.
- Preserving database data during override mode.
- Creating release metadata automatically.

## 8. Release Rules

For each release:

- Update `nextpress.config.json` when schema expectations change.
- Keep old migration files unchanged after release.
- Set `hasSchemaChanges` to `true` when migrations need to run.
- Set `previousSchemaVersion` to the direct source schema version.
- Use staged schema changes for destructive database changes.
