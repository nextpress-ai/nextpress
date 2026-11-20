---
title: The nextpress command
description: Every nextpress command and option for installing, upgrading, checking, exporting, resetting and removing a NextPress server.
order: 1
type: Reference
---

# The nextpress command

The installer puts the `nextpress` command at `/usr/local/bin/nextpress`. Run `nextpress help` to see the commands on your server, and `nextpress --version` to see the command's version.

## Commands

| Command | What it does |
|---|---|
| `nextpress install` | Sets up and starts NextPress in the install folder |
| `nextpress upgrade` | Moves to the latest version. See [Upgrade NextPress](/docs/getting-started/upgrade) |
| `nextpress status` | Lists each service and whether it is running |
| `nextpress logs` | Follows the logs of all services. Press Ctrl+C to stop |
| `nextpress logs app` | Follows only the named services: `app`, `postgres`, `caddy` |
| `nextpress restart` | Restarts all services |
| `nextpress reload` | Restarts Caddy, the web server |
| `nextpress export` | Writes your data to a file. See [Back up and move your data](/docs/self-hosting/backups-and-moving) |
| `nextpress import <file>` | Loads an export file |
| `nextpress reset-password <email or username>` | Sets a new password. See [Passwords and reset](/docs/people/passwords-and-reset) |
| `nextpress update-helper on`, `off` or `status` | Turns updates from the dashboard on or off, or shows whether they are on and how the last one went |
| `nextpress reset` | Erases all data and uploaded media and starts fresh |
| `nextpress uninstall --yes` | Removes NextPress from the server |
| `nextpress help` | Shows the commands |
| `nextpress version`, `-v` or `--version` | Prints the command's version |

## Options for any command

| Option | What it does |
|---|---|
| `-d <path>`, `--install-dir <path>` | Uses another install folder. The default is `/opt/nextpress` |

```bash
nextpress --install-dir "$HOME/nextpress" status
```

## Options for install and upgrade

| Option | Command | What it does |
|---|---|---|
| `--version <tag>` or `-V <tag>` | install, upgrade | Uses one version, such as `beta-v1.5.0` |
| `--latest` | upgrade | Uses the latest version. This is the default |
| `--override` | upgrade | Erases the database after a backup when the versions are too far apart |
| `--yes` or `-y` | upgrade | Skips the override confirmation |

## Options for reset-password

| Option | What it does |
|---|---|
| `--password-stdin` | Reads the password from a pipe, for scripts |

## Settings the command reads

Set these in the environment before you run the command.

| Setting | What it does |
|---|---|
| `NEXTPRESS_INSTALL_DIR` | The install folder, when `--install-dir` is not given |
| `NEXTPRESS_COMPOSE_URL` | Where install and upgrade download the setup file from |
| `NEXTPRESS_PUBLIC_IP` | The public address shown at the end of the install, without asking |
| `NEXTPRESS_SKIP_DOCKER_INSTALL` | When `1`, the installer stops if Docker is missing instead of installing it |

## Reset

`nextpress reset` erases all data and uploaded media, then sets the database up again with the default templates and themes, like a new install. It saves a database backup in `backups/` first, and asks you to type `yes`. Add `--yes` to skip the question.

To keep your content across a reset:

```bash
nextpress export --out ~/nextpress-data.json
nextpress reset
nextpress import ~/nextpress-data.json
```

## Uninstall

`nextpress uninstall --yes` stops the services, removes the database, the uploaded files and the certificates, removes the NextPress images and the dashboard update service, and deletes the install folder. Without `--yes` it refuses to run.

Your content is gone afterwards unless you kept an export somewhere else.

## Commands that need sudo

`nextpress update-helper on` needs root and systemd. Run `off` with `sudo` too, so it can remove the background service. Other commands need a user who can use Docker and write to the install folder.

## Next steps

- [Back up and move your data](/docs/self-hosting/backups-and-moving).
- [Sites and domains](/docs/self-hosting/sites-and-domains).
- [Troubleshooting](/docs/self-hosting/troubleshooting).
