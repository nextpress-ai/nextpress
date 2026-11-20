---
title: Troubleshooting
description: Common problems with installs, domains, upgrades, sign-in, pages, the AI assistant and imports, with the cause and the first fix for each.
order: 4
type: Reference
---

# Troubleshooting

Each entry gives the symptom or message, the usual cause, and the first fix. When a fix does not help, read the logs.

## First checks

- `nextpress status` lists each service and whether it is running.
- `/api/health` on your site answers once NextPress is ready.
- `nextpress logs app` shows the app's log. Use `postgres` or `caddy` for the others.
- `nextpress restart` restarts all services.

## Install

| Symptom or message | Cause | Fix |
|---|---|---|
| "NextPress installer currently supports Linux servers only." | Not a Linux server | Use a Linux server |
| "Docker Compose v2 is missing" | Docker is missing and `NEXTPRESS_SKIP_DOCKER_INSTALL=1` is set | Install Docker Engine with its Compose plugin, then run the installer again |
| "openssl is required to generate install secrets." | `openssl` is missing | Install it, then run the installer again |
| "Install directory is not writable" | The user cannot write to the install folder | Run with `sudo`, or choose a writable `--install-dir` |
| **Complete setup** stays greyed out | The password does not meet the rules | Use at least 8 characters with an uppercase letter, a lowercase letter and a number |

## Domains and HTTPS

| Symptom | Cause | Fix |
|---|---|---|
| The domain does not open | The A record does not point at the server, or ports 80 and 443 are closed | Fix the A record and open both ports |
| The browser warns about the certificate | Caddy has no certificate yet, because the domain did not point at the server | Check the A record, then reload after a few minutes |
| A visitor sees another site | The address matches no site, so the default site answers | Check the address on **Sites** |

## Upgrades

| Message | Cause | Fix |
|---|---|---|
| "Another NextPress update is already running on this server." | An upgrade is already running | Wait for it to finish |
| "Schema upgrade expects … but this install is on …" | The install is too old for this version | Upgrade to an in-between version first. See [Upgrade NextPress](/docs/getting-started/upgrade) |
| "Need at least 1024MB free at …" or "Need at least 2048MB free for Docker at …" | Not enough disk space | Free space, then run `nextpress upgrade` |
| "Database backup failed; refusing to continue." | The backup could not be written | Check disk space and that the database runs |
| "App health check failed after upgrade." | The new version did not start | Read `nextpress logs app` |
| The dashboard cannot start an update | The update helper is off, or the server has no systemd | Run `sudo nextpress update-helper on`, or upgrade from the command line |

For a failed dashboard update, `nextpress update-helper status` shows the last result and the path of its log. On the default install, `systemctl status nextpress-update.path` and `journalctl -u nextpress-update.service` show the helper itself.

## Pages and media

| Symptom | Cause | Fix |
|---|---|---|
| A page answers "Page not found" | It is a draft, private, in the trash, or has a password | Publish it, and clear **Password Protection** in **Page settings** |
| "Page changed elsewhere" when saving | Someone saved the page after you opened it | The latest copy loads. Make your change again |
| A broken picture on a page | The file was deleted from the media library | Choose another file in the block |
| An upload is refused | The file type is not allowed, or it is larger than 10 MB | See [Media](/docs/building-pages/media) |

## AI assistant

| Message | Fix |
|---|---|
| "The assistant isn't set up for this site yet." | An admin connects a service in **Settings**, on the **AI** tab |
| "The saved key can't be read any more. Enter it again." | Paste the key again. This happens when the server's secrets changed, such as after a move |
| "Keys can't be saved on this server yet." | The server has no secret of its own. The person who runs the server needs to finish its setup |
| "That address isn't reachable from the internet." | Use a public `https` address, or ask an owner or admin of the main site to save the local one |

More messages are in [Set up AI](/docs/ai/set-up-ai).

## Imports

| Symptom or message | Fix |
|---|---|
| The WordPress site is not found | Check the address, and that `/wp-json` on that site opens without a sign-in |
| "Maximum 50 posts per import batch" | Select 50 items or fewer |
| "Import rate limit exceeded. Try again shortly." | Wait a minute |
| "Output file already exists" on export | Add `--force`, or choose another `--out` |
| "This NextPress version predates export/import." | Run `nextpress upgrade` |

## Getting help

For a forgotten password, see [Passwords and reset](/docs/people/passwords-and-reset). Before you ask for help, collect the output of `nextpress status`, the last lines of `nextpress logs app`, and the exact message on the screen.

## Next steps

- [The nextpress command](/docs/self-hosting/nextpress-command).
- [Limits](/docs/self-hosting/limits).
- [Back up and move your data](/docs/self-hosting/backups-and-moving).
