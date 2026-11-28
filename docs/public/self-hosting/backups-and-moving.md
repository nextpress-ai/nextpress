---
title: Back up and move your data
description: The copies NextPress makes, how to export and import your data with the nextpress command, and what to keep before you move or uninstall.
order: 3
type: Guide
---

# Back up and move your data

NextPress makes or lets you make three kinds of copies:

| Copy | Who makes it | What it is for |
|---|---|---|
| Database backup | NextPress, before an upgrade changes the database, and before a reset or override | Going back to the database as it was |
| Export file | You, with `nextpress export` | Keeping a copy of your data, or moving it to another install |
| Page file | You, from the **Pages** screen | Moving one page. See [Move pages between sites](/docs/content/move-pages-between-sites) |

## Database backups

- Saved in the `backups` folder of the install, such as `/opt/nextpress/backups/nextpress-db-20261025120000.sql`.
- Made with `pg_dump`, the standard PostgreSQL backup tool.
- If the backup fails, the upgrade stops before it changes anything.
- Before each upgrade, all but the three newest backups are removed.

NextPress does not restore a backup unless you ask it to. To put a backup back, run:

```bash
nextpress restore backups/nextpress-db-20261025120000.sql
```

Restore replaces everything in the database with the backup. It writes a fresh backup of the current data to the `backups` folder first, asks for confirmation, and stops the app while the database is replaced. The app starts again afterwards and is checked. Backups stay on the same server, so also keep an export somewhere else.

## Export your data

1. Sign in to the server and go to the folder where the file should be saved.
2. Run:

   ```bash
   nextpress export
   ```

3. The file `nextpress-export-YYYYMMDD-HHMMSS.json` appears in the current folder.

To include uploaded files such as pictures and videos, add `--with-media-files`. The file is then a `.tar.gz`:

```bash
nextpress export --with-media-files --out ~/nextpress-export.tar.gz
```

Export options:

| Option | What it does |
|---|---|
| `--users`, `--sites`, `--pages`, `--blogs`, `--posts`, `--comments`, `--media`, `--templates`, `--options` | Export only these kinds of data. With none, all of them are exported |
| `--site <name>` | Export only one site, by name or address |
| `--with-media-files` | Include the uploaded files |
| `--out <path>` | Write to this file |
| `--force` | Replace an existing file. Without it, the export refuses to overwrite |

```bash
nextpress export --users --posts --site example.com
```

The export is written to a temporary file first, so a failed export never damages an existing file.

## Import an export

1. Copy the export file to the server.
2. Run:

   ```bash
   nextpress import nextpress-export-20261025-120000.json
   ```

By default, the import replaces rows that already exist with the ones in the file. To keep existing rows and add only what is missing, use `--mode skip`:

```bash
nextpress import nextpress-export.tar.gz --posts --mode skip
```

The same entity options as the export choose what to import. The file must exist, be readable and not be empty. Export and import both need NextPress to be running.

Try an import on a second install before you rely on an export.

## Before you move to a new server or uninstall

1. Make an export with `--with-media-files`.
2. Check the file exists and its size is what you expect.
3. Copy it off the server.
4. Keep a copy of the install's `.env` file somewhere safe. It holds the secrets of the install, including the one that protects saved AI keys.

Uninstalling removes the database, the uploaded files and the install folder. Only an export kept elsewhere can bring the content back.

## Next steps

- [The nextpress command](/docs/self-hosting/nextpress-command).
- [Upgrade NextPress](/docs/getting-started/upgrade).
- [Troubleshooting](/docs/self-hosting/troubleshooting).
