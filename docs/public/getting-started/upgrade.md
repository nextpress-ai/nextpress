---
title: Upgrade NextPress
description: Move to a new version from the dashboard or the command line, what each way does, and what to do when an upgrade stops.
order: 4
type: Guide
---

# Upgrade NextPress

An upgrade keeps your pages, posts, media and settings. When the new version changes the database, NextPress saves a copy of the database on the server first. You can upgrade from the dashboard or from the command line.

## Before you start

- Make an export and keep it off the server. See [Back up and move your data](/docs/self-hosting/backups-and-moving).
- Check free disk space: at least 1 GB in the install folder (`/opt/nextpress` by default) and at least 2 GB in Docker's data folder (usually `/var/lib/docker`).

## Upgrade from the dashboard

Only the owner and admins of the main site see updates, because an update restarts every site in the install.

1. When a new version is out, the sidebar shows **Update available** with the version number. Press **Update now**.
2. Read **What happens** in the dialog.
3. Enter your password.
4. Press **Update now**.
5. Wait. The dialog shows each step: getting ready, downloading, installing and restarting, and checking. The page reloads by itself when the update is done, then **What's New** opens.

What a dashboard update does:

- Saves a copy of the database on the server before any change to it.
- Downloads the new version while your sites stay online.
- Takes your sites offline for a short time while NextPress restarts. The dialog states how long.
- Installs only the newest official release.
- If anything fails, goes back to the version you were running.

If the update does not finish, the dialog says what happened and shows the command to run on the server instead.

Dashboard updates need the update helper on the server. If it is off, the dashboard shows the command to run by hand. To check it or switch it:

```bash
nextpress update-helper status
sudo nextpress update-helper on
sudo nextpress update-helper off
```

Turning it on needs systemd and root.

## Upgrade from the command line

Sign in to the server and run:

```bash
nextpress upgrade
```

To move to one version, give its tag:

```bash
nextpress upgrade --version beta-v1.5.0
```

The command:

1. Updates the `nextpress` command itself when a newer one is published.
2. Stops the app and Caddy.
3. Downloads the latest setup file.
4. Frees disk space: removes old NextPress images, unused Docker images, and all but the three newest database backups.
5. Checks free disk space.
6. Downloads the new version.
7. If the version changes the database: saves a database backup, then applies the changes.
8. Starts everything and waits until NextPress answers.

A command-line upgrade does not go back to the old version by itself when it fails. Read the message, fix the cause, and run it again.

Only one upgrade runs at a time. A second one stops with **Another NextPress update is already running on this server.**

## When the versions are too far apart

Each version names the database layout it can upgrade from. If your install is older, the upgrade stops before it changes anything:

```text
Error: Schema upgrade expects 2026.06.21.001 but this install is on 2026.04.28.002. Upgrade through the required intermediate version, or rerun with --override if you accept database reset.
```

Upgrade to an in-between version first, then upgrade again.

If you do not need the data, override mode starts the database fresh:

```bash
nextpress upgrade --version beta-v1.5.0 --override
```

Override mode saves a backup, asks you to type `yes`, then erases the database. Add `--yes` only in scripts where a person has already agreed.

## Next steps

- [Back up and move your data](/docs/self-hosting/backups-and-moving).
- [The nextpress command](/docs/self-hosting/nextpress-command).
- [Troubleshooting](/docs/self-hosting/troubleshooting) if an upgrade stops.
