---
title: Install NextPress
description: Install NextPress on a Linux server with one command, or run it on your computer to try it, then finish setup in the browser.
order: 2
type: Guide
---

# Install NextPress

There are two ways to run NextPress:

- **On a server**, with Docker. Use this for a site other people visit.
- **On your computer**, from the source code, with a built-in database. Use this to try NextPress. It is not meant for visitors.

## Before you install on a server

- A Linux server. The installer stops on any other system.
- `curl` and `openssl` on the server.
- Root access, or a user who can use `sudo`.
- Inbound TCP ports 80 and 443 open in the server firewall. Caddy, the web server, listens on both.
- For HTTPS: a DNS A record for your domain that points at the server's IP address. Caddy can get a certificate only after the domain points at the server.

## Install on a server

1. Sign in to the server and run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/nextpress-ai/nextpress/main/install.sh | bash
   ```

2. If the installer asks **Will you access this NextPress instance from another machine?**, type `y` and enter the server's public IP address or hostname. The final message then shows the right address.
3. Wait for **Installation complete**.
4. Open the setup address it prints: `http://nextpress.localhost` on the server itself, or `http://` followed by the server's IP address from another computer.
5. Finish setup in the browser, described below.

The installer does this:

1. Checks for Docker Compose version 2. If it is missing, it installs Docker Engine with Docker's official install script.
2. Installs the `nextpress` command at `/usr/local/bin/nextpress` and checks that it runs.
3. Runs `nextpress install`, which downloads the setup file, writes a `.env` file with new secrets and a first Caddy configuration, downloads the images, starts the database, sets it up, adds the default templates and themes, and starts the app and Caddy.
4. Turns on updates from the dashboard when the server runs systemd and the installer runs as root.

Everything is stored in `/opt/nextpress` unless you choose another folder:

```bash
nextpress --install-dir "$HOME/nextpress" install
```

To install one version instead of the latest:

```bash
nextpress install --version beta-v1.5.0
```

To stop the installer from installing Docker for you, set `NEXTPRESS_SKIP_DOCKER_INSTALL=1`. It then stops with an error when Docker Compose version 2 is missing.

## Run on your computer

You need Git, Node.js 24 and pnpm.

```bash
git clone https://github.com/nextpress-ai/nextpress nextpress
cd nextpress
pnpm install
pnpm dev
```

Open `http://localhost:5000`. The built-in database is stored in the `data/pglite` folder of the project.

## Finish setup in the browser

The setup screen has the heading **Welcome**.

1. In **Site name**, type the name of your site.
2. In **Domain**, type your domain, such as `example.com`. On your own computer, tick **Use local** instead. The **Local address** field then fills in by itself.
3. In **Admin email**, type the email address you will sign in with.
4. In **Password**, type a password with at least 8 characters, one uppercase letter, one lowercase letter and one number.
5. In **Confirm password**, type the same password.
6. Press **Complete setup**.
7. On the **Sign in** screen, enter your email or username and your password, then press **Sign in**.

With a domain, the browser moves to that domain after a few seconds. If the domain does not open yet, its A record may not point at the server.

NextPress sends no password reset email. If you lose the password, reset it from the server. See [Passwords and reset](/docs/people/passwords-and-reset).

## If something goes wrong

- **"Docker Compose v2 is missing"**: install Docker Engine with its Compose plugin, or unset `NEXTPRESS_SKIP_DOCKER_INSTALL`, then run the installer again.
- **"openssl is required to generate install secrets."**: install `openssl`, then run the installer again.
- **You cannot tell whether NextPress is running**: run `nextpress status`, or open `/api/health` on your site.

More cases are in [Troubleshooting](/docs/self-hosting/troubleshooting).

## Next steps

- [Make your first page](/docs/getting-started/first-page).
- [Learn the nextpress command](/docs/self-hosting/nextpress-command).
- [Keep NextPress up to date](/docs/getting-started/upgrade).
