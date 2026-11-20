# NextPress Command Usage

**Type:** Reference  
**Date:** April 28, 2026  
**Author:** NextPress maintainers

## 1. Install The Command

Install NextPress and the standalone `nextpress` command:

```bash
curl -fsSL https://raw.githubusercontent.com/nextpress-ai/nextpress/main/install.sh | bash
```

The installer writes the command to `/usr/local/bin/nextpress`, verifies it, and runs `nextpress install`.

## 2. Global Options

Use a custom install directory:

```bash
nextpress --install-dir "$HOME/nextpress" status
```

Short form:

```bash
nextpress -d "$HOME/nextpress" status
```

The default install directory is `/opt/nextpress`.

## 3. Install

Install the latest image:

```bash
nextpress install
```

Install a specific image tag:

```bash
nextpress install --version beta-v1.0.2
```

The install command:

- Resolves `docker-compose.prod.yml`.
- Writes `.env` with generated secrets if needed.
- Writes the first Caddy config if needed.
- Pulls images.
- Starts PostgreSQL.
- Runs Drizzle migrations from the app image.
- Starts the app and Caddy.

## 4. Upgrade

Upgrade to the latest image:

```bash
nextpress upgrade
```

Upgrade to a specific image tag:

```bash
nextpress upgrade --version beta-v1.0.2
```

Explicit latest form:

```bash
nextpress upgrade --latest
```

Allow a database reset for incompatible schema changes:

```bash
nextpress upgrade --version beta-v1.0.2 --override
```

Use override mode without a confirmation prompt:

```bash
nextpress upgrade --version beta-v1.0.2 --override --yes
```

Standard upgrade preserves database data. Override mode creates a backup first, then resets the PostgreSQL data volume.

See [`upgrade-flow.md`](upgrade-flow.md) for schema behavior.

## 5. Operate

Show service status:

```bash
nextpress status
```

Follow all service logs:

```bash
nextpress logs
```

Follow one or more services:

```bash
nextpress logs app
nextpress logs postgres caddy
```

Restart all services:

```bash
nextpress restart
```

Reload Caddy:

```bash
nextpress reload
```

## 6. Export and Import

Export site data to a file:

```bash
nextpress export
```

Export everything, including media files:

```bash
nextpress export --with-media-files
```

Export specific entities for one site:

```bash
nextpress export --users --posts --site example.com
```

Export to a specific file:

```bash
nextpress export --out ~/backups/nextpress-export.tar.gz
```

The export command:

- Writes `nextpress-export-YYYYMMDD-HHMMSS.json` in the current directory (or `.tar.gz` when `--with-media-files` is given).
- Exports all entities when no entity flags are given: `users`, `sites`, `pages`, `blogs`, `posts`, `comments`, `media`, `templates`, `options`.
- Limits the export to one site with `--site <name>` (site name or hostname).
- Refuses to overwrite an existing file unless `--force` is given.

Import data from an export file:

```bash
nextpress import nextpress-export-20260827-120000.json
```

Import specific entities and leave existing rows untouched:

```bash
nextpress import nextpress-export.tar.gz --users --posts --mode skip
```

The import command:

- Restores the entities in the file (or only the flagged entities).
- Defaults to `--mode overwrite`, which refreshes existing rows; `--mode skip` leaves existing rows untouched.
- Requires the file to exist, be readable, and be non-empty.

## 6.2 Reset

Wipe the instance back to a fresh install: all data and uploaded media are
erased, migrations re-applied, and default content seeded:

```bash
nextpress reset
```

A database backup is written to `backups/` automatically before anything is
erased. The command prompts for confirmation; pass `--yes` to skip the
prompt:

```bash
nextpress reset --yes
```

Typical backup-and-restore flow:

```bash
nextpress export --out ~/data.json
nextpress reset
nextpress import ~/data.json
```

## 6.3 Restore

Put a database backup back. The files this restores are the `.sql` backups in
`backups/`, made before an upgrade, a reset or a restore:

```bash
nextpress restore backups/nextpress-db-20261025120000.sql
```

The command:

- Writes a backup of the current data to `backups/` before it changes anything.
- Prompts for confirmation; `--yes` skips the prompt.
- Stops the app while the database is replaced, then starts it again and checks its health.
- Runs migrations after the restore, so a backup from an older version is brought up to date.

For an export file (`.json` or `.tar.gz`), use `nextpress import` instead.

## 6.4 Reset Password

Set a new password for a locked-out account without touching site data:

```bash
nextpress reset-password you@example.com
```

The command asks for the new password twice without echoing it, saves it, and
signs that person out everywhere. For scripts, read the password from a pipe:

```bash
printf '%s' "$NEW_PASSWORD" | nextpress reset-password you@example.com --password-stdin
```

## 6.5 Updates From the Dashboard

Turn one-click updates from the admin dashboard on, off, or check them:

```bash
sudo nextpress update-helper on
sudo nextpress update-helper off
nextpress update-helper status
```

`nextpress install` and `nextpress upgrade` turn this on by themselves when the server runs systemd and the
command runs as root. It adds a small systemd watcher (`nextpress-update.path` and `.service`; installs outside
`/opt/nextpress` get their own names) that runs `nextpress update-runner` when the dashboard asks for an
update. Only the newest official release is ever installed, after a database backup, and the previous version
is put back if the upgrade fails. `off` removes the watcher; updates then work only with `nextpress upgrade`.
See [`upgrade-flow.md`](upgrade-flow.md) §3.0.

## 7. Uninstall

Uninstall requires confirmation through `--yes`:

```bash
nextpress uninstall --yes
```

This stops the compose stack, removes named volumes, removes NextPress images on a best effort basis, and removes the install directory.

## 8. Environment Variables

- `NEXTPRESS_INSTALL_DIR`: default install path when `--install-dir` is omitted.
- `NEXTPRESS_COMPOSE_URL`: compose file URL used by `nextpress install`.
- `NEXTPRESS_PUBLIC_IP`: public address shown in install output.
- `NEXTPRESS_RAW_BASE`: raw file base URL used by `install.sh`.
- `NEXTPRESS_BIN_PATH`: command install path used by `install.sh`.
- `NEXTPRESS_SKIP_DOCKER_INSTALL`: make missing Docker a hard installer error.

## 9. Version Output

Print the command version:

```bash
nextpress --version
nextpress version
```
