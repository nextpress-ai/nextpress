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

1. Reads the installed schema config.
2. Pulls the target image.
3. Reads the target image schema config.
4. Compares `schemaVersion` with `previousSchemaVersion`.
5. Starts PostgreSQL if needed.
6. Creates a database backup under `<install-dir>/backups`.
7. Runs `pnpm drizzle-kit migrate` from the target app image when schema changes are declared.
8. Seeds default templates and themes if missing (`node dist/seed-default-content.js`).
9. Writes the target schema config into the install directory.
10. Restarts the compose stack.

If the installed schema already matches the target schema, the command updates the image version and restarts the stack without running migrations.

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
