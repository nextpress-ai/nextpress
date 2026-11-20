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
12. Runs `node dist/migrate.js` from the target app image when schema changes are declared (falls back to `pnpm drizzle-kit migrate` on older images).
13. Seeds default templates and themes if missing (`node dist/seed-default-content.js`).
14. Writes the target schema config into the install directory.
15. Starts the full stack and waits for `/api/health` before reporting success.
16. Turns on updates from the dashboard when the host runs systemd and the command runs as root (§3.0). Never fails the upgrade.

If the installed schema already matches the target schema, the command updates the image version, seeds defaults if missing, and restarts the stack without running migrations.

The command also takes an upgrade lock (`<install-dir>/.upgrade.lock`, needs `flock`), so an upgrade started
by hand and one started from the dashboard never run at the same time. The second one stops with "Another
NextPress update is already running on this server."

## 3.0 Update from the dashboard (one click)

Main-site admins (owner or admin of the default site) see "Update available" in the sidebar and, once the
dashboard mounts it, a notice on the dashboard. "Update now" shows what will happen, asks for their password,
then follows the update through the restart and opens What's New.

How it works, and why the app never gets Docker or host access:

1. The app only writes `request.json` into `<install-dir>/update`, mounted in the app container at
   `/app/update` (`docker-compose.prod.yml`). Routes: `GET /api/system/update/status`,
   `POST /api/system/update/start` (dashboard session + password, 5 tries per 15 minutes per person, never a
   second run while one is waiting or running). The server picks the version itself: the newest GitHub
   release, which must be newer than the installed one and equal what the person reviewed.
2. A systemd path unit on the host (`nextpress-update.path`, `PathExists=<install-dir>/update/request.json`)
   starts `nextpress-update.service`, which runs `nextpress --install-dir <dir> update-runner` as root.
3. The runner moves the request into `<install-dir>/update-logs` (root only, never visible to the app) before
   reading it, refuses links, other file types, files over 4 KB, malformed ids or versions, and requests older
   than 5 minutes. It asks GitHub for the newest release itself and refuses any other version. It refuses to
   start while another upgrade holds the lock.
4. It downloads `husseinkizz/nextpress:beta-v<version>` while the sites stay online (a failed download
   changes nothing), then runs the normal `nextpress upgrade --version beta-v<version>` (backup, migrations,
   restart, health check). Output goes to `<install-dir>/update-logs/update-<time>.log` (newest 10 kept).
5. If the upgrade fails, the runner puts the previous `NEXTPRESS_VERSION` back in `.env`, runs
   `compose up -d` and waits for the health check. The database stays as it is; the upgrade saved a copy
   before changing it. The dashboard then says what failed, which version is running, and the one command to
   run by hand.

Files in `<install-dir>/update` (the app can write here; everything else is the runner's):

| File | Written by | Purpose |
|---|---|---|
| `request.json` | app | `{ protocol, requestId, version, requestedBy, requestedAt }`, one key per line |
| `status.json` | runner | `running` (step `waiting`, `download`, `install`) → `done` / `failed` + code, log path |
| `runner.json` | `update-helper on/off` | `{ protocol, enabled, installDir, cliVersion }`: tells the app someone listens |

The runner writes these as temp files in `update-logs` and renames them in, so a link planted in `update`
is replaced, never written through. Protocol version 1 lives in `shared/core-update/types.ts` and
`scripts/nextpress` (`UPDATE_PROTOCOL`); a test checks they match, and that every failure code the runner
writes has a plain-language message in `shared/core-update/messages.ts`.

Setup: `nextpress install` and `nextpress upgrade` end by turning it on when the host runs systemd and the
command runs as root. Existing installs get it with one `sudo nextpress upgrade`. Turn it off or on:
`sudo nextpress update-helper off|on`; check it: `nextpress update-helper status`. Without systemd, or when
off, the dashboard says so and shows the command to run instead.

Troubleshooting:

- Dashboard says the server didn't start the update: `systemctl status nextpress-update.path` and
  `journalctl -u nextpress-update.service`.
- A run failed: read the log path the dashboard shows (also in `nextpress update-helper status`).

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
